(() => {
  const STORAGE_KEY = "antigravity_3d_thought_space_v2";
  const LEGACY_KEY = "antigravity_3d_thought_space_v1";
  const THEME_KEY = "antigravity_thought_desk_theme_v1";
  const DAY_MS = 86400000;
  const MAX_ACTIVE_GAMES = 6;

  const CATEGORIES = {
    Idea:     { color: "#d47348", soft: "rgba(212,115,72,0.26)" },
    "To-Do":  { color: "#5c8ec4", soft: "rgba(92,142,196,0.26)" },
    Personal: { color: "#9c7ec7", soft: "rgba(156,126,199,0.26)" },
    Learning: { color: "#57a37e", soft: "rgba(87,163,126,0.26)" },
    Project:  { color: "#c98648", soft: "rgba(201,134,72,0.26)" },
    Journal:  { color: "#b57c3a", soft: "rgba(181,124,58,0.26)" },
  };

  const STOP_WORDS = new Set([
    "the","and","for","with","that","this","from","into","your","you",
    "are","was","have","has","not","but","can","use","make","one",
    "before","after","near","each","more","some","out","about","what",
  ]);

  function createSampleState() {
    const now = Date.now();
    return {
      spaces: ["Main Study", "Projects", "Personal"],
      activeSpace: "Main Study",
      notes: [
        {
          id: "n1",
          title: "Evening Study Reflection",
          body: "- [x] Set up a calmer study nook\n- [ ] Write a few lines before bed\nClick the Open Journal on the desk anytime to write.",
          category: "Journal",
          tags: ["journal", "daily"],
          mood: "☕",
          links: ["n2"],
          pinned: true,
          space: "Main Study",
          archived: false,
          createdAt: now - 1 * DAY_MS,
          updatedAt: now - 1 * DAY_MS,
        },
        {
          id: "n2",
          title: "Cozy Nook Ideas",
          body: "Keep the corkboard for active sparks and archive finished notes so it never feels cluttered.",
          category: "Idea",
          tags: ["study", "minimal"],
          links: ["n1", "n4"],
          pinned: false,
          space: "Main Study",
          archived: false,
          boardX: 18,
          boardY: 20,
          rot: -2,
          createdAt: now - 3 * DAY_MS,
          updatedAt: now - 2 * DAY_MS,
        },
        {
          id: "n3",
          title: "Weekend Reading List",
          body: "- [x] Pick one short sci-fi novel\n- [ ] Browse a woodworking book",
          category: "Personal",
          tags: ["books", "weekend"],
          links: ["n5"],
          pinned: false,
          space: "Main Study",
          archived: false,
          boardX: 182,
          boardY: 32,
          rot: 1.5,
          createdAt: now - 18 * DAY_MS,
          updatedAt: now - 18 * DAY_MS,
        },
        {
          id: "n4",
          title: "Desk & Cable Reset",
          body: "- [ ] Label USB-C cables\n- [ ] Clear old boxes from closet",
          category: "To-Do",
          tags: ["home", "organize"],
          links: ["n2"],
          pinned: false,
          space: "Main Study",
          archived: false,
          boardX: 330,
          boardY: 22,
          rot: -1,
          createdAt: now - 2 * DAY_MS,
          updatedAt: now - 2 * DAY_MS,
        },
        {
          id: "n5",
          title: "Warm Lighting Notes",
          body: "Soft amber lamps and warm wood tones reduce eye strain during evening journaling.",
          category: "Learning",
          tags: ["lighting", "cozy"],
          links: ["n3"],
          pinned: false,
          space: "Main Study",
          archived: false,
          createdAt: now - 22 * DAY_MS,
          updatedAt: now - 22 * DAY_MS,
        },
        {
          id: "n6",
          title: "E-Ink Weather Display",
          body: "- [x] Pick 2.9-inch e-ink screen\n- [ ] Test local weather script",
          category: "Project",
          tags: ["hardware", "diy"],
          links: [],
          pinned: true,
          space: "Main Study",
          archived: false,
          createdAt: now - 5 * DAY_MS,
          updatedAt: now - 1 * DAY_MS,
        },
      ],
      bin: [
        {
          id: "b1",
          title: "Check e-ink weather display battery life",
          body: "Wonder how long a small LiPo lasts if it refreshes every 30 minutes.",
          category: "Project",
          tags: ["hardware", "diy"],
          createdAt: now - 1 * DAY_MS,
        },
        {
          id: "b2",
          title: "Try making cold brew concentrate at home",
          body: "Coarse grind ratio 1:5 overnight in mason jar.",
          category: "Personal",
          tags: ["coffee"],
          createdAt: now - 2 * DAY_MS,
        },
      ],
      games: [
        { id: "g1", title: "Spirit City: Lofi Sessions", status: "playing", platform: "PC", vibe: "Cozy", hours: "18 hrs", note: "Cozy background companion while journaling", color: "#d49a42" },
        { id: "g2", title: "Stardew Valley", status: "playing", platform: "Switch", vibe: "Cozy", hours: "42 hrs", note: "Fall Year 2 — finishing greenhouse", color: "#57a37e" },
        { id: "g3", title: "Hades II", status: "backlog", platform: "Steam Deck", vibe: "Action", hours: "0 hrs", note: "Waiting until I wrap up one active game", color: "#9c7ec7" },
        { id: "g4", title: "Outer Wilds", status: "done", platform: "PC", vibe: "Story", hours: "22 hrs", note: "Unforgettable ending", color: "#5c8ec4" },
      ],
    };
  }

  // ── State ─────────────────────────────────────────────────────────────────
  const initial = loadState();
  let notes = initial.notes;
  let binNotes = initial.bin;
  let spaces = initial.spaces;
  let activeSpace = initial.activeSpace;
  let games = initial.games;
  let selectedId = null;
  let editingId = null;
  let activeJournalId = null;
  let activeGameTab = "playing";
  let linkSourceId = null;
  let activeCategory = "All";
  let searchQuery = "";
  let currentTheme = loadTheme();
  let recallDismissed = false;

  function activeNotes() {
    return notes.filter((n) => !n.archived && (n.space || "Main Study") === activeSpace);
  }

  // DOM refs
  const stageWorld = document.getElementById("stage-world");
  const fxCanvas = document.getElementById("fx-canvas");
  const fxCtx = fxCanvas.getContext("2d");
  const shelfSpacesEl = document.getElementById("shelf-spaces");
  const shelfGamesEl = document.getElementById("shelf-games");
  const shelfCardsEl = document.getElementById("shelf-cards");
  const corkboardEl = document.getElementById("corkboard-zone");
  const activeSpaceLabel = document.getElementById("active-space-label");

  const hotspotLamp = document.getElementById("hotspot-lamp");
  const hotspotJournal = document.getElementById("hotspot-journal");
  const hotspotMug = document.getElementById("hotspot-mug");
  const mugTimerBadge = document.getElementById("mug-timer-badge");
  const binToggleBtn = document.getElementById("btn-bin-toggle");
  const binCountPill = document.getElementById("bin-count-pill");

  const searchInput = document.getElementById("search-input");
  const categoryBar = document.getElementById("category-bar");
  const filterDot = document.getElementById("filter-dot");
  const statsBadge = document.getElementById("stats-badge");
  const linkBanner = document.getElementById("link-banner");
  const filterPopover = document.getElementById("filter-popover");
  const dataMenu = document.getElementById("data-menu");
  const helpPopover = document.getElementById("help-popover");
  const themeToggleBtn = document.getElementById("btn-theme-toggle");

  const outlinePanel = document.getElementById("outline-panel");
  const outlineContent = document.getElementById("outline-content");
  const outlineToggleBtn = document.getElementById("btn-outline-toggle");

  const gamesPanel = document.getElementById("games-panel");
  const gamesToggleBtn = document.getElementById("btn-games-toggle");
  const rotationMeter = document.getElementById("rotation-meter");
  const gameAddForm = document.getElementById("game-add-form");
  const gameTitleInput = document.getElementById("game-title-input");
  const gamesList = document.getElementById("games-list");

  const binPanel = document.getElementById("bin-panel");
  const binQuickForm = document.getElementById("bin-quick-form");
  const binQuickInput = document.getElementById("bin-quick-input");
  const binList = document.getElementById("bin-list");
  const binMatchSummary = document.getElementById("bin-match-summary");
  const autoSortBinBtn = document.getElementById("btn-auto-sort-bin");

  const recallCard = document.getElementById("recall-card");
  const recallMessage = document.getElementById("recall-message");
  const recallList = document.getElementById("recall-list");

  const journalModal = document.getElementById("journal-modal");
  const journalTodayDate = document.getElementById("journal-today-date");
  const journalEntriesList = document.getElementById("journal-entries-list");
  const journalForm = document.getElementById("journal-form");
  const journalTitle = document.getElementById("journal-title");
  const journalBody = document.getElementById("journal-body");
  const journalWordCount = document.getElementById("journal-word-count");

  const inspector = document.getElementById("inspector");
  const inspectorBadge = document.getElementById("inspector-badge");
  const inspectorDate = document.getElementById("inspector-date");
  const pinNoteBtn = document.getElementById("btn-pin-note");
  const noteForm = document.getElementById("note-form");
  const fieldTitle = document.getElementById("field-title");
  const fieldCategory = document.getElementById("field-category");
  const fieldBody = document.getElementById("field-body");
  const fieldTags = document.getElementById("field-tags");
  const linksList = document.getElementById("links-list");
  const suggestionsSection = document.getElementById("suggestions-section");
  const suggestionsList = document.getElementById("suggestions-list");

  const pluginsPanel = document.getElementById("plugins-panel");
  const pluginsToggleBtn = document.getElementById("btn-plugins-toggle");
  const pluginsListEl = document.getElementById("plugins-list");
  const rulesListEl = document.getElementById("rules-list");
  const ruleForm = document.getElementById("rule-form");
  const ruleKeywordInput = document.getElementById("rule-keyword");
  const ruleActionSelect = document.getElementById("rule-action");
  const ruleValueInput = document.getElementById("rule-value");
  const toastBanner = document.getElementById("toast-banner");

  // ── Persistence ───────────────────────────────────────────────────────────
  function loadState() {
    const sample = createSampleState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.notes) && parsed.notes.length > 0) {
          return {
            notes: parsed.notes,
            bin: Array.isArray(parsed.bin) ? parsed.bin : [],
            spaces: Array.isArray(parsed.spaces) && parsed.spaces.length ? parsed.spaces : sample.spaces,
            activeSpace: parsed.activeSpace || "Main Study",
            games: Array.isArray(parsed.games) ? parsed.games : sample.games,
          };
        }
      }
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const oldNotes = JSON.parse(legacy);
        if (Array.isArray(oldNotes) && oldNotes.length > 0) {
          return { ...sample, notes: oldNotes };
        }
      }
    } catch (_) {}
    return sample;
  }

  function saveState() {
    const snapshot = { notes, bin: binNotes, spaces, activeSpace, games };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (_) {}
    if (window.ThoughtDeskSync) {
      window.ThoughtDeskSync.scheduleAutoSync(() => ({ notes, bin: binNotes, spaces, activeSpace, games }), (statusText) => {
        const btn = document.getElementById("btn-sync-toggle");
        if (btn) btn.textContent = statusText === "Synced to Drive" ? "Synced" : "Sync";
      });
    }
    updateStats();
    renderShelves();
    renderCorkboard();
    renderOutline();
    renderBin();
    renderGamesPanel();
    renderRecall();
  }

  function loadTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "soft-day" || saved === "evening") return saved;
    } catch (_) {}
    return "evening";
  }

  function applyTheme(theme) {
    currentTheme = theme;
    if (theme === "soft-day") {
      document.documentElement.setAttribute("data-theme", "soft-day");
      themeToggleBtn.textContent = "Switch to Warm Evening";
    } else {
      document.documentElement.removeAttribute("data-theme");
      themeToggleBtn.textContent = "Switch to Soft Daylight";
    }
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
  }

  function updateStats() {
    const visible = activeNotes();
    const playingCount = games.filter((g) => g.status === "playing").length;
    statsBadge.textContent = `${visible.length} notes · ${playingCount}/${MAX_ACTIVE_GAMES} games`;
    binCountPill.textContent = String(binNotes.length);
    activeSpaceLabel.textContent = activeSpace;
  }

  function formatAge(ts) {
    if (!ts) return "";
    const days = Math.floor((Date.now() - ts) / DAY_MS);
    if (days <= 0) return "Today";
    if (days === 1) return "1d ago";
    if (days < 14) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 8) return `${weeks}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  let toastTimer = null;
  function showToast(msg) {
    if (!toastBanner || !msg) return;
    toastBanner.textContent = msg;
    toastBanner.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastBanner.classList.add("hidden"), 2800);
  }

  // ── 2.5D Stage Scaling & Gentle Parallax ──────────────────────────────────
  let targetPx = 0;
  let targetPy = 0;
  let curPx = 0;
  let curPy = 0;
  let stageScale = 1;

  function updateStageScale() {
    stageScale = Math.max(window.innerWidth / 1600, window.innerHeight / 900);
  }
  window.addEventListener("resize", updateStageScale);
  updateStageScale();

  window.addEventListener("pointermove", (e) => {
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    targetPx = -nx * 7;
    targetPy = -ny * 5;
  });

  // ── Atmospheric FX Loop (Fairy lights, Lamp glow, Mug steam, Dust motes, Yarn links) ──
  const FAIRY_BULBS = [
    [102, 43], [190, 62], [250, 56], [308, 39], [362, 16],
    [545, 22], [625, 45], [705, 62], [785, 72], [860, 74], [935, 65], [1015, 48], [1095, 24],
    [1288, 22], [1365, 42], [1448, 56], [1535, 63],
  ];

  const motes = Array.from({ length: 34 }, () => ({
    x: 120 + Math.random() * 1360,
    y: 120 + Math.random() * 680,
    r: 1.1 + Math.random() * 1.8,
    vx: (Math.random() - 0.5) * 0.18,
    vy: -0.08 - Math.random() * 0.16,
    phase: Math.random() * Math.PI * 2,
  }));

  const steamPuffs = Array.from({ length: 8 }, (_, i) => ({
    x: 1044 + (Math.random() - 0.5) * 12,
    y: 650 - i * 11,
    r: 6 + Math.random() * 6,
    alpha: 0.25,
    speed: 0.35 + Math.random() * 0.2,
  }));

  let time = 0;
  function renderFX() {
    time += 0.016;
    curPx += (targetPx - curPx) * 0.08;
    curPy += (targetPy - curPy) * 0.08;
    stageWorld.style.transform = `translate(-50%, -50%) translate3d(${curPx.toFixed(1)}px, ${curPy.toFixed(1)}px, 0) scale(${stageScale.toFixed(4)})`;

    fxCtx.clearRect(0, 0, 1600, 900);
    const isDay = currentTheme === "soft-day";

    // 1. Fairy light soft warm halos
    for (let i = 0; i < FAIRY_BULBS.length; i++) {
      const [bx, by] = FAIRY_BULBS[i];
      const pulse = 0.72 + Math.sin(time * 2.1 + i * 0.9) * 0.18;
      const rad = isDay ? 14 : 24;
      const grad = fxCtx.createRadialGradient(bx, by, 1, bx, by, rad);
      grad.addColorStop(0, `rgba(255, 224, 155, ${pulse * (isDay ? 0.32 : 0.55)})`);
      grad.addColorStop(1, "rgba(255, 200, 110, 0)");
      fxCtx.fillStyle = grad;
      fxCtx.beginPath();
      fxCtx.arc(bx, by, rad, 0, Math.PI * 2);
      fxCtx.fill();
    }

    // 2. Desk Lamp warm amber glow
    if (!isDay) {
      const lampPulse = 0.94 + Math.sin(time * 1.4) * 0.05;
      const lg = fxCtx.createRadialGradient(305, 515, 10, 360, 575, 240);
      lg.addColorStop(0, `rgba(255, 198, 112, ${0.22 * lampPulse})`);
      lg.addColorStop(0.5, `rgba(255, 168, 78, ${0.08 * lampPulse})`);
      lg.addColorStop(1, "rgba(255, 168, 78, 0)");
      fxCtx.fillStyle = lg;
      fxCtx.beginPath();
      fxCtx.arc(360, 575, 240, 0, Math.PI * 2);
      fxCtx.fill();
    }

    // 3. Steaming Mug wisps
    for (const s of steamPuffs) {
      s.y -= s.speed;
      s.x += Math.sin(time * 1.6 + s.y * 0.04) * 0.25;
      if (s.y < 555) {
        s.y = 650;
        s.x = 1044 + (Math.random() - 0.5) * 12;
      }
      const fade = Math.max(0, (s.y - 540) / 100) * 0.18;
      fxCtx.fillStyle = `rgba(248, 236, 220, ${fade})`;
      fxCtx.beginPath();
      fxCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      fxCtx.fill();
    }

    // 4. Floating Dust Motes
    for (const m of motes) {
      m.x += m.vx + Math.sin(time + m.phase) * 0.08;
      m.y += m.vy;
      if (m.y < 80) m.y = 820;
      if (m.x < 80) m.x = 1520;
      if (m.x > 1520) m.x = 80;
      const a = (0.16 + Math.sin(time * 1.5 + m.phase) * 0.08) * (isDay ? 0.7 : 1);
      fxCtx.fillStyle = `rgba(255, 225, 175, ${a.toFixed(3)})`;
      fxCtx.beginPath();
      fxCtx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      fxCtx.fill();
    }

    // 5. Corkboard Yarn Connection Lines
    const corkNotes = activeNotes().filter((n) => isCorkboardCategory(n.category));
    const byId = new Map(corkNotes.map((n) => [n.id, n]));
    const drawn = new Set();
    for (const n of corkNotes) {
      for (const tid of n.links || []) {
        const key = [n.id, tid].sort().join("::");
        if (drawn.has(key)) continue;
        drawn.add(key);
        const b = byId.get(tid);
        if (!b) continue;
        const ax = 872 + (n.boardX ?? 40) + 73;
        const ay = 140 + (n.boardY ?? 30) + 6;
        const bx = 872 + (b.boardX ?? 160) + 73;
        const by = 140 + (b.boardY ?? 50) + 6;
        const hi = selectedId === n.id || selectedId === tid;
        fxCtx.strokeStyle = hi ? "rgba(212, 115, 72, 0.9)" : "rgba(215, 180, 140, 0.45)";
        fxCtx.lineWidth = hi ? 2.4 : 1.5;
        fxCtx.beginPath();
        fxCtx.moveTo(ax, ay);
        fxCtx.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + 22, bx, by);
        fxCtx.stroke();
      }
    }

    requestAnimationFrame(renderFX);
  }

  // ── Similarity & Matching ─────────────────────────────────────────────────
  function extractTokens(note) {
    const words = `${note.title} ${note.body || ""} ${(note.tags || []).join(" ")}`
      .toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
    return { words: new Set(words), tags: new Set((note.tags || []).map((t) => t.toLowerCase())) };
  }

  function noteSimilarity(a, b) {
    if (a.id === b.id) return 0;
    const ta = extractTokens(a), tb = extractTokens(b);
    let score = 0;
    ta.tags.forEach((t) => { if (tb.tags.has(t)) score += 3; });
    ta.words.forEach((w) => { if (tb.words.has(w)) score += 1.1; });
    if ((a.links || []).includes(b.id)) score += 2.5;
    if (a.category && a.category === b.category) score += 0.6;
    return score;
  }

  function findBestDeskMatch(binnedNote) {
    let best = null, bestScore = 0;
    for (const n of activeNotes()) {
      const ta = extractTokens(binnedNote), tb = extractTokens(n);
      let overlap = 0;
      ta.tags.forEach((t) => { if (tb.tags.has(t)) overlap += 3; });
      ta.words.forEach((w) => { if (tb.words.has(w)) overlap += 1.2; });
      if (overlap > bestScore) { bestScore = overlap; best = n; }
    }
    return bestScore >= 2.2 ? { note: best, score: bestScore } : null;
  }

  function noteMatchesFilter(note) {
    if (activeCategory !== "All" && note.category !== activeCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase().replace(/^#/, "");
    const hay = [note.title, note.body, note.category, ...(note.tags || [])].join(" ").toLowerCase();
    return hay.includes(q);
  }

  function isCorkboardCategory(cat) {
    return cat === "Idea" || cat === "To-Do" || cat === "Personal";
  }

  // ── Render Shelves (Dynamic Scrollable Binders, Game Rotation, Space Notebooks) ──
  const shelfSectionSelect = document.getElementById("shelf-section-select");
  const binderSortSelect = document.getElementById("binder-sort-select");
  let binderSortMode = "used";
  let customBinders = JSON.parse(localStorage.getItem("antigravity_thought_desk_binders_v1") || "[]");
  const BINDER_COLORS_KEY = "antigravity_thought_desk_binder_colors_v1";
  let binderColors = JSON.parse(localStorage.getItem(BINDER_COLORS_KEY) || "{}");
  const BINDER_PALETTE = ["#d47348", "#5c8ec4", "#9c7ec7", "#57a37e", "#c98648", "#c85a6a", "#5ca3a3", "#8a9952"];
  function getBinderColor(name) {
    return binderColors[name] || (CATEGORIES[name] && CATEGORIES[name].color) || "#d49a42";
  }

  function getAllBinderNames() {
    const base = ["Learning", "Project", "Personal", "To-Do", "Idea", "Journal"];
    const extras = [...new Set([...customBinders, ...activeNotes().map((n) => n.category).filter(Boolean)])];
    for (const e of extras) { if (!base.includes(e)) base.push(e); }
    return base;
  }

  function renderShelves() {
    const spaceNotes = activeNotes();

    // Update Shelf Section Dropdown
    if (shelfSectionSelect) {
      shelfSectionSelect.innerHTML = "";
      for (const sp of spaces) {
        const opt = document.createElement("option");
        opt.value = sp;
        opt.textContent = `Main Shelf: ${sp}`;
        if (sp === activeSpace) opt.selected = true;
        shelfSectionSelect.appendChild(opt);
      }
      const addOpt = document.createElement("option");
      addOpt.value = "__new__";
      addOpt.textContent = "+ New Shelf Section…";
      shelfSectionSelect.appendChild(addOpt);
    }

    // 1. Top Shelf: Dynamic Scrollable Binders (with auto-sort)
    shelfSpacesEl.innerHTML = "";
    const binderStats = getAllBinderNames().map((name) => {
      const items = spaceNotes.filter((n) => n.category === name);
      const latest = items.reduce((mx, n) => Math.max(mx, n.updatedAt || n.createdAt || 0), 0);
      return { name, count: items.length, latest };
    });

    if (binderSortMode === "used") binderStats.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    else if (binderSortMode === "recent") binderStats.sort((a, b) => b.latest - a.latest || b.count - a.count);
    else binderStats.sort((a, b) => a.name.localeCompare(b.name));

    for (const b of binderStats) {
      const bColor = getBinderColor(b.name);
      const binder = document.createElement("button");
      binder.type = "button";
      binder.className = "shelf-binder";
      binder.style.setProperty("--cat-color", bColor);
      binder.innerHTML = `<span class="shelf-binder-count">${b.count}</span><span class="shelf-binder-label">${escapeHtml(b.name)}</span>`;
      binder.title = `Pull out ${b.name} binder (${b.count} note${b.count === 1 ? "" : "s"})`;
      binder.addEventListener("click", () => openShelfBinder(b.name));
      shelfSpacesEl.appendChild(binder);
    }

    // 2. Middle Shelf: Strictly 1-to-1 Dynamic Game Cases (0 games = 0 cases, N games = N cases)
    shelfGamesEl.innerHTML = "";
    const playing = games.filter((g) => g.status === "playing").slice(0, MAX_ACTIVE_GAMES);
    for (const g of playing) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "game-case";
      card.style.setProperty("--case-color", g.color || "#5c8ec4");
      card.innerHTML = `<span class="game-case-tag">${escapeHtml((g.platform || "PC").slice(0, 5))}</span><span class="game-case-title">${escapeHtml(g.title)}</span>`;
      card.title = `${g.title}${g.vibe ? ` · ${g.vibe}` : ""}${g.note ? ` — ${g.note}` : ""}`;
      card.addEventListener("click", () => openGamesPanel("playing"));
      shelfGamesEl.appendChild(card);
    }
    const manageGamesBtn = document.createElement("button");
    manageGamesBtn.type = "button";
    manageGamesBtn.className = "shelf-mini-action";
    manageGamesBtn.textContent = playing.length === 0 ? "+ Add Game" : `+ (${playing.length}/${MAX_ACTIVE_GAMES})`;
    manageGamesBtn.title = "Open Game Rotation & Backlog";
    manageGamesBtn.addEventListener("click", () => openGamesPanel("playing"));
    shelfGamesEl.appendChild(manageGamesBtn);

    // 3. Bottom Shelf: Painted Space Notebooks + Painted Index-Card Archive Box
    shelfCardsEl.innerHTML = "";
    for (const sp of spaces) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `shelf-book-spine ${sp === activeSpace ? "active" : ""}`;
      btn.innerHTML = `<span>${escapeHtml(sp)}</span>`;
      btn.title = `Switch to "${sp}" shelf`;
      btn.addEventListener("click", () => {
        activeSpace = sp;
        selectedId = null; editingId = null;
        closeRightDrawers();
        saveState();
        showToast(`Opened ${sp}`);
      });
      shelfCardsEl.appendChild(btn);
    }

    const indexBox = document.createElement("button");
    indexBox.type = "button";
    indexBox.className = "index-box-prop";
    const archCount = notes.filter((n) => n.archived).length;
    indexBox.innerHTML = `<span class="index-box-label">Archive (${archCount})</span>`;
    indexBox.title = "Open Archive & All Notes";
    indexBox.addEventListener("click", () => outlineToggleBtn.click());
    shelfCardsEl.appendChild(indexBox);

    // Keep Category dropdown synced with custom binders
    if (fieldCategory) {
      const prev = fieldCategory.value;
      fieldCategory.innerHTML = "";
      for (const bName of getAllBinderNames()) {
        const opt = document.createElement("option");
        opt.value = bName;
        opt.textContent = bName;
        fieldCategory.appendChild(opt);
      }
      if (prev) fieldCategory.value = prev;
    }
  }

  if (shelfSectionSelect) {
    shelfSectionSelect.addEventListener("change", () => {
      if (shelfSectionSelect.value === "__new__") {
        const name = prompt("Name your new Shelf Section (e.g. 'Work', 'D&D', '2027'):");
        if (name && name.trim()) {
          const clean = name.trim();
          if (!spaces.includes(clean)) spaces.push(clean);
          activeSpace = clean;
          saveState();
          showToast(`Created shelf "${clean}"`);
        } else {
          renderShelves();
        }
        return;
      }
      activeSpace = shelfSectionSelect.value;
      closeRightDrawers();
      saveState();
    });
  }
  if (binderSortSelect) {
    binderSortSelect.addEventListener("change", () => {
      binderSortMode = binderSortSelect.value;
      renderShelves();
    });
  }
  document.getElementById("btn-new-binder").addEventListener("click", () => {
    const name = prompt("Name your new Binder (e.g. 'D&D', 'Finances', 'Recipes'):");
    if (!name || !name.trim()) return;
    const clean = name.trim();
    if (!customBinders.includes(clean)) {
      customBinders.push(clean);
      localStorage.setItem("antigravity_thought_desk_binders_v1", JSON.stringify(customBinders));
    }
    renderShelves();
    openShelfBinder(clean);
    showToast(`Added "${clean}" binder to shelf`);
  });

  const shelfDrawer = document.getElementById("shelf-drawer");
  const shelfDrawerTitle = document.getElementById("shelf-drawer-title");
  const shelfDrawerList = document.getElementById("shelf-drawer-list");

  function openShelfBinder(category) {
    closeAllPopovers();
    closeRightDrawers();
    shelfDrawerTitle.textContent = `${category} Binder (${activeSpace})`;
    shelfDrawerList.innerHTML = "";
    const colorBar = document.createElement("li");
    colorBar.className = "binder-color-bar";
    colorBar.innerHTML = `<span class="binder-color-label">Color:</span>`;
    const activeColor = getBinderColor(category);
    for (const col of BINDER_PALETTE) {
      const sw = document.createElement("button");
      sw.type = "button";
      sw.className = `binder-swatch ${activeColor.toLowerCase() === col.toLowerCase() ? "active" : ""}`;
      sw.style.background = col;
      sw.title = `Set ${category} color`;
      sw.addEventListener("click", () => {
        binderColors[category] = col;
        localStorage.setItem(BINDER_COLORS_KEY, JSON.stringify(binderColors));
        renderShelves();
        openShelfBinder(category);
        showToast(`Updated ${category} binder color`);
      });
      colorBar.appendChild(sw);
    }
    shelfDrawerList.appendChild(colorBar);
    const list = activeNotes()
      .filter((n) => n.category === category)
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updatedAt || 0) - (a.updatedAt || 0));

    if (list.length === 0) {
      const empty = document.createElement("li");
      empty.className = "bin-item";
      empty.style.color = "var(--ink-muted)";
      empty.style.fontSize = "12px";
      empty.textContent = `No ${category} notes in ${activeSpace} yet. Use Quick Jot at the top-left to add one!`;
      shelfDrawerList.appendChild(empty);
    } else {
      for (const n of list) {
        const li = document.createElement("li");
        li.className = "bin-item";
        const tags = (n.tags || []).slice(0, 3).map((t) => `#${t}`).join(" ");
        li.innerHTML = `
          <div class="bin-item-head">
            <span class="bin-item-title">${n.pinned ? "★ " : ""}${escapeHtml(n.title)}</span>
            <span class="outline-age">${escapeHtml(formatAge(n.updatedAt || n.createdAt))}</span>
          </div>
          ${n.body ? `<div style="font-size:11.5px;color:var(--ink-soft)">${escapeHtml(n.body.slice(0, 90))}${n.body.length > 90 ? "…" : ""}</div>` : ""}
          ${tags ? `<div style="font-size:10.5px;color:var(--accent)">${escapeHtml(tags)}</div>` : ""}
          <div class="bin-item-actions">
            <button type="button" class="btn btn-primary btn-small js-sb-open">Open</button>
            <button type="button" class="btn btn-small js-sb-pin">${n.pinned ? "Unpin" : "Pin to Board"}</button>
            <button type="button" class="btn btn-small js-sb-arch">Archive</button>
          </div>
        `;
        li.querySelector(".js-sb-open").addEventListener("click", () => openEditor(n.id));
        li.querySelector(".js-sb-pin").addEventListener("click", () => { togglePin(n.id); openShelfBinder(category); });
        li.querySelector(".js-sb-arch").addEventListener("click", () => { archiveNote(n.id); openShelfBinder(category); });
        shelfDrawerList.appendChild(li);
      }
    }
    shelfDrawer.classList.remove("hidden");
  }
  document.getElementById("btn-close-shelf").addEventListener("click", () => shelfDrawer.classList.add("hidden"));

  // ── Render Corkboard Pinned Notes ─────────────────────────────────────────
  function findFreeCorkSpot() {
    const corkNotes = activeNotes().filter((n) => isCorkboardCategory(n.category));
    const slots = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        slots.push({ x: 16 + c * 158, y: 18 + r * 130 });
      }
    }
    for (const slot of slots) {
      const occupied = corkNotes.some((n, idx) => {
        const nx = n.boardX ?? (16 + (idx % 3) * 158);
        const ny = n.boardY ?? (18 + Math.floor(idx / 3) * 135);
        return Math.abs(nx - slot.x) < 135 && Math.abs(ny - slot.y) < 110;
      });
      if (!occupied) return slot;
    }
    const idx = corkNotes.length;
    return { x: 16 + (idx % 3) * 158, y: 18 + (Math.floor(idx / 3) % 3) * 130 };
  }

  function renderCorkboard() {
    corkboardEl.innerHTML = "";
    const corkNotes = activeNotes().filter((n) => isCorkboardCategory(n.category));
    corkNotes.forEach((note, idx) => {
      const catMeta = CATEGORIES[note.category] || CATEGORIES.Idea;
      const bx = note.boardX ?? (16 + (idx % 3) * 158);
      const by = note.boardY ?? (18 + Math.floor(idx / 3) * 135);
      const rot = note.rot ?? ((idx % 2 === 0 ? -1 : 1) * 1.4);

      const el = document.createElement("article");
      el.className = `cork-note ${selectedId === note.id ? "selected" : ""} ${noteMatchesFilter(note) ? "" : "dimmed"} ${linkSourceId && linkSourceId !== note.id ? "link-target" : ""}`;
      el.style.setProperty("--cat-color", catMeta.color);
      el.style.left = `${bx}px`;
      el.style.top = `${by}px`;
      el.style.transform = `rotate(${rot}deg)`;

      const snippet = String(note.body || "").replace(/-\s*\[[x ]\]\s*/gi, "• ").trim();
      el.innerHTML = `
        <div class="cork-note-cat">${note.pinned ? "★ " : ""}${escapeHtml(note.category)}</div>
        <h3 class="cork-note-title">${escapeHtml(note.title)}</h3>
        ${snippet ? `<p class="cork-note-snippet">${escapeHtml(snippet)}</p>` : ""}
      `;

      let dragging = false, moved = false, sx = 0, sy = 0, origX = bx, origY = by;
      el.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        dragging = true; moved = false;
        sx = e.clientX; sy = e.clientY;
        origX = note.boardX ?? bx; origY = note.boardY ?? by;
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const dx = (e.clientX - sx) / stageScale;
        const dy = (e.clientY - sy) / stageScale;
        if (!moved && Math.hypot(dx, dy) > 4) moved = true;
        if (!moved) return;
        note.boardX = Math.max(6, Math.min(455, origX + dx));
        note.boardY = Math.max(8, Math.min(275, origY + dy));
        el.style.left = `${note.boardX}px`;
        el.style.top = `${note.boardY}px`;

        const br = binToggleBtn.getBoundingClientRect();
        const overBin = e.clientX >= br.left && e.clientX <= br.right && e.clientY >= br.top && e.clientY <= br.bottom;
        binToggleBtn.classList.toggle("bin-drop-active", overBin);
      });
      el.addEventListener("pointerup", (e) => {
        if (!dragging) return;
        dragging = false;
        el.releasePointerCapture(e.pointerId);
        binToggleBtn.classList.remove("bin-drop-active");
        if (moved) {
          const br = binToggleBtn.getBoundingClientRect();
          if (e.clientX >= br.left && e.clientX <= br.right && e.clientY >= br.top && e.clientY <= br.bottom) {
            shelveNoteToBin(note.id);
            return;
          }
          saveState();
        } else {
          if (linkSourceId) {
            if (linkSourceId !== note.id) toggleLink(linkSourceId, note.id);
            exitLinkMode();
          } else {
            openEditor(note.id);
          }
        }
      });

      corkboardEl.appendChild(el);
    });
  }

  // ── 2-Page Open Journal Spread ────────────────────────────────────────────
  function openJournalSpread(entryId = null) {
    closeAllPopovers();
    closeRightDrawers();
    const now = new Date();
    journalTodayDate.textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

    const journals = notes.filter((n) => !n.archived && n.category === "Journal")
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));

    let current = entryId ? notes.find((n) => n.id === entryId) : journals[0];
    if (!current) {
      current = createJournalNoteObj();
      notes.unshift(current);
      saveState();
    }
    loadJournalPage(current);
    journalModal.classList.remove("hidden");
  }

  function createJournalNoteObj() {
    const now = Date.now();
    const dateStr = new Date(now).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return {
      id: "n_" + now.toString(36) + Math.random().toString(36).slice(2, 5),
      title: `${dateStr} — Evening Entry`,
      body: "",
      category: "Journal",
      tags: ["journal"],
      mood: "☕",
      links: [],
      pinned: false,
      space: activeSpace,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  function loadJournalPage(entry) {
    activeJournalId = entry.id;
    journalTitle.value = entry.title;
    journalBody.value = entry.body || "";
    updateJournalWordCount();
    document.querySelectorAll(".mood-btn").forEach((b) => b.classList.toggle("active", b.dataset.mood === (entry.mood || "☕")));

    journalEntriesList.innerHTML = "";
    const journals = notes.filter((n) => !n.archived && n.category === "Journal")
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
    for (const j of journals) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `journal-entry-btn ${j.id === activeJournalId ? "active" : ""}`;
      btn.innerHTML = `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${j.mood || "📓"} ${escapeHtml(j.title)}</span><span class="outline-age">${escapeHtml(formatAge(j.updatedAt || j.createdAt))}</span>`;
      btn.addEventListener("click", () => loadJournalPage(j));
      li.appendChild(btn);
      journalEntriesList.appendChild(li);
    }
  }

  function updateJournalWordCount() {
    const words = journalBody.value.trim().split(/\s+/).filter(Boolean).length;
    journalWordCount.textContent = `${words} word${words === 1 ? "" : "s"}`;
  }
  journalBody.addEventListener("input", updateJournalWordCount);

  document.querySelectorAll(".mood-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const entry = notes.find((n) => n.id === activeJournalId);
      if (entry) { entry.mood = btn.dataset.mood; saveState(); loadJournalPage(entry); }
    });
  });

  document.getElementById("btn-journal-new").addEventListener("click", () => {
    const entry = createJournalNoteObj();
    notes.unshift(entry);
    saveState();
    loadJournalPage(entry);
    journalBody.focus();
  });

  journalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const entry = notes.find((n) => n.id === activeJournalId);
    if (!entry) return;
    entry.title = journalTitle.value.trim() || "Journal Entry";
    entry.body = journalBody.value;
    entry.updatedAt = Date.now();
    if (window.ThoughtDeskPlugins) {
      const msgs = window.ThoughtDeskPlugins.runHook("onNoteSave", entry, { notes, noteSimilarity });
      if (msgs.length) showToast(msgs.join(" · "));
    }
    saveState();
    loadJournalPage(entry);
    showToast("Journal page saved");
  });

  document.getElementById("btn-close-journal").addEventListener("click", () => journalModal.classList.add("hidden"));
  const journalGdocBtn = document.getElementById("btn-journal-gdoc");
  if (journalGdocBtn) {
    journalGdocBtn.addEventListener("click", async () => {
      const S = window.ThoughtDeskSync;
      if (!S || !S.isSignedIn()) {
        showToast("Sign in via Sync & Backup first to export to Google Docs");
        return;
      }
      const journals = notes.filter((n) => !n.archived && n.category === "Journal");
      const text = journals.map((j) => `${j.title}\n${new Date(j.createdAt || Date.now()).toDateString()}\n\n${j.body || ""}\n`).join("\n---\n\n");
      try {
        const doc = await S.exportToGoogleDoc(`Thought Desk Journal — ${activeSpace}`, text || "No journal entries yet.");
        showToast("Exported to Google Doc in App Sync & Backups/exports/!");
        if (doc && doc.webViewLink) window.open(doc.webViewLink, "_blank");
      } catch (err) { showToast(err.message); }
    });
  }
  journalModal.addEventListener("click", (e) => { if (e.target === journalModal) journalModal.classList.add("hidden"); });

  // ── Game Rotation & Catalogue (Anti-Overwhelm) ────────────────────────────
  function openGamesPanel(tab = activeGameTab) {
    activeGameTab = tab;
    closeAllPopovers();
    closeRightDrawers();
    renderGamesPanel();
    gamesPanel.classList.remove("hidden");
  }

  function renderGamesPanel() {
    const playingCount = games.filter((g) => g.status === "playing").length;
    const isFull = playingCount >= MAX_ACTIVE_GAMES;
    rotationMeter.className = `rotation-meter ${isFull ? "full" : ""}`;
    rotationMeter.innerHTML = isFull
      ? `<strong>${playingCount} / ${MAX_ACTIVE_GAMES} Active</strong> — Rotation is full! Rest or finish one before adding another.`
      : `<strong>${playingCount} / ${MAX_ACTIVE_GAMES} in Active Rotation</strong> — Cozy &amp; manageable.`;

    document.querySelectorAll("[data-gtab]").forEach((b) => b.classList.toggle("active", b.dataset.gtab === activeGameTab));

    gamesList.innerHTML = "";
    const filtered = games.filter((g) => g.status === activeGameTab);
    if (filtered.length === 0) {
      const empty = document.createElement("li");
      empty.className = "bin-item";
      empty.style.color = "var(--ink-muted)";
      empty.style.fontSize = "12px";
      empty.textContent = activeGameTab === "playing" ? "No active games. Pick 1–2 from your backlog!" : "Nothing in this list yet.";
      gamesList.appendChild(empty);
      return;
    }

    for (const g of filtered) {
      const li = document.createElement("li");
      li.className = "bin-item";
      li.innerHTML = `
        <div class="bin-item-head">
          <span class="bin-item-title">${escapeHtml(g.title)}</span>
          <button type="button" class="btn-ghost-xs js-game-del" title="Remove">✕</button>
        </div>
        <div class="game-meta-pills">
          ${g.platform ? `<span class="game-pill">${escapeHtml(g.platform)}</span>` : ""}
          ${g.vibe ? `<span class="game-pill">${escapeHtml(g.vibe)}</span>` : ""}
          ${g.hours ? `<span class="game-pill">${escapeHtml(g.hours)}</span>` : ""}
        </div>
        ${g.note ? `<div style="font-size:11.5px;color:var(--ink-soft)">${escapeHtml(g.note)}</div>` : ""}
        <div class="bin-item-actions">
          ${g.status !== "playing" ? `<button type="button" class="btn btn-primary btn-small js-g-play">Move to Rotation</button>` : ""}
          ${g.status !== "backlog" ? `<button type="button" class="btn btn-small js-g-rest">Rest / Pause</button>` : ""}
          ${g.status !== "done" ? `<button type="button" class="btn btn-small js-g-done">✓ Finished</button>` : ""}
          <button type="button" class="btn btn-small js-g-note">Progress</button>
        </div>
      `;
      li.querySelector(".js-game-del").addEventListener("click", () => {
        games = games.filter((x) => x.id !== g.id);
        saveState();
      });
      const playBtn = li.querySelector(".js-g-play");
      if (playBtn) {
        playBtn.addEventListener("click", () => {
          if (games.filter((x) => x.status === "playing").length >= MAX_ACTIVE_GAMES) {
            showToast(`Rotation is at ${MAX_ACTIVE_GAMES}/${MAX_ACTIVE_GAMES} — rest a game first to stay stress-free`);
            return;
          }
          g.status = "playing";
          saveState();
          showToast(`Added "${g.title}" to Active Rotation`);
        });
      }
      const restBtn = li.querySelector(".js-g-rest");
      if (restBtn) restBtn.addEventListener("click", () => { g.status = "backlog"; saveState(); });
      const doneBtn = li.querySelector(".js-g-done");
      if (doneBtn) doneBtn.addEventListener("click", () => { g.status = "done"; saveState(); showToast(`Marked "${g.title}" finished!`); });
      li.querySelector(".js-g-note").addEventListener("click", () => {
        const nextNote = prompt(`Progress / note for ${g.title} (where you left off, etc.):`, g.note || "");
        if (nextNote !== null) g.note = nextNote.trim();
        const nextHours = prompt(`Playtime for ${g.title} (e.g. "12 hrs"):`, g.hours || "");
        if (nextHours !== null) g.hours = nextHours.trim();
        saveState();
      });
      gamesList.appendChild(li);
    }
  }

  document.querySelectorAll("[data-gtab]").forEach((b) => {
    b.addEventListener("click", () => { activeGameTab = b.dataset.gtab; renderGamesPanel(); });
  });

  const gamePickResult = document.getElementById("game-pick-result");
  document.getElementById("btn-pick-game").addEventListener("click", () => {
    const mood = document.getElementById("game-mood-pick").value;
    let pool = games.filter((g) => g.status === "playing" && (mood === "any" || g.vibe === mood));
    if (pool.length === 0) {
      pool = games.filter((g) => g.status !== "done" && (mood === "any" || g.vibe === mood));
    }
    if (pool.length === 0) pool = games.filter((g) => g.status !== "done");
    if (pool.length === 0) {
      gamePickResult.textContent = "Add a game below first!";
      gamePickResult.classList.remove("hidden");
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    gamePickResult.innerHTML = `Try <strong>${escapeHtml(pick.title)}</strong> (${escapeHtml(pick.platform || "Game")} · ${escapeHtml(pick.vibe || "Chill")})${pick.note ? ` — <em>${escapeHtml(pick.note)}</em>` : ""}`;
    gamePickResult.classList.remove("hidden");
  });

  gameAddForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = gameTitleInput.value.trim();
    if (!title) return;
    const platform = document.getElementById("game-platform-input").value;
    const vibe = document.getElementById("game-vibe-input").value;
    const playingCount = games.filter((g) => g.status === "playing").length;
    const status = playingCount < MAX_ACTIVE_GAMES ? "playing" : "backlog";
    const colors = ["#d49a42", "#57a37e", "#9c7ec7", "#5c8ec4", "#d47348"];
    games.unshift({
      id: "g_" + Date.now().toString(36),
      title,
      status,
      platform,
      vibe,
      hours: "0 hrs",
      note: "",
      color: colors[games.length % colors.length],
    });
    gameTitleInput.value = "";
    saveState();
    showToast(status === "playing" ? `Added "${title}" to Active Rotation` : `Added "${title}" to Resting Backlog (Rotation full)`);
  });

  // ── Drawers, Editor, Bin, Outline, Plugins ────────────────────────────────
  function closeRightDrawers() {
    inspector.classList.add("hidden");
    binPanel.classList.add("hidden");
    pluginsPanel.classList.add("hidden");
    gamesPanel.classList.add("hidden");
    if (typeof shelfDrawer !== "undefined" && shelfDrawer) shelfDrawer.classList.add("hidden");
    const calP = document.getElementById("calendar-panel");
    const mailP = document.getElementById("mail-panel");
    const syncP = document.getElementById("sync-panel");
    if (calP) calP.classList.add("hidden");
    if (mailP) mailP.classList.add("hidden");
    if (syncP) syncP.classList.add("hidden");
    pluginsToggleBtn.classList.remove("active-toggle");
    editingId = null;
  }

  function closeAllPopovers() {
    filterPopover.classList.add("hidden");
    dataMenu.classList.add("hidden");
    helpPopover.classList.add("hidden");
  }

  function openEditor(id) {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    if (note.category === "Journal") { openJournalSpread(id); return; }
    closeRightDrawers();
    selectedId = id;
    editingId = id;
    const catMeta = CATEGORIES[note.category] || CATEGORIES.Idea;
    inspectorBadge.textContent = note.category;
    inspectorBadge.style.background = catMeta.color;
    inspectorDate.textContent = `Written ${new Date(note.createdAt || Date.now()).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${formatAge(note.updatedAt || note.createdAt)}`;
    pinNoteBtn.textContent = note.pinned ? "Unpin" : "Pin";
    fieldTitle.value = note.title;
    fieldCategory.value = note.category;
    fieldBody.value = note.body || "";
    fieldTags.value = (note.tags || []).join(", ");
    renderLinksAndSuggestions(note);
    inspector.classList.remove("hidden");
    renderCorkboard();
    renderOutline();
  }

  function togglePin(id) {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    note.pinned = !note.pinned;
    note.updatedAt = Date.now();
    if (editingId === id) pinNoteBtn.textContent = note.pinned ? "Unpin" : "Pin";
    saveState();
  }

  function archiveNote(id) {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    note.archived = true;
    note.updatedAt = Date.now();
    if (selectedId === id) selectedId = null;
    closeRightDrawers();
    saveState();
    showToast(`Archived "${note.title}"`);
  }

  function restoreNoteFromArchive(id) {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    note.archived = false;
    note.space = activeSpace;
    note.updatedAt = Date.now();
    saveState();
    openEditor(id);
    showToast(`Restored "${note.title}"`);
  }

  function shelveNoteToBin(id) {
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) return;
    const [removed] = notes.splice(idx, 1);
    notes = notes.map((n) => ({ ...n, links: (n.links || []).filter((l) => l !== id) }));
    binNotes.unshift({
      id: "b_" + Date.now().toString(36),
      title: removed.title,
      body: removed.body || "",
      category: removed.category || "Idea",
      tags: removed.tags || [],
      createdAt: removed.createdAt || Date.now(),
    });
    if (selectedId === id) selectedId = null;
    closeRightDrawers();
    exitLinkMode();
    saveState();
  }

  function placeBinItemOnDesk(binId, attachToNoteId = null) {
    const idx = binNotes.findIndex((b) => b.id === binId);
    if (idx === -1) return;
    const [item] = binNotes.splice(idx, 1);
    const id = "n_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const anchor = attachToNoteId ? notes.find((n) => n.id === attachToNoteId) : null;
    const newNote = {
      id,
      title: item.title,
      body: item.body || "",
      category: anchor ? anchor.category : item.category || "Idea",
      tags: item.tags || [],
      links: anchor ? [anchor.id] : [],
      pinned: false,
      space: activeSpace,
      archived: false,
      boardX: findFreeCorkSpot().x,
      boardY: findFreeCorkSpot().y,
      rot: (Math.random() - 0.5) * 3,
      createdAt: item.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    if (anchor) { anchor.links = anchor.links || []; anchor.links.push(id); }
    notes.push(newNote);
    saveState();
    openEditor(id);
  }

  function renderLinksAndSuggestions(note) {
    linksList.innerHTML = "";
    const linkedIds = new Set(note.links || []);
    const linked = [...linkedIds].map((lid) => notes.find((n) => n.id === lid)).filter(Boolean);
    if (linked.length === 0) {
      const empty = document.createElement("li");
      empty.style.color = "var(--ink-muted)";
      empty.textContent = "No connected notes yet.";
      linksList.appendChild(empty);
    } else {
      for (const target of linked) {
        const li = document.createElement("li");
        const jump = document.createElement("button");
        jump.type = "button"; jump.className = "link-jump"; jump.textContent = target.title;
        jump.addEventListener("click", () => openEditor(target.id));
        const unlink = document.createElement("button");
        unlink.type = "button"; unlink.className = "btn btn-small"; unlink.textContent = "Remove";
        unlink.addEventListener("click", () => { toggleLink(note.id, target.id); renderLinksAndSuggestions(note); });
        li.appendChild(jump); li.appendChild(unlink); linksList.appendChild(li);
      }
    }
    suggestionsList.innerHTML = "";
    const suggestions = activeNotes()
      .filter((o) => o.id !== note.id && !linkedIds.has(o.id))
      .map((o) => ({ o, score: noteSimilarity(note, o) }))
      .filter((x) => x.score >= 1.5).sort((a, b) => b.score - a.score).slice(0, 3);
    if (suggestions.length === 0) { suggestionsSection.classList.add("hidden"); return; }
    suggestionsSection.classList.remove("hidden");
    for (const { o } of suggestions) {
      const li = document.createElement("li");
      const jump = document.createElement("button");
      jump.type = "button"; jump.className = "link-jump"; jump.textContent = o.title;
      jump.addEventListener("click", () => openEditor(o.id));
      const conn = document.createElement("button");
      conn.type = "button"; conn.className = "btn btn-small"; conn.textContent = "+ Connect";
      conn.addEventListener("click", () => { toggleLink(note.id, o.id); renderLinksAndSuggestions(note); });
      li.appendChild(jump); li.appendChild(conn); suggestionsList.appendChild(li);
    }
  }

  function toggleLink(idA, idB) {
    const a = notes.find((n) => n.id === idA), b = notes.find((n) => n.id === idB);
    if (!a || !b) return;
    a.links = a.links || []; b.links = b.links || [];
    if (a.links.includes(idB)) { a.links = a.links.filter((x) => x !== idB); b.links = b.links.filter((x) => x !== idA); }
    else { a.links.push(idB); b.links.push(idA); }
    saveState();
    if (editingId) { const cur = notes.find((n) => n.id === editingId); if (cur) renderLinksAndSuggestions(cur); }
  }

  function exitLinkMode() { linkSourceId = null; linkBanner.classList.add("hidden"); renderCorkboard(); }

  function renderCategoryBar() {
    categoryBar.innerHTML = "";
    const makePill = (label, color) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `filter-pill ${activeCategory === label ? "active" : ""}`;
      btn.innerHTML = color ? `<span class="swatch" style="background:${color}"></span>${label}` : label;
      btn.addEventListener("click", () => {
        activeCategory = label;
        filterDot.classList.toggle("hidden", label === "All");
        renderCategoryBar();
        renderShelves();
        renderCorkboard();
      });
      return btn;
    };
    categoryBar.appendChild(makePill("All", null));
    for (const [name, meta] of Object.entries(CATEGORIES)) categoryBar.appendChild(makePill(name, meta.color));
  }

  function renderOutline() {
    outlineContent.innerHTML = "";
    const spaceNotes = activeNotes();
    const pinned = spaceNotes.filter((n) => n.pinned);
    if (pinned.length > 0) {
      const sec = document.createElement("div");
      sec.innerHTML = `<div class="outline-group-title">★ Pinned</div>`;
      const ul = document.createElement("ul"); ul.className = "outline-items";
      pinned.forEach((n) => ul.appendChild(makeOutlineButton(n)));
      sec.appendChild(ul); outlineContent.appendChild(sec);
    }
    for (const [cat, meta] of Object.entries(CATEGORIES)) {
      const list = spaceNotes.filter((n) => n.category === cat);
      if (!list.length) continue;
      const sec = document.createElement("div");
      sec.innerHTML = `<div class="outline-group-title"><span class="swatch" style="background:${meta.color}"></span>${escapeHtml(cat)} (${list.length})</div>`;
      const ul = document.createElement("ul"); ul.className = "outline-items";
      list.forEach((n) => ul.appendChild(makeOutlineButton(n)));
      sec.appendChild(ul); outlineContent.appendChild(sec);
    }
    const archived = notes.filter((n) => n.archived);
    if (archived.length > 0) {
      const sec = document.createElement("div");
      sec.innerHTML = `<div class="outline-group-title">📦 Archived (${archived.length})</div>`;
      const ul = document.createElement("ul"); ul.className = "outline-items";
      for (const n of archived) {
        const li = document.createElement("li");
        li.className = "outline-archived-row";
        li.innerHTML = `<span class="outline-title">${escapeHtml(n.title)}</span><button type="button" class="btn btn-small js-restore-arch">Restore</button>`;
        li.querySelector(".js-restore-arch").addEventListener("click", () => restoreNoteFromArchive(n.id));
        ul.appendChild(li);
      }
      sec.appendChild(ul); outlineContent.appendChild(sec);
    }
  }

  function makeOutlineButton(n) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `outline-item ${selectedId === n.id ? "active" : ""}`;
    btn.innerHTML = `<span class="outline-title">${escapeHtml(n.title)}</span><span class="outline-age">${escapeHtml(formatAge(n.updatedAt || n.createdAt))}</span>`;
    btn.addEventListener("click", () => openEditor(n.id));
    li.appendChild(btn);
    return li;
  }

  function renderBin() {
    binList.innerHTML = "";
    let matchCount = 0;
    if (binNotes.length === 0) {
      binMatchSummary.textContent = "Basket is empty";
      autoSortBinBtn.disabled = true;
      const empty = document.createElement("li");
      empty.className = "bin-item"; empty.style.color = "var(--ink-muted)"; empty.style.fontSize = "12px";
      empty.textContent = "Toss quick thoughts here, or drag any corkboard note onto the 🧺 Basket on the desk.";
      binList.appendChild(empty);
      return;
    }
    for (const item of binNotes) {
      const match = findBestDeskMatch(item);
      if (match) matchCount++;
      const li = document.createElement("li");
      li.className = "bin-item";
      li.innerHTML = `
        <div class="bin-item-head">
          <span class="bin-item-title">${escapeHtml(item.title)}</span>
          <button type="button" class="btn-ghost-xs js-bin-del" title="Discard">✕</button>
        </div>
        ${item.body ? `<div style="font-size:11.5px;color:var(--ink-soft)">${escapeHtml(item.body.slice(0, 80))}${item.body.length > 80 ? "…" : ""}</div>` : ""}
        ${match ? `<div class="bin-match-hint">Fits with: <strong>${escapeHtml(match.note.title)}</strong></div>` : ""}
        <div class="bin-item-actions">
          ${match ? `<button type="button" class="btn btn-primary btn-small js-bin-attach">Auto-Attach</button>` : ""}
          <button type="button" class="btn btn-small js-bin-place">Pin to Board</button>
        </div>
      `;
      li.querySelector(".js-bin-del").addEventListener("click", () => { binNotes = binNotes.filter((b) => b.id !== item.id); saveState(); });
      if (match) li.querySelector(".js-bin-attach").addEventListener("click", () => placeBinItemOnDesk(item.id, match.note.id));
      li.querySelector(".js-bin-place").addEventListener("click", () => placeBinItemOnDesk(item.id, null));
      binList.appendChild(li);
    }
    binMatchSummary.textContent = matchCount > 0 ? `${matchCount} match${matchCount === 1 ? "" : "es"} · ${binNotes.length} total` : `${binNotes.length} ready to auto-sort`;
    autoSortBinBtn.disabled = binNotes.length === 0;
  }

  function renderRecall() {
    if (recallDismissed || !inspector.classList.contains("hidden") || !binPanel.classList.contains("hidden")) {
      recallCard.classList.add("hidden");
      return;
    }
    const cutoff = Date.now() - 14 * DAY_MS;
    const stale = activeNotes().filter((n) => (n.updatedAt || n.createdAt || 0) < cutoff)
      .sort((a, b) => (a.updatedAt || a.createdAt) - (b.updatedAt || b.createdAt)).slice(0, 2);
    if (stale.length === 0) { recallCard.classList.add("hidden"); return; }
    recallMessage.textContent = "A couple of older notes you haven't visited in a while:";
    recallList.innerHTML = "";
    for (const n of stale) {
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "recall-btn";
      btn.innerHTML = `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(n.title)}</span><span class="outline-age">${escapeHtml(formatAge(n.updatedAt || n.createdAt))}</span>`;
      btn.addEventListener("click", () => { n.updatedAt = Date.now(); saveState(); openEditor(n.id); });
      recallList.appendChild(btn);
    }
    recallCard.classList.remove("hidden");
  }

  // ── Direct Room Hotspot Bindings ──────────────────────────────────────────
  hotspotLamp.addEventListener("click", () => {
    const next = currentTheme === "evening" ? "soft-day" : "evening";
    applyTheme(next);
    showToast(next === "soft-day" ? "Switched to Soft Daylight" : "Switched to Warm Evening");
  });

  hotspotJournal.addEventListener("click", () => openJournalSpread());

  let focusSeconds = 25 * 60;
  let focusInterval = null;
  hotspotMug.addEventListener("click", (e) => {
    if (e.shiftKey) {
      clearInterval(focusInterval); focusInterval = null; focusSeconds = 25 * 60;
      mugTimerBadge.classList.remove("running");
      mugTimerBadge.textContent = "25:00";
      showToast("Focus timer reset");
      return;
    }
    if (focusInterval) {
      clearInterval(focusInterval); focusInterval = null;
      mugTimerBadge.classList.remove("running");
      showToast("Focus timer paused");
    } else {
      mugTimerBadge.classList.add("running");
      showToast("25m cozy focus session started");
      focusInterval = setInterval(() => {
        focusSeconds--;
        if (focusSeconds <= 0) {
          clearInterval(focusInterval); focusInterval = null; focusSeconds = 25 * 60;
          mugTimerBadge.classList.remove("running");
          showToast("Focus session complete! Take a breather.");
        }
        mugTimerBadge.textContent = `${String(Math.floor(focusSeconds / 60)).padStart(2, "0")}:${String(focusSeconds % 60).padStart(2, "0")}`;
      }, 1000);
    }
  });

  binToggleBtn.addEventListener("click", () => {
    closeAllPopovers();
    const opening = binPanel.classList.contains("hidden");
    closeRightDrawers();
    if (opening) { binPanel.classList.remove("hidden"); binQuickInput.focus(); }
    renderRecall();
  });
  document.getElementById("btn-close-bin").addEventListener("click", () => { binPanel.classList.add("hidden"); renderRecall(); });

  gamesToggleBtn.addEventListener("click", () => {
    const opening = gamesPanel.classList.contains("hidden");
    if (opening) openGamesPanel("playing");
    else gamesPanel.classList.add("hidden");
  });
  document.getElementById("btn-close-games").addEventListener("click", () => gamesPanel.classList.add("hidden"));

  document.getElementById("btn-new").addEventListener("click", () => {
    closeAllPopovers();
    const id = "n_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const now = Date.now();
    const note = {
      id,
      title: "New Note",
      body: "",
      category: activeCategory !== "All" ? activeCategory : "Idea",
      tags: [],
      links: [],
      pinned: false,
      space: activeSpace,
      archived: false,
      boardX: findFreeCorkSpot().x,
      boardY: findFreeCorkSpot().y,
      rot: (Math.random() - 0.5) * 3,
      createdAt: now,
      updatedAt: now,
    };
    notes.push(note);
    saveState();
    openEditor(id);
    fieldTitle.focus();
    fieldTitle.select();
  });

  outlineToggleBtn.addEventListener("click", () => {
    closeAllPopovers();
    const opening = outlinePanel.classList.contains("hidden");
    outlinePanel.classList.toggle("hidden", !opening);
    outlineToggleBtn.classList.toggle("active-toggle", opening);
  });
  document.getElementById("btn-close-outline").addEventListener("click", () => {
    outlinePanel.classList.add("hidden");
    outlineToggleBtn.classList.remove("active-toggle");
  });

  binQuickForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = binQuickInput.value.trim();
    if (!text) return;
    const item = { id: "b_" + Date.now().toString(36), title: text, body: "", category: "Idea", tags: [], createdAt: Date.now() };
    if (window.ThoughtDeskPlugins) {
      const msgs = window.ThoughtDeskPlugins.runHook("onBinAdd", item, { notes, noteSimilarity });
      if (msgs.length) showToast(msgs[0]);
    }
    binNotes.unshift(item);
    binQuickInput.value = "";
    saveState();
  });

  autoSortBinBtn.addEventListener("click", () => {
    const items = [...binNotes];
    let sortedCount = 0;
    for (const item of items) {
      const match = findBestDeskMatch(item);
      if (window.ThoughtDeskPlugins && typeof window.ThoughtDeskPlugins.classifyThought === "function") {
        const cls = window.ThoughtDeskPlugins.classifyThought(`${item.title || ""} ${item.body || ""}`);
        if (cls.confident) item.category = cls.category;
        item.tags = [...new Set([...(item.tags || []), ...cls.tags])];
      }
      placeBinItemOnDesk(item.id, match ? match.note.id : null);
      sortedCount++;
    }
    if (sortedCount > 0) showToast(`Auto-sorted ${sortedCount} thought${sortedCount === 1 ? "" : "s"} into your study`);
  });

  // Quick Auto-Sort Jot Bar (top-left)
  const quickJotForm = document.getElementById("quick-jot-form");
  const quickJotInput = document.getElementById("quick-jot-input");
  if (quickJotForm) {
    quickJotForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const raw = quickJotInput.value.trim();
      if (!raw) return;
      const now = Date.now();
      const id = "n_" + now.toString(36) + Math.random().toString(36).slice(2, 5);
      const cls = window.ThoughtDeskPlugins && window.ThoughtDeskPlugins.classifyThought
        ? window.ThoughtDeskPlugins.classifyThought(raw)
        : { category: "Idea", tags: [], confident: false };

      const note = {
        id,
        title: raw.length > 56 ? raw.slice(0, 55) + "…" : raw,
        body: raw.length > 56 ? raw : "",
        category: cls.category,
        tags: cls.tags,
        links: [],
        pinned: false,
        space: activeSpace,
        archived: false,
        boardX: findFreeCorkSpot().x,
        boardY: findFreeCorkSpot().y,
        rot: (Math.random() - 0.5) * 3,
        createdAt: now,
        updatedAt: now,
      };
      if (window.ThoughtDeskPlugins) {
        window.ThoughtDeskPlugins.runHook("onNoteSave", note, { notes, noteSimilarity });
      }
      notes.push(note);
      quickJotInput.value = "";
      saveState();
      showToast(`Sorted to ${note.category}${note.tags.length ? ` (${note.tags.map((t) => "#" + t).join(" ")})` : ""}`);
    });
  }

  document.getElementById("btn-recall-dismiss").addEventListener("click", () => { recallDismissed = true; recallCard.classList.add("hidden"); });
  themeToggleBtn.addEventListener("click", () => { applyTheme(currentTheme === "evening" ? "soft-day" : "evening"); closeAllPopovers(); });

  document.getElementById("btn-tidy").addEventListener("click", () => {
    const corkNotes = activeNotes().filter((n) => isCorkboardCategory(n.category));
    corkNotes.forEach((n, idx) => {
      n.boardX = 16 + (idx % 3) * 158;
      n.boardY = 18 + Math.floor(idx / 3) * 135;
      n.rot = (idx % 2 === 0 ? -1 : 1) * 1.4;
    });
    saveState();
    closeAllPopovers();
    showToast("Tidied corkboard notes");
  });

  document.getElementById("btn-close-inspector").addEventListener("click", () => { closeRightDrawers(); exitLinkMode(); renderRecall(); });
  pinNoteBtn.addEventListener("click", () => { if (editingId) togglePin(editingId); });
  document.getElementById("btn-archive-note").addEventListener("click", () => { if (editingId) archiveNote(editingId); });
  document.getElementById("btn-shelve-note").addEventListener("click", () => { if (editingId) shelveNoteToBin(editingId); });
  document.getElementById("btn-add-check").addEventListener("click", () => {
    const prefix = fieldBody.value && !fieldBody.value.endsWith("\n") ? "\n" : "";
    fieldBody.value += `${prefix}- [ ] `;
    fieldBody.focus();
  });
  document.getElementById("btn-start-link").addEventListener("click", () => { if (editingId) { linkSourceId = editingId; linkBanner.classList.remove("hidden"); renderCorkboard(); } });
  document.getElementById("btn-cancel-link").addEventListener("click", exitLinkMode);

  noteForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const note = notes.find((n) => n.id === editingId);
    if (!note) return;
    note.title = fieldTitle.value.trim() || "Untitled";
    note.category = fieldCategory.value;
    note.body = fieldBody.value;
    note.tags = fieldTags.value.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
    note.updatedAt = Date.now();
    if (window.ThoughtDeskPlugins) {
      if (typeof window.ThoughtDeskPlugins.learnFromNote === "function") {
        window.ThoughtDeskPlugins.learnFromNote(`${note.title} ${note.body}`, note.category);
      }
      const msgs = window.ThoughtDeskPlugins.runHook("onNoteSave", note, { notes, noteSimilarity });
      if (msgs.length) showToast(msgs.join(" · "));
    }
    saveState();
    openEditor(note.id);
  });

  document.getElementById("btn-delete-note").addEventListener("click", () => {
    if (!editingId) return;
    const delId = editingId;
    notes = notes.filter((n) => n.id !== delId).map((n) => ({ ...n, links: (n.links || []).filter((l) => l !== delId) }));
    if (selectedId === delId) selectedId = null;
    closeRightDrawers();
    exitLinkMode();
    saveState();
    renderRecall();
  });

  searchInput.addEventListener("input", () => { searchQuery = searchInput.value; renderShelves(); renderCorkboard(); });

  document.getElementById("btn-filter-toggle").addEventListener("click", (e) => { e.stopPropagation(); const o = filterPopover.classList.contains("hidden"); closeAllPopovers(); if (o) filterPopover.classList.remove("hidden"); });
  document.getElementById("btn-more-menu").addEventListener("click", (e) => { e.stopPropagation(); const o = dataMenu.classList.contains("hidden"); closeAllPopovers(); if (o) dataMenu.classList.remove("hidden"); });
  document.getElementById("btn-help").addEventListener("click", (e) => { e.stopPropagation(); const o = helpPopover.classList.contains("hidden"); closeAllPopovers(); if (o) helpPopover.classList.remove("hidden"); });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".popover-wrap")) closeAllPopovers();
    if (e.target.id === "stage-viewport" || e.target.id === "stage-world" || e.target === corkboardEl) {
      closeRightDrawers();
    }
  });

  document.getElementById("btn-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ notes, bin: binNotes, spaces, activeSpace, games }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "thought-desk-backup.json"; a.click(); URL.revokeObjectURL(url);
    closeAllPopovers();
  });

  document.getElementById("input-import").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result));
        if (Array.isArray(imported)) notes = imported;
        else if (imported && Array.isArray(imported.notes)) {
          notes = imported.notes;
          binNotes = Array.isArray(imported.bin) ? imported.bin : [];
          if (Array.isArray(imported.spaces)) spaces = imported.spaces;
          if (imported.activeSpace) activeSpace = imported.activeSpace;
          if (Array.isArray(imported.games)) games = imported.games;
        }
        selectedId = null; closeRightDrawers(); saveState();
      } catch (_) { alert("Could not read that JSON file."); }
    };
    reader.readAsText(file); e.target.value = ""; closeAllPopovers();
  });

  document.getElementById("btn-reset-demo").addEventListener("click", () => {
    const fresh = createSampleState();
    notes = fresh.notes; binNotes = fresh.bin; spaces = fresh.spaces; activeSpace = fresh.activeSpace; games = fresh.games;
    selectedId = null; recallDismissed = false; closeRightDrawers(); exitLinkMode(); saveState(); closeAllPopovers();
  });

  // ── Plugins Panel, Daily Review, Markdown Export, Custom Plugin Loader ────
  function renderPluginsPanel() {
    const P = window.ThoughtDeskPlugins;
    if (!P) return;
    pluginsListEl.innerHTML = "";
    for (const plugin of P.getAll()) {
      const enabled = P.isEnabled(plugin.id);
      const card = document.createElement("div");
      card.className = "plugin-card";
      card.innerHTML = `<div class="plugin-card-head"><span class="plugin-name">${escapeHtml(plugin.name)}</span><label class="toggle-switch"><input type="checkbox" ${enabled ? "checked" : ""} /></label></div><p class="plugin-desc">${escapeHtml(plugin.description)}</p>`;
      card.querySelector("input").addEventListener("change", (e) => {
        P.setEnabled(plugin.id, e.target.checked, { notes, noteSimilarity });
        showToast(`${plugin.name} ${e.target.checked ? "enabled" : "disabled"}`);
      });
      pluginsListEl.appendChild(card);
    }
    rulesListEl.innerHTML = "";
    for (const rule of P.getRules()) {
      const li = document.createElement("li"); li.className = "rule-item";
      const desc = rule.action === "pin" ? `If <strong>"${escapeHtml(rule.keyword)}"</strong> → Pin` : `If <strong>"${escapeHtml(rule.keyword)}"</strong> → ${escapeHtml(rule.action)}: <strong>${escapeHtml(rule.value)}</strong>`;
      li.innerHTML = `<span>${desc}</span><button type="button" class="btn-ghost-xs js-del-rule">✕</button>`;
      li.querySelector(".js-del-rule").addEventListener("click", () => { P.removeRule(rule.id); renderPluginsPanel(); });
      rulesListEl.appendChild(li);
    }
  }

  pluginsToggleBtn.addEventListener("click", () => {
    closeAllPopovers();
    const opening = pluginsPanel.classList.contains("hidden");
    closeRightDrawers();
    if (opening) { renderPluginsPanel(); pluginsPanel.classList.remove("hidden"); pluginsToggleBtn.classList.add("active-toggle"); }
  });
  document.getElementById("btn-close-plugins").addEventListener("click", () => { pluginsPanel.classList.add("hidden"); pluginsToggleBtn.classList.remove("active-toggle"); });

  ruleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const P = window.ThoughtDeskPlugins; if (!P) return;
    const kw = ruleKeywordInput.value.trim(); if (!kw) return;
    P.addRule({ keyword: kw, action: ruleActionSelect.value, value: ruleValueInput.value.trim() });
    ruleKeywordInput.value = ""; ruleValueInput.value = ""; renderPluginsPanel(); showToast(`Added rule for "${kw}"`);
  });

  document.getElementById("btn-run-auto-link").addEventListener("click", () => {
    const spaceNotes = activeNotes(); let added = 0;
    for (let i = 0; i < spaceNotes.length; i++) {
      for (let j = i + 1; j < spaceNotes.length; j++) {
        const a = spaceNotes[i], b = spaceNotes[j];
        a.links = a.links || []; b.links = b.links || [];
        if (!a.links.includes(b.id) && noteSimilarity(a, b) >= 2.8) { a.links.push(b.id); b.links.push(a.id); added++; }
      }
    }
    if (added > 0) saveState();
    showToast(added > 0 ? `Connected ${added} note pair${added === 1 ? "" : "s"}` : "No new strong matches to link");
  });

  document.getElementById("btn-run-auto-tag").addEventListener("click", () => {
    const P = window.ThoughtDeskPlugins; if (!P) return;
    let updated = 0;
    for (const n of activeNotes()) { if (P.applyCustomRules(n).length > 0) updated++; }
    if (updated > 0) saveState();
    showToast(updated > 0 ? `Updated ${updated} note${updated === 1 ? "" : "s"}` : "All notes already match rules");
  });

  const dailyReviewBox = document.getElementById("daily-review-box");
  document.getElementById("btn-daily-review").addEventListener("click", () => {
    const spaceNotes = activeNotes();
    const pinned = spaceNotes.filter((n) => n.pinned).length;
    const openChecks = spaceNotes.reduce((acc, n) => acc + (String(n.body || "").match(/\[ \]/g) || []).length, 0);
    const playing = games.filter((g) => g.status === "playing").length;
    dailyReviewBox.innerHTML = `<strong>☀️ Today's Review (${escapeHtml(activeSpace)})</strong><br/>• <strong>${pinned}</strong> pinned · <strong>${openChecks}</strong> open checklist items<br/>• <strong>${binNotes.length}</strong> in Basket · <strong>${playing}/${MAX_ACTIVE_GAMES}</strong> games in rotation`;
    dailyReviewBox.classList.toggle("hidden");
  });

  document.getElementById("btn-reset-recurring").addEventListener("click", () => {
    let resetCount = 0;
    for (const n of notes) {
      const tags = (n.tags || []).map((t) => t.toLowerCase());
      if (tags.includes("daily") || tags.includes("recurring")) {
        const nextBody = String(n.body || "").replace(/\[x\]/gi, "[ ]");
        if (nextBody !== n.body) { n.body = nextBody; n.updatedAt = Date.now(); resetCount++; }
      }
    }
    if (resetCount > 0) saveState();
    showToast(resetCount > 0 ? `Reset ${resetCount} #daily/#recurring checklist${resetCount === 1 ? "" : "s"}` : "No completed #daily/#recurring checklists found");
  });

  function exportNotesAsMarkdown() {
    const spaceNotes = activeNotes();
    const byId = new Map(notes.map((n) => [n.id, n]));
    const md = spaceNotes.map((n) => {
      const tags = (n.tags || []).map((t) => `#${t}`).join(" ");
      const links = (n.links || []).map((lid) => byId.get(lid)).filter(Boolean).map((t) => `[[${t.title}]]`).join(", ");
      return `# ${n.title}\n- **Category:** ${n.category}${n.pinned ? " · ★ Pinned" : ""}${tags ? `\n- **Tags:** ${tags}` : ""}${links ? `\n- **Links:** ${links}` : ""}\n\n${n.body || ""}\n`;
    }).join("\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${activeSpace.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-journal.md`; a.click(); URL.revokeObjectURL(url);
    closeAllPopovers(); showToast(`Exported ${spaceNotes.length} entries as Markdown`);
  }
  document.getElementById("btn-export-md").addEventListener("click", exportNotesAsMarkdown);
  document.getElementById("btn-plugin-export-md").addEventListener("click", exportNotesAsMarkdown);

  const customPluginForm = document.getElementById("custom-plugin-form");
  const customPluginName = document.getElementById("custom-plugin-name");
  const customPluginCode = document.getElementById("custom-plugin-code");
  const customPluginsList = document.getElementById("custom-plugins-list");

  function renderCustomPluginsList() {
    const P = window.ThoughtDeskPlugins; if (!P || !customPluginsList) return;
    customPluginsList.innerHTML = "";
    for (const cp of P.getCustomScripts()) {
      const li = document.createElement("li"); li.className = "rule-item";
      li.innerHTML = `<span>🧩 <strong>${escapeHtml(cp.name)}</strong></span><button type="button" class="btn-ghost-xs js-del-cp">Remove</button>`;
      li.querySelector(".js-del-cp").addEventListener("click", () => { P.removeCustomScript(cp.id); renderCustomPluginsList(); showToast(`Removed "${cp.name}"`); });
      customPluginsList.appendChild(li);
    }
  }

  document.getElementById("btn-load-example-plugin").addEventListener("click", () => {
    customPluginName.value = "Reading Time Tagger";
    customPluginCode.value = `ThoughtDeskPlugins.register({
  id: "reading-tagger",
  name: "Reading Time Tagger",
  description: "Adds #long-read if an entry has 30+ words.",
  onNoteSave(note) {
    const words = (note.body || "").trim().split(/\\s+/).filter(Boolean).length;
    if (words >= 30 && !(note.tags || []).includes("long-read")) {
      note.tags = [...(note.tags || []), "long-read"];
      return "Added #long-read";
    }
  }
});`;
  });

  customPluginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const P = window.ThoughtDeskPlugins; if (!P) return;
    const code = customPluginCode.value.trim(); if (!code) return;
    try {
      P.installCustomScript(customPluginName.value.trim() || "Custom Plugin", code);
      customPluginName.value = ""; customPluginCode.value = "";
      renderPluginsPanel(); renderCustomPluginsList(); showToast("Custom plugin installed!");
    } catch (err) { alert("Plugin error: " + err.message); }
  });

  // Keyboard & Steam Deck / Gamepad shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.target.matches("input,textarea,select")) { if (e.key === "Escape") e.target.blur(); return; }
    const k = e.key.toLowerCase();
    if (e.key === "Escape") {
      closeAllPopovers(); exitLinkMode();
      if (!journalModal.classList.contains("hidden")) { journalModal.classList.add("hidden"); return; }
      closeRightDrawers(); renderRecall();
    } else if (k === "j") { e.preventDefault(); openJournalSpread(); }
    else if (k === "n") { e.preventDefault(); document.getElementById("btn-new").click(); }
    else if (k === "g") { e.preventDefault(); gamesToggleBtn.click(); }
    else if (k === "b") { e.preventDefault(); binToggleBtn.click(); }
    else if (k === "o") { e.preventDefault(); outlineToggleBtn.click(); }
    else if (k === "p") { e.preventDefault(); pluginsToggleBtn.click(); }
    else if (k === "m") { e.preventDefault(); document.getElementById("hotspot-mail")?.click(); }
    else if (k === "r") { e.preventDefault(); document.getElementById("btn-calendar-toggle")?.click(); }
    else if (k === "t") { e.preventDefault(); document.getElementById("hotspot-lamp")?.click(); }
    else if (k === "f") { e.preventDefault(); document.getElementById("hotspot-mug")?.click(); }
    else if (e.key === "?") { e.preventDefault(); document.getElementById("btn-help")?.click(); }
    else if (e.key === "/") { e.preventDefault(); searchInput.focus(); }
  });

  // Lightweight Steam Deck / Gamepad navigation (starts only when a controller connects)
  (function initGamepadNav() {
    if (!navigator.getGamepads) return;
    let rafId = 0;
    let lastPress = {};
    const hotspots = () => ["hotspot-lamp", "hotspot-calendar", "hotspot-journal", "hotspot-mug", "hotspot-mail", "btn-bin-toggle"]
      .map((id) => document.getElementById(id)).filter(Boolean);
    function poll() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = pads && Array.from(pads).find(Boolean);
      if (!pad) { rafId = 0; return; }
      const pressed = (idx) => {
        const down = Boolean(pad.buttons[idx] && pad.buttons[idx].pressed);
        const was = Boolean(lastPress[idx]);
        lastPress[idx] = down;
        return down && !was;
      };
      const list = hotspots();
      if (pressed(14) || pressed(15)) {
        const cur = list.indexOf(document.activeElement);
        const dir = pressed(15) ? 1 : -1;
        const next = (cur === -1 ? 0 : (cur + dir + list.length) % list.length);
        list[next]?.focus();
      } else if (pressed(0) && document.activeElement && document.activeElement !== document.body) {
        document.activeElement.click();
      } else if (pressed(1)) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      } else if (pressed(2)) {
        openJournalSpread();
      } else if (pressed(3)) {
        document.getElementById("btn-help")?.click();
      }
      rafId = requestAnimationFrame(poll);
    }
    window.addEventListener("gamepadconnected", () => { if (!rafId) rafId = requestAnimationFrame(poll); });
    if (Array.from(navigator.getGamepads() || []).some(Boolean)) rafId = requestAnimationFrame(poll);
  })();

  function escapeHtml(str) {
    return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  // ── Desk Flip-Calendar (with Auto-Propagation & Auto-Cleanup) & Mail Tray ──
  const CAL_KEY = "antigravity_thought_desk_cal_v1";
  const CAL_PREF_KEY = "antigravity_thought_desk_cal_auto_v1";
  const MAIL_KEY = "antigravity_thought_desk_mail_v1";
  let calEvents = JSON.parse(localStorage.getItem(CAL_KEY) || "[]");
  let calAutoProp = localStorage.getItem(CAL_PREF_KEY) !== "false";
  let mailItems = JSON.parse(localStorage.getItem(MAIL_KEY) || "[]");

  const chkCalAutoProp = document.getElementById("chk-cal-autoprop");
  if (chkCalAutoProp) {
    chkCalAutoProp.checked = calAutoProp;
    chkCalAutoProp.addEventListener("change", () => {
      calAutoProp = chkCalAutoProp.checked;
      localStorage.setItem(CAL_PREF_KEY, String(calAutoProp));
      syncCalendarReminders();
    });
  }

  function syncCalendarReminders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    let changed = false;

    const validNoteIds = new Set();

    if (calAutoProp) {
      for (const ev of calEvents) {
        if (!ev.date) continue;
        const [y, m, d] = ev.date.split("-").map(Number);
        const evDate = new Date(y, (m || 1) - 1, d || 1);
        evDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.round((evDate.getTime() - todayMs) / DAY_MS);

        if (daysUntil >= 0 && daysUntil <= 3) {
          const nid = `calnote_${ev.id}`;
          validNoteIds.add(nid);
          const prefix = daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil}d`;
          const title = `📅 ${prefix}: ${ev.title}`;
          const existing = notes.find((n) => n.id === nid);
          if (!existing) {
            notes.unshift({
              id: nid,
              title,
              body: `Scheduled for ${ev.date}${ev.time ? ` at ${ev.time}` : ""}.\n(Auto-clears from board after date passes.)`,
              category: "To-Do",
              tags: ["calendar", "reminder"],
              links: [],
              pinned: true,
              isCalendarReminder: true,
              space: activeSpace,
              archived: false,
              boardX: findFreeCorkSpot().x,
              boardY: findFreeCorkSpot().y,
              rot: -1,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            changed = true;
          } else if (existing.title !== title) {
            existing.title = title;
            changed = true;
          }
        }
      }
    }

    // Auto-delete expired (or disabled) calendar reminder notes
    const beforeLen = notes.length;
    notes = notes.filter((n) => !n.isCalendarReminder || validNoteIds.has(n.id));
    if (notes.length !== beforeLen) changed = true;

    if (changed) saveState();
  }

  const calendarPanel = document.getElementById("calendar-panel");
  const calendarList = document.getElementById("calendar-list");
  const calDateInput = document.getElementById("cal-date-input");
  if (calDateInput) calDateInput.valueAsDate = new Date();

  function renderCalendarPanel() {
    if (!calendarList) return;
    calendarList.innerHTML = "";
    const sorted = [...calEvents].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    if (sorted.length === 0) {
      const empty = document.createElement("li");
      empty.className = "bin-item"; empty.style.color = "var(--ink-muted)"; empty.style.fontSize = "12px";
      empty.textContent = "No upcoming events yet. Add one above or ask me to check your Google Calendar!";
      calendarList.appendChild(empty);
      return;
    }
    for (const ev of sorted) {
      const li = document.createElement("li"); li.className = "bin-item";
      li.innerHTML = `<div class="bin-item-head"><span class="bin-item-title">📅 ${escapeHtml(ev.title)}</span><button type="button" class="btn-ghost-xs js-cal-del">✕</button></div><div style="font-size:11px;color:var(--ink-muted)">${escapeHtml(ev.date)}${ev.time ? ` · ${escapeHtml(ev.time)}` : ""}</div>`;
      li.querySelector(".js-cal-del").addEventListener("click", () => {
        calEvents = calEvents.filter((x) => x.id !== ev.id);
        localStorage.setItem(CAL_KEY, JSON.stringify(calEvents));
        syncCalendarReminders();
        renderCalendarPanel();
      });
      calendarList.appendChild(li);
    }
  }

  document.getElementById("btn-calendar-toggle").addEventListener("click", () => {
    closeAllPopovers();
    const opening = calendarPanel.classList.contains("hidden");
    closeRightDrawers();
    if (opening) {
      renderCalendarPanel();
      calendarPanel.classList.remove("hidden");
    }
  });
  document.getElementById("btn-close-calendar").addEventListener("click", () => calendarPanel.classList.add("hidden"));
  document.getElementById("calendar-add-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("cal-title-input").value.trim();
    const date = calDateInput.value;
    const time = document.getElementById("cal-time-input").value;
    if (!title || !date) return;
    calEvents.push({ id: "ev_" + Date.now().toString(36), title, date, time });
    localStorage.setItem(CAL_KEY, JSON.stringify(calEvents));
    document.getElementById("cal-title-input").value = "";
    syncCalendarReminders();
    renderCalendarPanel();
    showToast(`Added "${title}" to Calendar`);
  });

  const mailPanel = document.getElementById("mail-panel");
  const mailList = document.getElementById("mail-list");
  const mailCountPill = document.getElementById("mail-count-pill");

  function renderMailPanel() {
    if (mailCountPill) mailCountPill.textContent = `Mail ${mailItems.length}`;
    if (!mailList) return;
    mailList.innerHTML = "";
    if (mailItems.length === 0) {
      const empty = document.createElement("li");
      empty.className = "bin-item"; empty.style.color = "var(--ink-muted)"; empty.style.fontSize = "12px";
      empty.textContent = "Mail tray is clear! Add follow-ups here or ask me to summarize your Gmail inbox.";
      mailList.appendChild(empty);
      return;
    }
    for (const m of mailItems) {
      const li = document.createElement("li"); li.className = "bin-item";
      li.innerHTML = `<div class="bin-item-head"><span class="bin-item-title">✉️ ${escapeHtml(m.title)}</span><button type="button" class="btn-ghost-xs js-mail-del">Done</button></div>`;
      li.querySelector(".js-mail-del").addEventListener("click", () => {
        mailItems = mailItems.filter((x) => x.id !== m.id);
        localStorage.setItem(MAIL_KEY, JSON.stringify(mailItems));
        renderMailPanel();
      });
      mailList.appendChild(li);
    }
  }
  renderMailPanel();

  document.getElementById("hotspot-mail").addEventListener("click", () => {
    closeAllPopovers(); closeRightDrawers();
    renderMailPanel();
    mailPanel.classList.remove("hidden");
  });
  document.getElementById("btn-close-mail").addEventListener("click", () => mailPanel.classList.add("hidden"));
  const loadGmailBtn = document.getElementById("btn-load-gmail-digest");
  if (loadGmailBtn) {
    loadGmailBtn.addEventListener("click", async () => {
      try {
        const res = await fetch("digest.json?cb=" + Date.now());
        if (!res.ok) throw new Error("No digest.json found yet");
        const data = await res.json();
        if (Array.isArray(data.emails)) {
          for (const em of data.emails) {
            const gmId = em.id ? "gm_" + em.id : null;
            const snippet = em.snippet ? em.snippet.replace(/\s+/g, " ").trim().slice(0, 64) : "";
            const label = snippet
              ? `${em.subject} — ${snippet} (${em.from})`
              : `${em.subject} (${em.from})`;
            const exists = gmId
              ? mailItems.some((m) => m.id === gmId)
              : mailItems.some((m) => m.title === label);
            if (!exists) {
              mailItems.push({ id: gmId || "gm_" + Date.now().toString(36), title: label });
            }
          }
          localStorage.setItem(MAIL_KEY, JSON.stringify(mailItems));
          renderMailPanel();
          showToast(`Loaded ${data.emails.length} recent Gmail items`);
        }
      } catch (err) {
        showToast(err.message);
      }
    });
  }
  document.getElementById("mail-add-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = document.getElementById("mail-title-input");
    const title = inp.value.trim(); if (!title) return;
    mailItems.unshift({ id: "m_" + Date.now().toString(36), title });
    localStorage.setItem(MAIL_KEY, JSON.stringify(mailItems));
    inp.value = "";
    renderMailPanel();
    showToast("Added to Mail Tray");
  });

  // ── PWA Service Worker, Google Drive Sync Panel & Mobile Nav ──────────────
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  const syncPanel = document.getElementById("sync-panel");
  const syncStatusBox = document.getElementById("sync-status-box");
  const syncClientIdInput = document.getElementById("sync-client-id");
  const syncSnapshotsList = document.getElementById("sync-snapshots-list");

  async function renderSyncPanel() {
    const S = window.ThoughtDeskSync;
    if (!S) return;
    const cfg = S.getCfg();
    if (syncClientIdInput && !syncClientIdInput.value && cfg.clientId) syncClientIdInput.value = cfg.clientId;
    const lastStr = cfg.lastSyncAt ? new Date(cfg.lastSyncAt).toLocaleString() : "Never";
    syncStatusBox.innerHTML = S.isSignedIn()
      ? `<strong>Connected to Drive</strong> (${escapeHtml(cfg.emailHint)})<br/>Last synced: ${escapeHtml(lastStr)} · ${escapeHtml(cfg.lastDevice)}`
      : `<strong>Local Backup Active</strong> · Sign in for Drive sync<br/>Last saved: ${escapeHtml(lastStr)} · ${escapeHtml(cfg.lastDevice)}`;

    syncSnapshotsList.innerHTML = "";
    const localSnaps = S.loadLocalSnapshots();
    let driveSnaps = [];
    if (S.isSignedIn()) {
      try { driveSnaps = await S.listDriveSnapshots(); } catch (_) {}
    }

    for (const ds of driveSnaps) {
      const li = document.createElement("li"); li.className = "bin-item";
      li.innerHTML = `<div class="bin-item-head"><span class="bin-item-title">Drive: ${escapeHtml(ds.name)}</span></div><div class="bin-item-actions"><button type="button" class="btn btn-primary btn-small js-rest-drive">Restore</button></div>`;
      li.querySelector(".js-rest-drive").addEventListener("click", async () => {
        try {
          const data = await S.downloadDriveFile(ds.id);
          if (data && Array.isArray(data.notes)) {
            notes = data.notes; binNotes = data.bin || []; spaces = data.spaces || spaces; activeSpace = data.activeSpace || activeSpace; games = data.games || games;
            saveState(); showToast("Restored from Google Drive snapshot!");
          }
        } catch (err) { showToast(err.message); }
      });
      syncSnapshotsList.appendChild(li);
    }

    for (const ls of localSnaps.slice(0, 5)) {
      const li = document.createElement("li"); li.className = "bin-item";
      li.innerHTML = `<div class="bin-item-head"><span class="bin-item-title">${escapeHtml(ls.label)} (${ls.noteCount} notes)</span><span class="outline-age">${escapeHtml(new Date(ls.ts).toLocaleTimeString())}</span></div><div class="bin-item-actions"><button type="button" class="btn btn-small js-rest-local">Restore Local</button></div>`;
      li.querySelector(".js-rest-local").addEventListener("click", () => {
        const d = ls.data;
        if (d && Array.isArray(d.notes)) {
          notes = d.notes; binNotes = d.bin || []; spaces = d.spaces || spaces; activeSpace = d.activeSpace || activeSpace; games = d.games || games;
          saveState(); showToast("Restored local snapshot!");
        }
      });
      syncSnapshotsList.appendChild(li);
    }
  }

  document.getElementById("btn-sync-toggle").addEventListener("click", () => {
    closeAllPopovers();
    const opening = syncPanel.classList.contains("hidden");
    closeRightDrawers();
    if (opening) { renderSyncPanel(); syncPanel.classList.remove("hidden"); }
  });
  const menuSyncBtn = document.getElementById("btn-menu-sync");
  if (menuSyncBtn) {
    menuSyncBtn.addEventListener("click", () => {
      closeAllPopovers();
      closeRightDrawers();
      renderSyncPanel();
      syncPanel.classList.remove("hidden");
    });
  }
  document.getElementById("btn-close-sync").addEventListener("click", () => syncPanel.classList.add("hidden"));
  document.getElementById("btn-refresh-snaps").addEventListener("click", renderSyncPanel);

  document.getElementById("sync-config-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (window.ThoughtDeskSync) {
      window.ThoughtDeskSync.setClientId(syncClientIdInput.value);
      showToast("Saved Google OAuth Client ID");
    }
  });

  document.getElementById("btn-drive-signin").addEventListener("click", async () => {
    const S = window.ThoughtDeskSync; if (!S) return;
    try {
      await S.signIn();
      const pulled = await S.pullLiveFromDrive();
      if (pulled.found && pulled.data && Array.isArray(pulled.data.notes)) {
        const d = pulled.data;
        notes = d.notes;
        binNotes = Array.isArray(d.bin) ? d.bin : [];
        if (Array.isArray(d.spaces) && d.spaces.length) spaces = d.spaces;
        if (d.activeSpace) activeSpace = d.activeSpace;
        if (Array.isArray(d.games)) games = d.games;
        syncCalendarReminders();
        saveState();
        renderSyncPanel();
        showToast("Signed in & loaded latest study from Google Drive!");
      } else {
        await S.syncNow({ notes, bin: binNotes, spaces, activeSpace, games }, true);
        renderSyncPanel();
        showToast("Signed in & synced to App Sync & Backups/!");
      }
    } catch (err) {
      showToast(err.message);
    }
  });

  document.getElementById("btn-drive-sync-now").addEventListener("click", async () => {
    const S = window.ThoughtDeskSync; if (!S) return;
    try {
      const res = await S.syncNow({ notes, bin: binNotes, spaces, activeSpace, games }, true);
      renderSyncPanel();
      showToast(res.mode === "drive" ? "Snapshot saved to Google Drive!" : "Local snapshot saved!");
    } catch (err) {
      showToast(err.message);
    }
  });

  document.getElementById("input-drive-upload").addEventListener("change", async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const S = window.ThoughtDeskSync; if (!S) return;
    if (S.isIgnoredJunkFile(file.name)) {
      showToast(`Blocked OS metadata file: ${file.name}`);
      e.target.value = "";
      return;
    }
    if (!S.isSignedIn()) { showToast("Sign in to Google Drive first to upload files."); e.target.value = ""; return; }
    try {
      await S.uploadGeneralFile(file);
      showToast(`Uploaded "${file.name}" to App Sync & Backups/exports/`);
    } catch (err) { showToast(err.message); }
    e.target.value = "";
  });

  document.querySelectorAll(".mob-btn").forEach((b) => {
    b.addEventListener("click", () => {
      const tab = b.dataset.mob;
      if (tab === "journal") openJournalSpread();
      else if (tab === "binders") openShelfBinder("Learning");
      else if (tab === "bin") binToggleBtn.click();
      else if (tab === "games") openGamesPanel("playing");
      else if (tab === "sync") document.getElementById("btn-sync-toggle").click();
    });
  });

  // Boot
  syncCalendarReminders();
  applyTheme(currentTheme);
  renderCategoryBar();
  updateStats();
  renderShelves();
  renderCorkboard();
  renderOutline();
  renderBin();
  renderGamesPanel();
  renderRecall();
  renderCustomPluginsList();
  requestAnimationFrame(renderFX);
})();
