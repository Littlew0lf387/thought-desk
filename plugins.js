(() => {
  const PLUGIN_STATE_KEY = "antigravity_thought_desk_plugins_v1";
  const RULES_KEY = "antigravity_thought_desk_rules_v1";
  const CUSTOM_PLUGINS_KEY = "antigravity_thought_desk_custom_plugins_v1";
  const LEARNER_KEY = "antigravity_thought_desk_learner_v1";

  const registry = new Map();
  let enabledMap = loadEnabledMap();
  let customRules = loadCustomRules();
  let customScripts = loadCustomScripts();
  let learnerModel = loadLearnerModel();

  function loadLearnerModel() {
    try {
      const raw = localStorage.getItem(LEARNER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.counts === "object") return parsed;
      }
    } catch (_) {}
    return { counts: {}, totals: {}, samples: 0 };
  }

  function saveLearnerModel() {
    try { localStorage.setItem(LEARNER_KEY, JSON.stringify(learnerModel)); } catch (_) {}
  }

  function tokenizeForLearning(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3);
  }

  function learnFromNote(text, category) {
    if (!category) return;
    const words = [...new Set(tokenizeForLearning(text))];
    if (words.length === 0) return;
    learnerModel.counts[category] = learnerModel.counts[category] || {};
    for (const w of words) {
      learnerModel.counts[category][w] = (learnerModel.counts[category][w] || 0) + 1;
    }
    learnerModel.totals[category] = (learnerModel.totals[category] || 0) + 1;
    learnerModel.samples = (learnerModel.samples || 0) + 1;
    saveLearnerModel();
  }

  function getLearnedStats() {
    return {
      samples: learnerModel.samples || 0,
      categories: Object.keys(learnerModel.totals || {}).length,
    };
  }

  function resetLearnerModel() {
    learnerModel = { counts: {}, totals: {}, samples: 0 };
    saveLearnerModel();
  }

  function loadEnabledMap() {
    try {
      const raw = localStorage.getItem(PLUGIN_STATE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {
      "auto-tagger": true,
      "auto-linker": true,
      "bin-sweeper": true,
      "focus-timer": true,
      "daily-review": true,
      "markdown-export": true,
    };
  }

  function saveEnabledMap() {
    try { localStorage.setItem(PLUGIN_STATE_KEY, JSON.stringify(enabledMap)); } catch (_) {}
  }

  function loadCustomRules() {
    try {
      const raw = localStorage.getItem(RULES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [
      { id: "r1", keyword: "buy", action: "category", value: "To-Do", enabled: true },
      { id: "r2", keyword: "learn", action: "category", value: "Learning", enabled: true },
    ];
  }

  function saveCustomRules() {
    try { localStorage.setItem(RULES_KEY, JSON.stringify(customRules)); } catch (_) {}
  }

  function loadCustomScripts() {
    try {
      const raw = localStorage.getItem(CUSTOM_PLUGINS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  }

  function saveCustomScripts() {
    try { localStorage.setItem(CUSTOM_PLUGINS_KEY, JSON.stringify(customScripts)); } catch (_) {}
  }

  // ── Smart Intent & Topic Classifier (works even with ZERO existing notes) ──
  const CATEGORY_PATTERNS = [
    {
      category: "To-Do",
      patterns: [
        /\b(need to|have to|remember to|don'?t forget|todo|to-do|errand|deadline|due|appointment|schedule|renew|cancel|submit|reply)\b/i,
        /\b(buy|order|pick up|call|email|text|pay|fix|clean|wash|organize|return|book a|drop off)\b/i,
        /\b(today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|this week)\b/i,
        /\[\s\]/,
      ],
      weight: 2.2,
    },
    {
      category: "Learning",
      patterns: [
        /\b(learn|study|tutorial|course|lesson|read|book|article|research|understand|practice|notes on|how to|why does|guide|explain)\b/i,
        /\b(guitar|piano|blender|python|javascript|math|history|language|drawing|woodworking|photography)\b/i,
      ],
      weight: 2.0,
    },
    {
      category: "Project",
      patterns: [
        /\b(build|create|develop|design|prototype|implement|refactor|deploy|setup|configure|roadmap|milestone|feature|bug|app|website|script)\b/i,
        /\b(hardware|raspberry pi|arduino|e-ink|3d print|diy|server|database|api)\b/i,
      ],
      weight: 2.0,
    },
    {
      category: "Journal",
      patterns: [
        /\b(feeling|felt|mood|grateful|gratitude|dream|dreamt|reflect|reflection|journal|anxious|calm|happy|tired|stressed|overwhelmed|mindset)\b/i,
        /\b(i feel|i think|lately i|today was|this morning)\b/i,
      ],
      weight: 2.1,
    },
    {
      category: "Personal",
      patterns: [
        /\b(recipe|cook|dinner|lunch|meal|coffee|tea|grocery|groceries|workout|gym|sleep|health|dentist|doctor|vet|pet|gift|birthday|trip|vacation)\b/i,
        /\b(movie|show|watch|music|album|song|game|playing|backlog|weekend)\b/i,
      ],
      weight: 1.8,
    },
    {
      category: "Idea",
      patterns: [
        /\b(what if|idea|concept|brainstorm|maybe|imagine|could we|would be cool|spark|sketch)\b/i,
      ],
      weight: 1.7,
    },
  ];

  const AUTO_TOPIC_TAGS = [
    { tag: "errand", regex: /\b(buy|order|pick up|grocery|groceries|store|return|pay|renew)\b/i },
    { tag: "health", regex: /\b(doctor|dentist|gym|workout|sleep|water|hydrate|meds|therapy|walk)\b/i },
    { tag: "home", regex: /\b(clean|fix|desk|cable|closet|kitchen|laundry|room|plant)\b/i },
    { tag: "reading", regex: /\b(book|read|novel|article|chapter|pages)\b/i },
    { tag: "coding", regex: /\b(code|script|app|website|api|bug|feature|javascript|python|css)\b/i },
    { tag: "creative", regex: /\b(draw|art|music|guitar|write|story|worldbuilding|d&d|sketch)\b/i },
    { tag: "gaming", regex: /\b(game|gaming|steam|switch|ps5|xbox|play|quest|boss)\b/i },
    { tag: "food", regex: /\b(cook|recipe|coffee|tea|meal|dinner|lunch|bake)\b/i },
    { tag: "finance", regex: /\b(tax|taxes|budget|bill|bank|invoice|money)\b/i },
  ];

  function classifyThought(text) {
    const src = String(text || "");
    let bestCat = "Idea";
    let bestScore = 0;

    for (const group of CATEGORY_PATTERNS) {
      let score = 0;
      for (const rx of group.patterns) {
        if (rx.test(src)) score += group.weight;
      }
      if (score > bestScore) {
        bestScore = score;
        bestCat = group.category;
      }
    }

    // Blend in Personal Learned Vocabulary (evolves from user's own notes & corrections)
    const tokens = tokenizeForLearning(src);
    if (tokens.length > 0 && learnerModel.samples > 0) {
      for (const [cat, wordMap] of Object.entries(learnerModel.counts || {})) {
        const catTotal = Math.max(1, learnerModel.totals[cat] || 1);
        let learnedScore = 0;
        for (const w of tokens) {
          const hits = wordMap[w] || 0;
          if (hits > 0) {
            learnedScore += Math.min(2.5, (hits / catTotal) * 3.0);
          }
        }
        if (learnedScore > bestScore && learnedScore >= 1.2) {
          bestScore = learnedScore;
          bestCat = cat;
        }
      }
    }

    const tags = [];
    const hashMatches = src.match(/#([a-zA-Z0-9_-]{2,24})/g) || [];
    for (const m of hashMatches) {
      const clean = m.slice(1).toLowerCase();
      if (!tags.includes(clean)) tags.push(clean);
    }
    for (const bucket of AUTO_TOPIC_TAGS) {
      if (bucket.regex.test(src) && !tags.includes(bucket.tag)) {
        tags.push(bucket.tag);
      }
    }

    return {
      category: bestCat,
      confident: bestScore > 0,
      tags: tags.slice(0, 4),
    };
  }

  const api = {
    classifyThought,
    learnFromNote,
    getLearnedStats,
    resetLearnerModel,

    register(plugin) {
      if (!plugin || !plugin.id) return;
      registry.set(plugin.id, plugin);
      if (typeof enabledMap[plugin.id] !== "boolean") {
        enabledMap[plugin.id] = plugin.defaultEnabled !== false;
        saveEnabledMap();
      }
    },

    getAll() { return [...registry.values()]; },
    isEnabled(id) { return Boolean(enabledMap[id]); },

    setEnabled(id, enabled, ctx) {
      enabledMap[id] = Boolean(enabled);
      saveEnabledMap();
      const p = registry.get(id);
      if (p && typeof p.onToggle === "function") p.onToggle(Boolean(enabled), ctx);
    },

    runHook(hookName, payload, ctx) {
      const results = [];
      for (const plugin of registry.values()) {
        if (!enabledMap[plugin.id]) continue;
        if (typeof plugin[hookName] === "function") {
          const res = plugin[hookName](payload, ctx);
          if (res) results.push(res);
        }
      }
      return results;
    },

    getRules() { return customRules; },

    addRule(rule) {
      customRules.push({
        id: "r_" + Date.now().toString(36),
        keyword: String(rule.keyword || "").trim().toLowerCase(),
        action: rule.action || "tag",
        value: String(rule.value || "").trim(),
        enabled: true,
      });
      saveCustomRules();
    },

    removeRule(id) {
      customRules = customRules.filter((r) => r.id !== id);
      saveCustomRules();
    },

    applyCustomRules(note) {
      const hay = `${note.title || ""} ${note.body || ""}`.toLowerCase();
      const changes = [];
      for (const rule of customRules) {
        if (!rule.enabled || !rule.keyword || !hay.includes(rule.keyword)) continue;
        if (rule.action === "category" && rule.value && note.category !== rule.value) {
          note.category = rule.value;
          changes.push(`category → ${rule.value}`);
        } else if (rule.action === "tag" && rule.value) {
          const tag = rule.value.replace(/^#/, "").toLowerCase();
          note.tags = note.tags || [];
          if (!note.tags.includes(tag)) { note.tags.push(tag); changes.push(`#${tag}`); }
        } else if (rule.action === "pin" && !note.pinned) {
          note.pinned = true;
          changes.push("pinned");
        }
      }
      return changes;
    },

    getCustomScripts() { return customScripts; },

    installCustomScript(name, code) {
      const entry = {
        id: "cp_" + Date.now().toString(36),
        name: String(name || "Custom Plugin").trim(),
        code: String(code || ""),
      };
      const fn = new Function("ThoughtDeskPlugins", entry.code);
      fn(api);
      customScripts.push(entry);
      saveCustomScripts();
      return entry;
    },

    removeCustomScript(id) {
      customScripts = customScripts.filter((s) => s.id !== id);
      saveCustomScripts();
    },

    bootCustomScripts() {
      for (const entry of customScripts) {
        try { new Function("ThoughtDeskPlugins", entry.code)(api); } catch (_) {}
      }
    },
  };

  // ── Built-in Plugins ─────────────────────────────────────────────────────
  api.register({
    id: "auto-tagger",
    name: "Smart Auto-Tagger & Classifier",
    description: "Extracts #tags, adds topic tags (e.g. #errand, #coding), and applies your If/Then rules on save.",
    defaultEnabled: true,
    onNoteSave(note) {
      const text = `${note.title || ""} ${note.body || ""}`;
      const cls = classifyThought(text);
      note.tags = note.tags || [];
      let added = 0;
      for (const t of cls.tags) {
        if (!note.tags.includes(t)) { note.tags.push(t); added++; }
      }
      if (note.autoClassify && cls.confident) {
        note.category = cls.category;
        delete note.autoClassify;
      }
      const ruleChanges = api.applyCustomRules(note);
      if (added > 0 || ruleChanges.length > 0) {
        return `Auto-Tagger (${[added ? `+${added} tag` : "", ...ruleChanges].filter(Boolean).join(", ")})`;
      }
      return null;
    },
  });

  api.register({
    id: "auto-linker",
    name: "Smart Auto-Linker",
    description: "Automatically connects a saved note to existing notes with strong tag/topic overlap.",
    defaultEnabled: true,
    onNoteSave(note, ctx) {
      if (!ctx || !Array.isArray(ctx.notes)) return null;
      note.links = note.links || [];
      let linkedCount = 0;
      for (const other of ctx.notes) {
        if (other.id === note.id || other.archived || note.links.includes(other.id)) continue;
        if (ctx.noteSimilarity(note, other) >= 3.0) {
          note.links.push(other.id);
          other.links = other.links || [];
          if (!other.links.includes(note.id)) other.links.push(note.id);
          linkedCount++;
          if (linkedCount >= 2) break;
        }
      }
      return linkedCount > 0 ? `Auto-linked to ${linkedCount} related note${linkedCount === 1 ? "" : "s"}` : null;
    },
  });

  api.register({
    id: "bin-sweeper",
    name: "Thought Bin Smart Auto-Sorter",
    description: "Auto-categorizes and auto-tags any thought tossed in the basket, even with no prior matching notes.",
    defaultEnabled: true,
    onBinAdd(item) {
      const cls = classifyThought(`${item.title || ""} ${item.body || ""}`);
      if (cls.confident) item.category = cls.category;
      item.tags = [...new Set([...(item.tags || []), ...cls.tags])];
      api.applyCustomRules(item);
      return `Sorted as ${item.category}${item.tags.length ? ` (${item.tags.map((t) => "#" + t).join(" ")})` : ""}`;
    },
  });

  api.register({
    id: "daily-review",
    name: "Daily Review & Recurring Tasks",
    description: "Resets checklists on #daily / #recurring notes and summarizes today's focus.",
    defaultEnabled: true,
  });

  api.register({
    id: "markdown-export",
    name: "Markdown Exporter (.md)",
    description: "Exports your notes as clean Markdown with [[wikilinks]], #tags, and checklists.",
    defaultEnabled: true,
  });

  api.register({
    id: "focus-timer",
    name: "Study Focus Timer",
    description: "Click the mug on the desk to start/pause a 25-minute focus session.",
    defaultEnabled: true,
  });

  api.bootCustomScripts();
  window.ThoughtDeskPlugins = api;
})();
