(() => {
  const SYNC_CFG_KEY = "antigravity_thought_desk_sync_cfg_v1";
  const LOCAL_SNAP_KEY = "antigravity_thought_desk_local_snaps_v1";
  const ROOT_FOLDER_NAME = "App Sync & Backups";
  const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

  // Strictly ignored OS metadata files
  const JUNK_PATTERNS = [/^\.DS_Store$/i, /^\._/, /^Thumbs\.db$/i, /^desktop\.ini$/i];

  function isIgnoredJunkFile(name) {
    return JUNK_PATTERNS.some((rx) => rx.test(String(name || "").trim()));
  }

  let cfg = loadCfg();
  let accessToken = null;
  let tokenExpiresAt = 0;
  let tokenClient = null;
  let syncTimer = null;
  let folderIds = { root: null, live: null, snapshots: null, exports: null };
  let liveFileIds = { state: null, manifest: null };

  function loadCfg() {
    try {
      const raw = localStorage.getItem(SYNC_CFG_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {
      clientId: "",
      autoSync: true,
      lastSyncAt: null,
      lastSnapshotDate: null,
      lastDevice: detectDevice(),
      emailHint: "",
    };
  }

  function saveCfg() {
    try { localStorage.setItem(SYNC_CFG_KEY, JSON.stringify(cfg)); } catch (_) {}
  }

  function detectDevice() {
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|Android/i.test(ua)) return "Phone";
    if (/SteamOS|Linux/i.test(ua)) return "Steam Deck / Linux";
    if (/Mac/i.test(ua)) return "Mac";
    return "Windows PC";
  }

  // ── Local Rolling Snapshots (always works offline too) ────────────────────
  function loadLocalSnapshots() {
    try {
      const raw = localStorage.getItem(LOCAL_SNAP_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  }

  function saveLocalSnapshot(stateObj, label = "Auto") {
    const snaps = loadLocalSnapshots();
    snaps.unshift({
      id: "lsnap_" + Date.now().toString(36),
      ts: Date.now(),
      label,
      noteCount: (stateObj.notes || []).length,
      data: stateObj,
    });
    // Keep last 11 local snapshots (7 daily + 4 weekly style cap)
    const trimmed = snaps.slice(0, 11);
    try { localStorage.setItem(LOCAL_SNAP_KEY, JSON.stringify(trimmed)); } catch (_) {}
    return trimmed;
  }

  // ── Google Identity Services + Drive REST v3 ─────────────────────────────
  function loadGisScript() {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Could not load Google Sign-In script"));
      document.head.appendChild(s);
    });
  }

  function signIn() {
    if (!cfg.clientId) return Promise.reject(new Error("Enter your Google OAuth Client ID first."));
    const startTokenFlow = () =>
      new Promise((resolve, reject) => {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: cfg.clientId,
          scope: DRIVE_SCOPE,
          ...(cfg.emailHint ? { hint: cfg.emailHint } : {}),
          callback: (resp) => {
            if (resp.error) { reject(new Error(resp.error)); return; }
            accessToken = resp.access_token;
            tokenExpiresAt = Date.now() + (resp.expires_in || 3600) * 1000 - 60000;
            resolve(accessToken);
          },
          error_callback: (err) => {
            const msg = err?.type === "popup_failed_to_open"
              ? "Sign-in popup blocked. Allow popups for this site or open in your main browser."
              : (err?.message || err?.type || "Google Sign-In failed");
            reject(new Error(msg));
          },
        });
        tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
      });
    if (window.google?.accounts?.oauth2) return startTokenFlow();
    return loadGisScript().then(startTokenFlow);
  }

  function isSignedIn() {
    return Boolean(accessToken && Date.now() < tokenExpiresAt);
  }

  async function driveFetch(url, opts = {}) {
    if (!isSignedIn()) throw new Error("Not signed in to Google Drive");
    const headers = Object.assign({ Authorization: `Bearer ${accessToken}` }, opts.headers || {});
    const res = await fetch(url, { ...opts, headers });
    if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  }

  async function ensureFolder(name, parentId = null) {
    const qParts = [
      `name = '${name.replace(/'/g, "\\'")}'`,
      "mimeType = 'application/vnd.google-apps.folder'",
      "trashed = false",
    ];
    if (parentId) qParts.push(`'${parentId}' in parents`);
    else qParts.push("'root' in parents");
    const q = encodeURIComponent(qParts.join(" and "));
    const data = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`);
    if (data.files && data.files.length > 0) return data.files[0].id;

    const created = await driveFetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: parentId ? [parentId] : undefined,
      }),
    });
    return created.id;
  }

  async function ensureFolderTree() {
    if (!folderIds.root) folderIds.root = await ensureFolder(ROOT_FOLDER_NAME, null);
    if (!folderIds.live) folderIds.live = await ensureFolder("live", folderIds.root);
    if (!folderIds.snapshots) folderIds.snapshots = await ensureFolder("snapshots", folderIds.root);
    if (!folderIds.exports) folderIds.exports = await ensureFolder("exports", folderIds.root);
    return folderIds;
  }

  async function findFileInFolder(name, parentId) {
    const q = encodeURIComponent(`name = '${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed = false`);
    const data = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,size)`);
    return data.files && data.files.length > 0 ? data.files[0] : null;
  }

  async function upsertJsonFile(name, parentId, obj, cachedId = null) {
    if (isIgnoredJunkFile(name)) throw new Error(`Blocked OS metadata file: ${name}`);
    const content = JSON.stringify(obj, null, 2);
    let fileId = cachedId;
    if (!fileId) {
      const existing = await findFileInFolder(name, parentId);
      if (existing) fileId = existing.id;
    }

    if (fileId) {
      // In-place update preserves File ID
      const updated = await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: content,
      });
      return updated.id;
    }

    const meta = { name, parents: [parentId], mimeType: "application/json" };
    const boundary = "-------td_boundary_" + Date.now();
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
    const created = await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    });
    return created.id;
  }

  async function uploadGeneralFile(file) {
    if (!file || isIgnoredJunkFile(file.name)) {
      throw new Error(`Skipped OS metadata file: ${file?.name || ""}`);
    }
    await ensureFolderTree();
    const meta = { name: file.name, parents: [folderIds.exports] };
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json" }));
    form.append("file", file);
    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    return res.json();
  }

  async function pruneSnapshots() {
    const q = encodeURIComponent(`'${folderIds.snapshots}' in parents and trashed = false`);
    const data = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime desc&fields=files(id,name,createdTime)`);
    const files = data.files || [];
    // Retain 7 daily + 4 weekly = up to 11 snapshots
    const toDelete = files.slice(11);
    for (const f of toDelete) {
      await driveFetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, { method: "DELETE" });
    }
    return files.slice(0, 11);
  }

  async function syncNow(stateObj, createSnapshot = false) {
    saveLocalSnapshot(stateObj, createSnapshot ? "Manual Snapshot" : "Live Auto-Save");
    if (!isSignedIn()) {
      cfg.lastSyncAt = Date.now();
      cfg.lastDevice = detectDevice();
      saveCfg();
      return { mode: "local", ts: cfg.lastSyncAt };
    }

    await ensureFolderTree();
    liveFileIds.state = await upsertJsonFile("app-state.json", folderIds.live, stateObj, liveFileIds.state);
    liveFileIds.manifest = await upsertJsonFile(
      "sync-manifest.json",
      folderIds.live,
      { lastSyncAt: new Date().toISOString(), device: detectDevice(), noteCount: (stateObj.notes || []).length },
      liveFileIds.manifest
    );

    const todayStr = new Date().toISOString().slice(0, 10);
    if (createSnapshot || cfg.lastSnapshotDate !== todayStr) {
      const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
      await upsertJsonFile(`${stamp}_snapshot.json`, folderIds.snapshots, stateObj);
      cfg.lastSnapshotDate = todayStr;
      await pruneSnapshots();
    }

    cfg.lastSyncAt = Date.now();
    cfg.lastDevice = detectDevice();
    saveCfg();
    return { mode: "drive", ts: cfg.lastSyncAt };
  }

  async function listDriveSnapshots() {
    if (!isSignedIn()) return [];
    await ensureFolderTree();
    const q = encodeURIComponent(`'${folderIds.snapshots}' in parents and trashed = false`);
    const data = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime desc&fields=files(id,name,createdTime,size)`);
    return data.files || [];
  }

  async function downloadDriveFile(fileId) {
    if (!isSignedIn()) throw new Error("Not signed in");
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    return res.json();
  }

  async function exportToGoogleDoc(title, bodyText) {
    if (!isSignedIn()) throw new Error("Sign in to Google Drive first.");
    await ensureFolderTree();
    const meta = {
      name: title || "Thought Desk Journal Export",
      mimeType: "application/vnd.google-apps.document",
      parents: [folderIds.exports],
    };
    const boundary = "-------td_gdoc_" + Date.now();
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
      `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${bodyText}\r\n--${boundary}--`;
    const created = await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    });
    return created;
  }

  async function pullLiveFromDrive() {
    if (!isSignedIn()) throw new Error("Not signed in");
    await ensureFolderTree();
    const existing = await findFileInFolder("app-state.json", folderIds.live);
    if (!existing) return { found: false, data: null };
    liveFileIds.state = existing.id;
    const data = await downloadDriveFile(existing.id);
    cfg.lastSyncAt = Date.now();
    cfg.lastDevice = detectDevice();
    saveCfg();
    return { found: true, data };
  }

  function scheduleAutoSync(getStateFn, onStatus) {
    if (!cfg.autoSync) return;
    clearTimeout(syncTimer);
    if (onStatus) onStatus("Saving…");
    syncTimer = setTimeout(async () => {
      try {
        const res = await syncNow(getStateFn(), false);
        if (onStatus) onStatus(res.mode === "drive" ? "Synced to Drive" : "Saved locally");
      } catch (_) {
        if (onStatus) onStatus("Local (Offline)");
      }
    }, 3500);
  }

  // Preload Google Identity Services on http/https so mobile browsers keep Sign-In inside the synchronous tap gesture
  if (typeof document !== "undefined" && (location.protocol === "https:" || location.protocol === "http:")) {
    loadGisScript().catch(() => {});
  }

  window.ThoughtDeskSync = {
    getCfg: () => ({ ...cfg }),
    setClientId: (id) => { cfg.clientId = String(id || "").trim(); saveCfg(); },
    setAutoSync: (val) => { cfg.autoSync = Boolean(val); saveCfg(); },
    isSignedIn,
    signIn,
    syncNow,
    pullLiveFromDrive,
    exportToGoogleDoc,
    scheduleAutoSync,
    loadLocalSnapshots,
    listDriveSnapshots,
    downloadDriveFile,
    uploadGeneralFile,
    isIgnoredJunkFile,
    detectDevice,
  };
})();
