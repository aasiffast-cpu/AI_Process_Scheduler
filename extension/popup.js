/**
 * AI Process Scheduler - Chrome Extension Frontend Controller
 * Direct Real-Time Google Chrome Integration & OS CPU Scheduler
 * Red & Green High-Contrast Cyberpunk & Live Candlestick Theme
 * Author: Muhammad Asif
 */

// Dynamic API Base URL (Supports Mobile Web, Localhost & Vercel Cloud Deployment!)
function getApiBase() {
  const custom = localStorage.getItem("ai_scheduler_api_base");
  if (custom && custom.trim()) {
    let clean = custom.trim();
    if (clean.endsWith("/")) clean = clean.slice(0, -1);
    if (!clean.endsWith("/api")) clean += "/api";
    return clean;
  }
  // When running directly in Mobile Chrome or Web Dashboard
  if (window.location && window.location.origin && window.location.origin.startsWith("http") && !window.location.origin.includes("chrome-extension")) {
    return `${window.location.origin}/api`;
  }
  return "https://project-63jm6.vercel.app/api";
}

function setApiBase(url) {
  if (!url || !url.trim()) {
    localStorage.removeItem("ai_scheduler_api_base");
  } else {
    let clean = url.trim();
    if (clean.endsWith("/")) clean = clean.slice(0, -1);
    if (!clean.endsWith("/api")) clean += "/api";
    localStorage.setItem("ai_scheduler_api_base", clean);
  }
}

// Initial Tasks (Populated with Realistic Chrome Workload immediately in Red & Green style!)
const DEFAULT_CHROME_TASKS = [
  { name: "Chrome Core (PID 15544)", arrival: 0, burst: 5, priority: 1, memory_mb: 173.9, cpu_percent: 0.7, process_type: "Browser Core" },
  { name: "Chrome GPU (PID 16728)", arrival: 0, burst: 3, priority: 1, memory_mb: 48.8, cpu_percent: 4.2, process_type: "GPU Hardware" },
  { name: "Tab: YouTube 4K Music Video", arrival: 1, burst: 12, priority: 1, memory_mb: 231.0, cpu_percent: 3.5, is_audible: true, is_active: true, process_type: "Tab Renderer" },
  { name: "Tab: GitHub Repository", arrival: 2, burst: 6, priority: 2, memory_mb: 165.3, cpu_percent: 0.8, process_type: "Tab Renderer" },
  { name: "Chrome Network Service (PID 16740)", arrival: 2, burst: 2, priority: 2, memory_mb: 55.9, cpu_percent: 0.3, process_type: "Network Service" },
  { name: "Tab: ChatGPT / AI Workspace", arrival: 3, burst: 7, priority: 2, memory_mb: 97.6, cpu_percent: 1.1, process_type: "Tab Renderer" }
];

// Application State
const state = {
  tasks: JSON.parse(JSON.stringify(DEFAULT_CHROME_TASKS)),
  currentSchedule: null,
  isBackendOnline: false,
  anomalies: [],
  numCores: 4,
  simulation: {
    currentTime: 0,
    timer: null,
    isPlaying: false,
    speedMs: 500,
    maxTime: 0,
    lastActiveTask: null
  },
  chromeLive: {
    totalProcesses: 35,
    totalRamGb: 1.75,
    totalRamMb: 1788.6,
    totalCpu: 0.0,
    realTasks: [],
    processes: [],
    streamTimer: null
  }
};

// ========================================================
// CYBERPUNK WEB AUDIO SYNTHESIZER (Pure HTML5 Web Audio API)
// ========================================================
const audio = {
  ctx: null,
  enabled: localStorage.getItem("ai_scheduler_audio") !== "false",
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem("ai_scheduler_audio", this.enabled ? "true" : "false");
    const icon = document.getElementById("audioIcon");
    const btn = document.getElementById("btnToggleAudio");
    if (icon) icon.textContent = this.enabled ? "🔊" : "🔇";
    if (btn) btn.classList.toggle("muted", !this.enabled);
    if (this.enabled) this.playContextSwitch();
    return this.enabled;
  },
  playTone(freq, type = "sine", duration = 0.12, gainVal = 0.08) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  },
  playContextSwitch() {
    if (!this.enabled) return;
    this.playTone(440, "sawtooth", 0.08, 0.04);
    setTimeout(() => this.playTone(660, "sine", 0.10, 0.05), 60);
  },
  playTaskComplete() {
    if (!this.enabled) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      setTimeout(() => this.playTone(f, "sine", 0.16, 0.06), i * 55);
    });
  },
  playAnomalyAlert() {
    if (!this.enabled) return;
    [880, 587, 880, 587].forEach((f, i) => {
      setTimeout(() => this.playTone(f, "square", 0.11, 0.04), i * 90);
    });
  },
  playCandlePulse() {
    if (!this.enabled) return;
    this.playTone(110, "triangle", 0.28, 0.10);
  },
  playFreezeTab() {
    if (!this.enabled) return;
    [1200, 1600, 2400, 3200].forEach((f, i) => {
      setTimeout(() => this.playTone(f, "sine", 0.12, 0.03), i * 35);
    });
  }
};

// ========================================================
// REAL CHROME TAB FREEZING & FOCUS CONTROLLER
// ========================================================
async function freezeTab(tabId, tabName) {
  audio.playFreezeTab();
  if (window.chrome && chrome.tabs && chrome.tabs.discard) {
    try {
      await new Promise((resolve, reject) => {
        chrome.tabs.discard(tabId, (discardedTab) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(discardedTab);
        });
      });
      showToast(`❄️ Frozen "${tabName}"! Discarded from RAM.`, "success");
      await fetchRealChromeData(false, false);
      return true;
    } catch (err) {
      console.warn("Tab discard notice:", err);
    }
  }
  // Fallback simulator for non-extension / web environments
  const found = state.tasks.find(t => (t.tab_id === tabId) || (t.name === tabName));
  if (found) {
    found.memory_mb = 8.5; // Discarded tab memory
    found.cpu_percent = 0.0;
    renderTaskTable();
    renderCandlesticks(state.tasks);
  }
  showToast(`❄️ Reclaimed RAM from "${tabName}" (Memory reduced to 8.5 MB)`, "success");
  return true;
}

async function focusTab(tabId) {
  if (window.chrome && chrome.tabs && chrome.tabs.update) {
    try {
      await chrome.tabs.update(tabId, { active: true });
      showToast(`🎯 Switched focus to tab!`, "info");
      return;
    } catch (err) {
      console.warn("Tab focus notice:", err);
    }
  }
  showToast(`🎯 Focusing tab (ID: ${tabId})`, "info");
}

async function autoFreezeHighRamLeaks() {
  const candidates = state.tasks.filter(t => (t.memory_mb || 0) > 120 && !t.is_active);
  if (candidates.length === 0) {
    showToast("No inactive high-RAM tabs (>120MB) to freeze!", "info");
    return;
  }
  let count = 0;
  for (const t of candidates) {
    if (t.tab_id) {
      await freezeTab(t.tab_id, t.name);
    } else {
      t.memory_mb = 8.5;
      t.cpu_percent = 0.0;
    }
    count++;
  }
  audio.playFreezeTab();
  renderTaskTable();
  renderCandlesticks(state.tasks);
  showToast(`❄️ Successfully reclaimed RAM from ${count} background tabs!`, "success");
}

// Workload Presets
const PRESETS = {
  chromeLive: DEFAULT_CHROME_TASKS,
  standard: [
    { name: "P1 (Background Sync)", arrival: 0, burst: 5, priority: 2 },
    { name: "P2 (User Login API)", arrival: 1, burst: 3, priority: 1 },
    { name: "P3 (Data Compression)", arrival: 2, burst: 8, priority: 3 },
    { name: "P4 (System Cache Flush)", arrival: 3, burst: 4, priority: 4 }
  ],
  rendering: [
    { name: "Blender 3D Render", arrival: 0, burst: 14, priority: 3 },
    { name: "Video 4K Encoder", arrival: 2, burst: 12, priority: 3 },
    { name: "Audio Normalizer", arrival: 4, burst: 4, priority: 2 },
    { name: "Thumbnail Generator", arrival: 5, burst: 3, priority: 1 },
    { name: "Subtitle Stuffer", arrival: 6, burst: 2, priority: 1 }
  ],
  interactive: [
    { name: "HTTP Auth Request", arrival: 0, burst: 2, priority: 1 },
    { name: "WebSocket Ping", arrival: 0, burst: 1, priority: 1 },
    { name: "GraphQL User Query", arrival: 1, burst: 3, priority: 2 },
    { name: "Telemetry Logger", arrival: 3, burst: 2, priority: 4 }
  ],
  roundrobin: [
    { name: "Process Alpha", arrival: 0, burst: 8, priority: 2 },
    { name: "Process Beta", arrival: 1, burst: 6, priority: 2 },
    { name: "Process Gamma", arrival: 2, burst: 4, priority: 2 },
    { name: "Process Delta", arrival: 3, burst: 5, priority: 2 }
  ],
  starvation: [
    { name: "Low Prio Big Job", arrival: 0, burst: 18, priority: 5 },
    { name: "Urgent Prio A", arrival: 1, burst: 3, priority: 1 },
    { name: "Urgent Prio B", arrival: 3, burst: 2, priority: 1 },
    { name: "Urgent Prio C", arrival: 5, burst: 4, priority: 2 },
    { name: "Urgent Prio D", arrival: 7, burst: 3, priority: 1 }
  ]
};

// ==========================================
// INITIALIZATION
// ==========================================
function initApp() {
  setupNavigation();
  setupEventListeners();
  setupAiTutor();

  // Initialize Cyberpunk Audio FX state in UI
  const audioIcon = document.getElementById("audioIcon");
  const audioBtn = document.getElementById("btnToggleAudio");
  if (audioIcon) audioIcon.textContent = audio.enabled ? "🔊" : "🔇";
  if (audioBtn) audioBtn.classList.toggle("muted", !audio.enabled);

  renderTaskTable();
  renderCandlesticks(state.tasks);
  checkBackendHealth();
  
  // Auto-sync real Chrome in background
  fetchRealChromeData(false, false);

  // Live Stream Polling every 2.5s
  startLiveStreamPolling();

  setInterval(checkBackendHealth, 10000);
}

// Robust execution trigger
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// Toast notification helper
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${type === "success" ? "toast-success" : type === "error" ? "toast-error" : ""}`;
  setTimeout(() => {
    toast.className = "toast";
  }, 2800);
}

// ==========================================
// NAVIGATION TABS CONTROLLER
// ==========================================
function setupNavigation() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const targetId = tab.dataset.tab;
      document.querySelectorAll(".tab-pane").forEach(pane => {
        pane.classList.remove("active");
      });
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add("active");
      }

      // Auto-trigger tab actions
      if (targetId === "chromeLiveTab") {
        fetchChromeProcessesDetails();
      } else if (targetId === "candlestickTab") {
        renderCandlesticks(state.tasks);
      } else if (targetId === "historyTab") {
        fetchHistory();
      } else if (targetId === "systemTab") {
        fetchSystemProcesses();
      } else if (targetId === "simulationTab" && state.currentSchedule) {
        initSimulation();
      }
    });
  });
}

function switchTab(tabId) {
  const tabBtn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  if (tabBtn) tabBtn.click();
}

// ==========================================
// HEALTH & VERCEL CLOUD CONNECTION
// ==========================================
async function checkBackendHealth() {
  const statusBadge = document.getElementById("serverStatus");
  const statusText = document.getElementById("serverStatusText");
  const currentApi = getApiBase();

  try {
    const res = await fetch(`${currentApi}/health`, { method: "GET" });
    if (res.ok) {
      const data = await res.json();
      state.isBackendOnline = true;
      statusBadge.className = "status-badge online";
      statusText.textContent = currentApi.includes("vercel") ? "Vercel Online" : "Backend Online";
      statusBadge.title = `Connected to ${currentApi} (AI Ready: ${data.ai_model_loaded ? 'Yes' : 'No'})`;
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    state.isBackendOnline = false;
    statusBadge.className = "status-badge offline";
    statusText.textContent = "Offline (Retry)";
    statusBadge.title = `Backend not reachable at ${currentApi}. Click settings ⚙️ to configure Vercel URL.`;
  }
}

// ==========================================
// REAL-TIME CHROME DATA INTEGRATION
// ==========================================
async function fetchRealChromeData(autoSchedule = false, overwriteQueue = false) {
  const currentApi = getApiBase();
  try {
    let openTabs = [];
    if (window.chrome && chrome.tabs && chrome.tabs.query) {
      try {
        openTabs = await new Promise((resolve) => {
          chrome.tabs.query({}, (tabs) => {
            resolve(tabs || []);
          });
        });
      } catch (e) {
        console.warn("Could not query chrome.tabs directly:", e);
      }
    }

    const res = await fetch(`${currentApi}/chrome/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabs: openTabs })
    });

    if (res.ok) {
      const data = await res.json();
      const summary = data.chrome_summary || {};
      
      // Update top live banner metrics
      document.getElementById("liveChromeRam").textContent = `${summary.total_memory_gb || 1.75} GB`;
      document.getElementById("liveChromeCount").textContent = `${summary.total_processes || 35} Procs`;
      document.getElementById("liveChromeTabsCount").textContent = `${summary.tabs_synced || 8} Tabs`;
      document.getElementById("liveChromeCpu").textContent = `${summary.total_cpu_percent || 0.0}%`;

      // Update AI Anomaly Detector status
      state.anomalies = data.anomalies || [];
      const alertText = document.getElementById("anomalyAlertText");
      const alertPill = document.getElementById("anomalyAlertPill");
      if (alertText && alertPill) {
        if (state.anomalies.length > 0) {
          alertText.textContent = `🚨 ${state.anomalies.length} Leak${state.anomalies.length > 1 ? 's' : ''} Detected`;
          alertText.className = "highlight-pink";
          alertPill.style.borderColor = "var(--neon-red)";
        } else {
          alertText.textContent = "🛡️ All Healthy";
          alertText.className = "highlight-green";
          alertPill.style.borderColor = "rgba(0, 255, 136, 0.35)";
        }
      }

      // Update detail tab cards if present
      const detailRam = document.getElementById("chromeTotalRamDetail");
      if (detailRam) {
        detailRam.textContent = `${summary.total_memory_gb || 1.75} GB`;
        document.getElementById("chromeTotalRamMb").textContent = `${summary.total_memory_mb || 1788.6} MB`;
        document.getElementById("chromeRendererCount").textContent = `${summary.tabs_synced || 8}`;
        document.getElementById("chromePidCount").textContent = `${summary.total_processes || 35}`;
      }

      state.chromeLive.realTasks = data.tasks || [];

      if (overwriteQueue || state.tasks.length === 0) {
        state.tasks = JSON.parse(JSON.stringify(state.chromeLive.realTasks));
        renderTaskTable();
        renderCandlesticks(state.tasks);
      }

      if (autoSchedule) {
        state.tasks = JSON.parse(JSON.stringify(state.chromeLive.realTasks));
        renderTaskTable();
        renderCandlesticks(state.tasks);
        await handleRunSchedule();
        showToast(`⚡ Scheduled ${state.tasks.length} live Chrome processes!`, "success");
      }
    }
  } catch (err) {
    console.warn("Real-time Chrome fetch notice:", err);
  }
}

// Fetch and display full Chrome process breakdown
async function fetchChromeProcessesDetails() {
  const currentApi = getApiBase();
  const tbody = document.getElementById("chromeLiveTableBody");
  tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 16px;">Inspecting live Chrome architecture...</td></tr>`;

  try {
    const res = await fetch(`${currentApi}/chrome/metrics`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to inspect Chrome");

    const metrics = data.chrome_metrics || {};
    const procs = metrics.processes || [];

    document.getElementById("chromeTotalRamDetail").textContent = `${metrics.total_memory_gb} GB`;
    document.getElementById("chromeTotalRamMb").textContent = `${metrics.total_memory_mb} MB`;
    document.getElementById("chromePidCount").textContent = `${metrics.total_processes}`;
    document.getElementById("chromeRendererCount").textContent = `${procs.filter(p => p.type === 'Tab Renderer').length}`;

    state.chromeLive.processes = procs;

    tbody.innerHTML = "";
    if (procs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 16px;">No active chrome.exe processes found. Open Google Chrome.</td></tr>`;
      return;
    }

    procs.forEach((p, idx) => {
      const tr = document.createElement("tr");
      
      let badgeClass = "proc-type-tab";
      if (p.type === "GPU Acceleration") badgeClass = "proc-type-gpu";
      else if (p.type === "Browser Core") badgeClass = "proc-type-core";
      else if (p.type === "Network Service") badgeClass = "proc-type-network";
      else if (p.type === "Audio Service") badgeClass = "proc-type-audio";
      else if (p.category === "helper" || p.category === "utility") badgeClass = "proc-type-util";

      const isLeak = (p.memory_mb > 300) || (p.cpu_percent > 10);
      if (isLeak) tr.classList.add("anomaly-leak-row");

      const freezeBtn = p.tab_id ? `<button class="btn-freeze btn-proc-freeze" data-tabid="${p.tab_id}" data-title="Tab #${p.pid}" title="Discard tab to free RAM">❄️ Freeze</button>` : '';
      const focusBtn = p.tab_id ? `<button class="btn-focus btn-proc-focus" data-tabid="${p.tab_id}" title="Bring tab to foreground">🎯 Focus</button>` : '';

      tr.innerHTML = `
        <td><input type="checkbox" class="chrome-proc-cb" data-idx="${idx}" checked></td>
        <td><code>${p.pid}</code></td>
        <td><span class="proc-type-tag ${badgeClass}">${p.type}</span></td>
        <td>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <strong>Chrome ${p.type} #${p.pid}</strong> <small class="text-muted">(${p.threads} thr)</small>
              ${isLeak ? '<span style="color: var(--neon-red); font-size: 10px; font-weight: 700; margin-left: 4px;">🚨 HIGH USAGE</span>' : ''}
            </div>
            <div style="display: flex; gap: 4px;">${freezeBtn}${focusBtn}</div>
          </div>
        </td>
        <td><span style="color: ${isLeak ? 'var(--neon-red)' : 'var(--neon-green)'}; font-weight: 700;">${p.memory_mb} MB</span></td>
        <td>${p.cpu_percent}%</td>
      `;
      tbody.appendChild(tr);
    });

    // Wire freeze & focus in Chrome procs table
    tbody.querySelectorAll(".btn-proc-freeze").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const tabId = parseInt(e.currentTarget.dataset.tabid);
        const title = e.currentTarget.dataset.title;
        await freezeTab(tabId, title);
        fetchChromeProcessesDetails();
      });
    });
    tbody.querySelectorAll(".btn-proc-focus").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const tabId = parseInt(e.currentTarget.dataset.tabid);
        focusTab(tabId);
      });
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 16px;">Failed to load Chrome metrics: ${err.message}</td></tr>`;
  }
}

function importCheckedChromeProcs() {
  const checked = document.querySelectorAll(".chrome-proc-cb:checked");
  if (checked.length === 0) {
    showToast("Please select at least 1 Chrome process", "info");
    return;
  }

  const imported = [];
  checked.forEach((cb, i) => {
    const idx = parseInt(cb.dataset.idx);
    const p = state.chromeLive.processes[idx];
    if (p) {
      const burst = Math.max(1, Math.min(18, Math.round((p.memory_mb / 25) + (p.cpu_percent * 1.5))));
      const priority = p.type === "GPU Acceleration" || p.type === "Browser Core" ? 1 : (p.memory_mb > 100 ? 2 : 3);
      imported.push({
        name: `Chrome: ${p.type} (${p.pid})`,
        arrival: i,
        burst: burst,
        priority: priority,
        pid: p.pid,
        memory_mb: p.memory_mb,
        cpu_percent: p.cpu_percent,
        is_real_chrome: true
      });
    }
  });

  state.tasks = imported;
  renderTaskTable();
  renderCandlesticks(state.tasks);
  switchTab("schedulerTab");
  showToast(`Loaded ${imported.length} real Chrome processes into queue!`, "success");
}

function startLiveStreamPolling() {
  if (state.chromeLive.streamTimer) clearInterval(state.chromeLive.streamTimer);
  state.chromeLive.streamTimer = setInterval(() => {
    const toggle = document.getElementById("toggleLiveStream");
    if (toggle && toggle.checked) {
      fetchRealChromeData(false, false);
    }
  }, 2500);
}

// ========================================================
// RED & GREEN DYNAMIC CANDLESTICK PROCESS ENGINE
// ========================================================
function renderCandlesticks(tasks, activeTaskName = null, remainingTime = null) {
  const stage = document.getElementById("candlestickStage");
  if (!stage) return;

  const taskList = tasks && tasks.length > 0 ? tasks : state.tasks;
  if (!taskList || taskList.length === 0) {
    stage.innerHTML = `<span class="text-muted" style="margin: auto; font-size: 12px;">No active processes to visualize as candlesticks.</span>`;
    return;
  }

  // Find max burst for scaling
  const maxBurst = Math.max(...taskList.map(t => t.burst || 4), 1);

  // If stage already has children, update them dynamically in-place
  const existingBars = stage.querySelectorAll(".candlestick-bar");
  if (existingBars.length === taskList.length) {
    taskList.forEach((t, i) => {
      const bar = existingBars[i];
      const body = bar.querySelector(".candlestick-body");
      const wick = bar.querySelector(".candlestick-wick");
      const numSpan = body.querySelector("span");

      const isActive = activeTaskName && (t.name === activeTaskName);
      
      // Determine base Red or Green color
      const isRed = t.is_audible || (t.name && (t.name.toLowerCase().includes("video") || t.name.toLowerCase().includes("gpu"))) || t.priority === 1 || t.burst > 8;
      const isAnomaly = (state.anomalies || []).some(a => a.name === t.name) || (t.memory_mb > 300) || (t.cpu_percent > 10);

      bar.classList.remove("candle-green", "candle-red", "candle-active", "candle-siren");
      bar.classList.add(isRed ? "candle-red" : "candle-green");
      if (isAnomaly) bar.classList.add("candle-siren");

      if (isActive) {
        bar.classList.add("candle-active");
        const curBurst = remainingTime !== null ? remainingTime : t.burst;
        numSpan.textContent = `${curBurst}s`;
        const bodyHeight = Math.max(28, Math.min(130, Math.round((curBurst / maxBurst) * 115)));
        body.style.height = `${bodyHeight}px`;
      } else {
        numSpan.textContent = `${t.burst}`;
        const bodyHeight = Math.max(30, Math.min(125, Math.round((t.burst / maxBurst) * 110)));
        body.style.height = `${bodyHeight}px`;
      }
    });
    return;
  }

  // Initial full render
  stage.innerHTML = "";
  taskList.forEach((t, i) => {
    const bar = document.createElement("div");
    bar.className = "candlestick-bar";
    bar.dataset.taskName = t.name;

    // Red vs Green Bull & Bear logic:
    // Red: Heavy GPU, 4K Video, High burst, or Urgent Priority 1
    // Green: Healthy lower burst, regular tab, core process
    const isRed = t.is_audible || (t.name && (t.name.toLowerCase().includes("video") || t.name.toLowerCase().includes("gpu"))) || t.priority === 1 || t.burst > 8;
    const isAnomaly = (state.anomalies || []).some(a => a.name === t.name) || (t.memory_mb > 300) || (t.cpu_percent > 10);

    bar.classList.add(isRed ? "candle-red" : "candle-green");
    if (isAnomaly) bar.classList.add("candle-siren");

    const bodyHeight = Math.max(30, Math.min(125, Math.round((t.burst / maxBurst) * 110)));
    const wickHeight = Math.max(14, Math.min(38, Math.round((t.burst * 2.4))));
    const memText = t.memory_mb ? `${t.memory_mb}M` : `${t.burst}s`;

    bar.innerHTML = `
      <div class="candlestick-wick" style="height: ${wickHeight}px;"></div>
      <div class="candlestick-body" style="height: ${bodyHeight}px;" title="${t.name} (Burst: ${t.burst}s, Priority: ${t.priority}${isAnomaly ? ' - AI ALERT: Memory/CPU Leak!' : ''})">
        <span>${t.burst}</span>
      </div>
      <div class="candlestick-label">${escapeHtml(t.name)}</div>
      <span class="candlestick-val">${memText}${isAnomaly ? ' 🚨' : ''}</span>
    `;

    bar.addEventListener("click", () => {
      showToast(`${t.name}: Burst ${t.burst}s, Priority ${t.priority}, Arrival ${t.arrival}s${isAnomaly ? ' [AI Anomaly Flagged]' : ''}`, isAnomaly ? "error" : "info");
    });

    stage.appendChild(bar);
  });
}

function updateCandlestickSimulation(t, activeBlock, allTasks) {
  // Update clock & active pill in Candlestick tab
  const clockEl = document.getElementById("candleClockTime");
  if (clockEl) clockEl.textContent = `T = ${t}s`;

  const activePill = document.getElementById("candleActivePill");
  if (activePill) {
    if (!activeBlock || activeBlock.task === "IDLE") {
      activePill.textContent = "CPU Core: Idle";
      activePill.style.color = "var(--text-muted)";
    } else {
      const elapsed = Math.min(activeBlock.duration, t - activeBlock.start + 1);
      const remaining = Math.max(0, activeBlock.duration - elapsed);
      activePill.innerHTML = `<span style="color: var(--neon-green)">Executing:</span> <strong>${activeBlock.task}</strong> (${remaining}s remaining)`;
    }
  }

  // Update Candlestick bars live
  const stage = document.getElementById("candlestickStage");
  if (!stage) return;

  const bars = stage.querySelectorAll(".candlestick-bar");
  bars.forEach(bar => {
    const taskName = bar.dataset.taskName;
    const body = bar.querySelector(".candlestick-body");
    const numSpan = body.querySelector("span");

    // Match with scheduled task metrics
    const taskData = (allTasks || []).find(x => x.name === taskName);

    if (activeBlock && activeBlock.task === taskName) {
      // Actively Running Candle (Pumping!)
      bar.classList.add("candle-active");
      bar.classList.remove("candle-done");
      const elapsed = Math.min(activeBlock.duration, t - activeBlock.start + 1);
      const rem = Math.max(1, activeBlock.duration - elapsed);
      numSpan.textContent = `${rem}s`;
    } else if (taskData && taskData.completion_time <= t) {
      // Finished Candle
      bar.classList.remove("candle-active");
      bar.classList.add("candle-done");
      numSpan.textContent = "✓";
    } else {
      // Waiting / Unstarted
      bar.classList.remove("candle-active", "candle-done");
      if (taskData) numSpan.textContent = `${taskData.burst}`;
    }
  });
}

function triggerCandlePulseWave() {
  audio.playCandlePulse();
  const stage = document.getElementById("candlestickStage");
  if (!stage) return;
  const bars = stage.querySelectorAll(".candlestick-body");
  bars.forEach((b, idx) => {
    setTimeout(() => {
      b.style.filter = "brightness(1.6) drop-shadow(0 0 16px var(--neon-green))";
      b.style.transform = "scaleY(1.25)";
      setTimeout(() => {
        b.style.filter = "none";
        b.style.transform = "scaleY(1.0)";
      }, 350);
    }, idx * 80);
  });
  showToast("Red & Green pulse wave triggered across candlesticks!", "success");
}

// ==========================================
// TASK INPUT TABLE CONTROLLER
// ==========================================
function renderTaskTable() {
  const tbody = document.getElementById("taskTableBody");
  const countBadge = document.getElementById("taskCountBadge");
  if (!tbody) return;

  tbody.innerHTML = "";
  countBadge.textContent = `${state.tasks.length} Chrome Task${state.tasks.length === 1 ? '' : 's'}`;

  if (state.tasks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 16px;">Queue is empty. Click "Sync Chrome" at top to pull live browser tasks.</td></tr>`;
    return;
  }

  state.tasks.forEach((t, idx) => {
    const tr = document.createElement("tr");

    const isAnomaly = (state.anomalies || []).some(a => a.name === t.name) || (t.memory_mb > 300) || (t.cpu_percent > 10);
    if (isAnomaly) tr.classList.add("anomaly-leak-row");

    const memBadge = t.memory_mb ? `<span style="font-size: 10px; color: ${isAnomaly ? 'var(--neon-red)' : 'var(--neon-green)'}; margin-left: 6px; font-weight: 600;">[${t.memory_mb} MB${isAnomaly ? ' 🚨' : ''}]</span>` : '';
    const pidBadge = t.pid ? `<span style="font-size: 10px; color: var(--text-dim); margin-left: 4px;">PID:${t.pid}</span>` : '';
    const activeDot = t.is_active ? `<span title="Active Tab" style="color: var(--neon-green); margin-right: 4px;">🟢</span>` : '';
    const audioIcon = t.is_audible ? `<span title="Playing Audio" style="color: var(--neon-red); margin-right: 4px;">🔊</span>` : '';

    const freezeBtn = `<button class="btn-icon-tiny btn-row-freeze" data-idx="${idx}" title="Discard tab to free RAM">❄️</button>`;
    const focusBtn = t.tab_id ? `<button class="btn-icon-tiny btn-row-focus" data-idx="${idx}" title="Switch focus to tab">🎯</button>` : '';

    tr.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 4px;">
          ${activeDot}${audioIcon}
          <input type="text" class="table-input task-name-input" data-idx="${idx}" value="${escapeHtml(t.name)}" placeholder="Task Name">
        </div>
        <div style="margin-top: 2px;">${memBadge}${pidBadge}</div>
      </td>
      <td>
        <input type="number" min="0" max="99" class="table-input task-arrival-input" data-idx="${idx}" value="${t.arrival}">
      </td>
      <td>
        <input type="number" min="0" max="99" class="table-input task-burst-input" data-idx="${idx}" value="${t.burst}" placeholder="Auto (AI)">
      </td>
      <td>
        <input type="number" min="1" max="10" class="table-input task-priority-input" data-idx="${idx}" value="${t.priority}">
      </td>
      <td>
        <div class="row-actions">
          ${freezeBtn}
          ${focusBtn}
          <button class="btn-icon-tiny btn-magic" data-idx="${idx}" title="AI Predict Burst & Priority from tab signature">
            ✨
          </button>
          <button class="btn-icon-tiny btn-delete" data-idx="${idx}" title="Delete task">
            ✕
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Wire freeze & focus buttons in table
  tbody.querySelectorAll(".btn-row-freeze").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      const t = state.tasks[idx];
      await freezeTab(t.tab_id, t.name);
    });
  });
  tbody.querySelectorAll(".btn-row-focus").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      const t = state.tasks[idx];
      if (t.tab_id) focusTab(t.tab_id);
    });
  });

  // Wire row input changes
  tbody.querySelectorAll(".task-name-input").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      state.tasks[idx].name = e.target.value;
      renderCandlesticks(state.tasks);
    });
  });
  tbody.querySelectorAll(".task-arrival-input").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      state.tasks[idx].arrival = parseInt(e.target.value) || 0;
    });
  });
  tbody.querySelectorAll(".task-burst-input").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      state.tasks[idx].burst = parseInt(e.target.value) || 0;
      renderCandlesticks(state.tasks);
    });
  });
  tbody.querySelectorAll(".task-priority-input").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      state.tasks[idx].priority = parseInt(e.target.value) || 1;
      renderCandlesticks(state.tasks);
    });
  });

  // Wire row delete & AI buttons
  tbody.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      state.tasks.splice(idx, 1);
      renderTaskTable();
      renderCandlesticks(state.tasks);
    });
  });

  tbody.querySelectorAll(".btn-magic").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      await predictSingleTask(idx);
    });
  });
}

// AI Predict Single Task
async function predictSingleTask(idx) {
  const task = state.tasks[idx];
  const currentApi = getApiBase();
  showToast(`Analyzing "${task.name}" with AI...`, "info");

  try {
    const res = await fetch(`${currentApi}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task })
    });
    const data = await res.json();
    if (data.predictions && data.predictions[0]) {
      const pred = data.predictions[0];
      state.tasks[idx].burst = pred.predicted_burst;
      state.tasks[idx].priority = pred.predicted_priority;
      renderTaskTable();
      renderCandlesticks(state.tasks);
      showToast(`AI: ${pred.explanation} (${pred.confidence}% confidence)`, "success");
    }
  } catch (err) {
    showToast("AI Prediction request failed", "error");
  }
}

// AI Predict All Empty/Zero Fields
async function handleAiAutoPredictAll() {
  if (state.tasks.length === 0) return;
  const currentApi = getApiBase();
  showToast("Running ML inference across queue...", "info");

  try {
    const res = await fetch(`${currentApi}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks: state.tasks })
    });
    const data = await res.json();
    if (data.predictions) {
      data.predictions.forEach((pred, i) => {
        if (state.tasks[i]) {
          state.tasks[i].burst = pred.predicted_burst;
          state.tasks[i].priority = pred.predicted_priority;
        }
      });
      renderTaskTable();
      renderCandlesticks(state.tasks);
      showToast(`AI estimated burst times & priorities for ${data.predictions.length} tasks!`, "success");
    }
  } catch (err) {
    showToast("AI Batch estimation failed", "error");
  }
}

// Run Schedule
async function handleRunSchedule() {
  if (state.tasks.length === 0) {
    showToast("Please add at least 1 task to schedule", "error");
    return;
  }

  const runBtn = document.getElementById("btnRunSchedule");
  const originalText = runBtn.innerHTML;
  runBtn.innerHTML = "⌛ Calculating...";
  runBtn.disabled = true;

  const alg = document.getElementById("algorithmSelect").value;
  const timeQuantum = parseInt(document.getElementById("timeQuantum").value) || 2;
  const numCores = parseInt(document.getElementById("cpuCoresSelect")?.value) || 4;
  state.numCores = numCores;
  const currentApi = getApiBase();

  try {
    const res = await fetch(`${currentApi}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        algorithm: alg,
        time_quantum: timeQuantum,
        num_cores: numCores,
        tasks: state.tasks
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Scheduling failed");
    }

    state.currentSchedule = data;
    state.anomalies = data.anomalies || [];

    // Trigger Cyberpunk Sound FX
    if (state.anomalies.length > 0) {
      audio.playAnomalyAlert();
      showToast(`⚠️ Schedule ready with ${data.algorithm}, but ${state.anomalies.length} resource leak(s) detected!`, "error");
    } else {
      audio.playContextSwitch();
      showToast(`Schedule generated via ${data.algorithm}!`, "success");
    }

    renderGanttAndResults(data);
    renderCandlesticks(state.tasks);
    switchTab("ganttTab");
  } catch (err) {
    showToast(`Error: ${err.message}`, "error");
  } finally {
    runBtn.innerHTML = originalText;
    runBtn.disabled = false;
  }
}

// Render Gantt & Execution Results (Red & Green Theme & Multi-Core SMP)
function renderGanttAndResults(data) {
  document.getElementById("resAlgorithm").textContent = data.algorithm || "-";
  document.getElementById("resTaskCount").textContent = `${data.tasks ? data.tasks.length : 0} processes completed`;
  document.getElementById("resAvgWT").innerHTML = `${data.avg_waiting_time} <small>s</small>`;
  document.getElementById("resAvgTAT").innerHTML = `${data.avg_turnaround_time} <small>s</small>`;
  document.getElementById("resCpuUtil").textContent = `${data.cpu_utilization}%`;
  document.getElementById("resTotalTime").textContent = `Makespan: ${data.total_time}s`;

  const legend = document.getElementById("ganttLegend");
  legend.innerHTML = "";

  const gantt = data.gantt || [];
  const totalTime = data.total_time || 1;

  // Render Legend
  const uniqueTasks = {};
  gantt.forEach(g => {
    if (!uniqueTasks[g.task]) {
      uniqueTasks[g.task] = g.color;
    }
  });

  Object.entries(uniqueTasks).forEach(([taskName, color]) => {
    const pill = document.createElement("div");
    pill.className = "legend-pill";
    pill.innerHTML = `<span class="legend-color" style="background-color: ${color}"></span><span>${taskName}</span>`;
    legend.appendChild(pill);
  });

  const multicoreBar = document.getElementById("multicoreStatsBar");
  const multicoreGantt = document.getElementById("multicoreGanttContainer");
  const singleGantt = document.getElementById("singleGanttContainer");

  const isMultiCore = (data.num_cores && data.num_cores > 1) || (data.core_tracks && Object.keys(data.core_tracks).length > 1);
  const coreTracks = data.core_tracks || (data.multicore ? data.multicore.cores : null);
  const numCores = data.num_cores || (data.multicore ? data.multicore.num_cores : 1);
  const speedup = data.speedup || (data.multicore ? data.multicore.speedup : 1.0);
  const efficiency = data.parallel_efficiency || (data.multicore ? data.multicore.parallel_efficiency : 100);
  const coresUtil = data.cores_utilization || {};

  // Multi-Core SMP Gantt Tracks
  if (isMultiCore && coreTracks) {
    if (multicoreBar) multicoreBar.style.display = "flex";
    if (multicoreGantt) multicoreGantt.style.display = "flex";
    if (singleGantt) singleGantt.style.display = "none";

    document.getElementById("mcCoresCount").textContent = `${numCores} Cores SMP`;
    document.getElementById("mcSpeedupVal").textContent = `${speedup}x`;
    document.getElementById("mcEfficiencyVal").textContent = `${efficiency}%`;

    multicoreGantt.innerHTML = "";
    const makespan = data.total_time || (data.multicore ? data.multicore.makespan : 1);

    Object.entries(coreTracks).forEach(([coreId, coreTrackOrObj]) => {
      const row = document.createElement("div");
      row.className = "mc-core-row";

      const blocks = Array.isArray(coreTrackOrObj) ? coreTrackOrObj : (coreTrackOrObj.gantt || []);
      const util = coresUtil[coreId] !== undefined ? coresUtil[coreId] : (coreTrackOrObj.utilization || 0);

      const badge = document.createElement("div");
      badge.className = "mc-core-badge";
      badge.textContent = `${coreId} (${util}%)`;

      const track = document.createElement("div");
      track.className = "mc-gantt-track";

      blocks.forEach(block => {
        const dur = block.end - block.start;
        const widthPct = (dur / makespan) * 100;
        const bDiv = document.createElement("div");
        bDiv.className = `gantt-block ${block.task === "IDLE" ? "gantt-block-idle" : ""}`;
        bDiv.style.width = `${widthPct}%`;
        bDiv.style.backgroundColor = block.color;
        bDiv.title = `${coreId}: ${block.task} [${block.start}s - ${block.end}s] (${dur}s duration)`;
        bDiv.innerHTML = `
          <span>${block.task}</span>
          <span class="gantt-block-time">${block.start} - ${block.end}</span>
        `;
        track.appendChild(bDiv);
      });

      row.appendChild(badge);
      row.appendChild(track);
      multicoreGantt.appendChild(row);
    });

  } else {
    // Single Core standard Gantt
    if (multicoreBar) multicoreBar.style.display = "none";
    if (multicoreGantt) multicoreGantt.style.display = "none";
    if (singleGantt) singleGantt.style.display = "block";

    const track = document.getElementById("ganttTrack");
    const axis = document.getElementById("ganttTimelineAxis");
    track.innerHTML = "";
    axis.innerHTML = "";

    gantt.forEach(block => {
      const duration = block.end - block.start;
      const widthPct = (duration / totalTime) * 100;

      const div = document.createElement("div");
      div.className = `gantt-block ${block.task === "IDLE" ? "gantt-block-idle" : ""}`;
      div.style.width = `${widthPct}%`;
      div.style.backgroundColor = block.color;
      div.title = `${block.task} [${block.start}s - ${block.end}s] (${duration}s duration)`;

      div.innerHTML = `
        <span>${block.task}</span>
        <span class="gantt-block-time">${block.start} - ${block.end}</span>
      `;
      track.appendChild(div);
    });

    const markTimes = new Set([0, totalTime]);
    gantt.forEach(g => {
      markTimes.add(g.start);
      markTimes.add(g.end);
    });

    Array.from(markTimes).sort((a, b) => a - b).forEach(time => {
      const leftPct = (time / totalTime) * 100;
      const tick = document.createElement("div");
      tick.className = "axis-tick";
      tick.style.left = `${leftPct}%`;
      tick.innerHTML = `<span>${time}</span>`;
      axis.appendChild(tick);
    });
  }

  // Detailed Metrics Table
  const tableBody = document.getElementById("metricsTableBody");
  tableBody.innerHTML = "";

  (data.tasks || []).forEach(t => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong style="color: ${t.color}">${escapeHtml(t.name)}</strong></td>
      <td>${t.arrival}</td>
      <td>${t.burst}</td>
      <td>${t.priority}</td>
      <td>${t.start_time}</td>
      <td>${t.completion_time}</td>
      <td><span style="color: var(--neon-green); font-weight: 700;">${t.turnaround_time}</span></td>
      <td><span style="color: var(--neon-red); font-weight: 700;">${t.waiting_time}</span></td>
      <td>${t.response_time}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// Compare All Algorithms
async function handleCompareAll() {
  if (state.tasks.length === 0) {
    showToast("Please add at least 1 task to compare", "error");
    return;
  }

  showToast("Running side-by-side benchmark across 5 algorithms...", "info");
  const timeQuantum = parseInt(document.getElementById("timeQuantum").value) || 2;
  const currentApi = getApiBase();

  try {
    const res = await fetch(`${currentApi}/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        time_quantum: timeQuantum,
        tasks: state.tasks
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Comparison failed");

    renderComparisonResults(data);
    switchTab("compareTab");
    showToast("Benchmark completed!", "success");
  } catch (err) {
    showToast(`Comparison error: ${err.message}`, "error");
  }
}

// Render Comparison Results
function renderComparisonResults(data) {
  const banner = document.getElementById("recommendationBanner");
  const bestTitle = document.getElementById("bestAlgTitle");
  const bestReason = document.getElementById("bestAlgReason");
  const tbody = document.getElementById("comparisonTableBody");
  const chartSection = document.getElementById("comparisonChartSection");
  const barsContainer = document.getElementById("waitingTimeBars");

  banner.style.display = "flex";
  bestTitle.textContent = `Optimal Algorithm: ${data.best_algorithm.name}`;
  bestReason.textContent = data.best_algorithm.reason;

  tbody.innerHTML = "";
  barsContainer.innerHTML = "";

  const comparison = data.comparison || {};
  const entries = Object.entries(comparison);

  const maxWT = Math.max(...entries.map(([_, d]) => d.avg_waiting_time), 1);

  entries.forEach(([algName, stats]) => {
    const isWinner = algName === data.best_algorithm.name;
    const tr = document.createElement("tr");
    if (isWinner) tr.style.backgroundColor = "rgba(0, 255, 136, 0.12)";

    tr.innerHTML = `
      <td><strong>${algName} ${isWinner ? '🏆' : ''}</strong></td>
      <td><span style="color: var(--neon-green); font-weight: 700;">${stats.avg_waiting_time}s</span></td>
      <td><span style="color: var(--neon-red); font-weight: 700;">${stats.avg_turnaround_time}s</span></td>
      <td>${stats.avg_response_time}s</td>
      <td>${stats.cpu_utilization}%</td>
      <td>${stats.total_time}s</td>
      <td><small class="text-muted">${(stats.order || []).join(" &rarr; ")}</small></td>
    `;
    tbody.appendChild(tr);

    // Bar chart row
    const barRow = document.createElement("div");
    barRow.className = "bar-row";
    const widthPct = Math.max(6, (stats.avg_waiting_time / maxWT) * 100);
    const color = isWinner ? "#00ff88" : "#ff3366";

    barRow.innerHTML = `
      <div class="bar-label">${algName}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${widthPct}%; background-color: ${color}"></div>
        <span class="bar-value">${stats.avg_waiting_time}s</span>
      </div>
    `;
    barsContainer.appendChild(barRow);
  });

  chartSection.style.display = "flex";
}

// CPU Simulation Logic
function initSimulation() {
  if (!state.currentSchedule) return;

  state.simulation.currentTime = 0;
  state.simulation.maxTime = state.currentSchedule.total_time || 0;
  state.simulation.isPlaying = false;
  state.simulation.lastActiveTask = null;
  if (state.simulation.timer) clearInterval(state.simulation.timer);

  const playBtn = document.getElementById("btnSimPlay");
  if (playBtn) playBtn.innerHTML = "▶ Play";
  const candlePlay = document.getElementById("btnCandlePlay");
  if (candlePlay) candlePlay.innerHTML = "▶ Run Live Candles";

  const statusBadge = document.getElementById("simStatusBadge");
  if (statusBadge) statusBadge.textContent = "Ready";

  updateSimulationView();
}

async function toggleSimulation() {
  if (!state.currentSchedule) {
    showToast("Calculating schedule first...", "info");
    await handleRunSchedule();
    if (!state.currentSchedule) return;
  }

  const playBtn = document.getElementById("btnSimPlay");
  const candlePlay = document.getElementById("btnCandlePlay");

  if (state.simulation.isPlaying) {
    clearInterval(state.simulation.timer);
    state.simulation.isPlaying = false;
    if (playBtn) playBtn.innerHTML = "▶ Play";
    if (candlePlay) candlePlay.innerHTML = "▶ Run Live Candles";
    const statusBadge = document.getElementById("simStatusBadge");
    if (statusBadge) statusBadge.textContent = "Paused";
  } else {
    if (state.simulation.currentTime >= state.simulation.maxTime) {
      state.simulation.currentTime = 0;
    }
    state.simulation.isPlaying = true;
    if (playBtn) playBtn.innerHTML = "⏸ Pause";
    if (candlePlay) candlePlay.innerHTML = "⏸ Pause Candles";
    const statusBadge = document.getElementById("simStatusBadge");
    if (statusBadge) statusBadge.textContent = "Running";
    audio.playContextSwitch();
    state.simulation.timer = setInterval(tickSimulation, state.simulation.speedMs);
  }
}

function stepSimulation() {
  if (!state.currentSchedule) return;
  if (state.simulation.isPlaying) toggleSimulation();
  if (state.simulation.currentTime < state.simulation.maxTime) {
    state.simulation.currentTime++;
    updateSimulationView();
  }
}

function resetSimulation() {
  initSimulation();
  renderCandlesticks(state.tasks);
}

function tickSimulation() {
  if (state.simulation.currentTime < state.simulation.maxTime) {
    state.simulation.currentTime++;
    updateSimulationView();
  } else {
    toggleSimulation();
    audio.playTaskComplete();
    const statusBadge = document.getElementById("simStatusBadge");
    if (statusBadge) statusBadge.textContent = "Completed";
  }
}

function updateSimulationView() {
  const t = state.simulation.currentTime;
  document.getElementById("simCurrentTime").textContent = `T = ${t}s`;

  if (!state.currentSchedule) return;

  const gantt = state.currentSchedule.gantt || [];
  const tasks = state.currentSchedule.tasks || [];
  const multicore = state.currentSchedule.multicore;

  const activeBlock = gantt.find(g => t >= g.start && (t < g.end || (t === state.simulation.maxTime && t === g.end)));

  // Sound FX on task context switch
  if (activeBlock && activeBlock.task !== state.simulation.lastActiveTask) {
    state.simulation.lastActiveTask = activeBlock.task;
    if (state.simulation.isPlaying) audio.playContextSwitch();
  }

  // Update Candlestick Visualizer dynamically with active process!
  updateCandlestickSimulation(t, activeBlock, tasks);

  const coresContainer = document.getElementById("simCoresContainer");

  const isMultiCore = (state.currentSchedule.num_cores && state.currentSchedule.num_cores > 1) || (state.currentSchedule.core_tracks && Object.keys(state.currentSchedule.core_tracks).length > 1);
  const coreTracks = state.currentSchedule.core_tracks || (state.currentSchedule.multicore ? state.currentSchedule.multicore.cores : null);
  const numCores = state.currentSchedule.num_cores || (state.currentSchedule.multicore ? state.currentSchedule.multicore.num_cores : 1);

  // Multi-Core Stage View
  if (isMultiCore && coreTracks && coresContainer) {
    const headerTitle = document.getElementById("simCoresHeaderTitle");
    const modeTag = document.getElementById("simCoresModeTag");
    if (headerTitle) headerTitle.textContent = `CPU SMP CORES (${numCores}-CORE ACTIVE)`;
    if (modeTag) modeTag.textContent = `${numCores} Cores Active`;

    coresContainer.innerHTML = "";

    Object.entries(coreTracks).forEach(([cId, cTrackOrObj]) => {
      const cGantt = Array.isArray(cTrackOrObj) ? cTrackOrObj : (cTrackOrObj.gantt || []);
      const curBlock = cGantt.find(g => t >= g.start && (t < g.end || (t === state.simulation.maxTime && t === g.end)));

      const box = document.createElement("div");
      const isExecuting = curBlock && curBlock.task !== "IDLE";
      box.className = `core-box-smp ${isExecuting ? "core-active" : "core-idle"}`;

      if (isExecuting) {
        const elapsed = Math.min(curBlock.duration, t - curBlock.start + 1);
        const progressPct = Math.round((elapsed / curBlock.duration) * 100);

        box.innerHTML = `
          <div class="core-box-title">
            <span>${cId}</span>
            <span style="font-size: 10px; color: ${curBlock.color}">${elapsed}/${curBlock.duration}s</span>
          </div>
          <div style="font-weight: 700; color: ${curBlock.color}; font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(curBlock.task)}
          </div>
          <div class="active-task-progress-bar" style="margin-top: 5px;">
            <div class="active-task-fill" style="width: ${progressPct}%; background: ${curBlock.color}"></div>
          </div>
        `;
      } else {
        box.innerHTML = `
          <div class="core-box-title">
            <span>${cId}</span>
            <span style="font-size: 10px; color: var(--text-dim)">IDLE</span>
          </div>
          <div style="color: var(--text-muted); font-size: 11px; padding: 4px 0;">Awaiting Task</div>
        `;
      }
      coresContainer.appendChild(box);
    });

  } else if (coresContainer) {
    // Single Core standard view
    const headerTitle = document.getElementById("simCoresHeaderTitle");
    const modeTag = document.getElementById("simCoresModeTag");
    if (headerTitle) headerTitle.textContent = "CPU CORE 0 (Uniprocessor)";
    if (modeTag) modeTag.textContent = "1 Core Active";

    coresContainer.innerHTML = "";
    const singleBox = document.createElement("div");
    singleBox.className = "panel-card cpu-core-box";
    singleBox.style.width = "100%";

    if (!activeBlock || activeBlock.task === "IDLE") {
      singleBox.innerHTML = `
        <div class="core-header"><span class="chip-dot"></span><h3>CPU CORE 0 (Idle)</h3></div>
        <div class="core-content">
          <div class="cpu-idle-state">
            <div class="cpu-pulse-ring"></div>
            <p>CPU is Idle</p>
            <small>${activeBlock ? 'Waiting for process arrival' : 'All processes finished'}</small>
          </div>
        </div>
      `;
    } else {
      const elapsedInBlock = Math.min(activeBlock.duration, t - activeBlock.start + 1);
      const progressPct = Math.round((elapsedInBlock / activeBlock.duration) * 100);

      singleBox.innerHTML = `
        <div class="core-header"><span class="chip-dot"></span><h3>CPU CORE 0 (Active)</h3></div>
        <div class="core-content">
          <div class="active-task-card" style="border-color: ${activeBlock.color}">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="active-task-name" style="color: ${activeBlock.color}">${escapeHtml(activeBlock.task)}</span>
              <span style="font-size: 11px; color: var(--text-muted);">${elapsedInBlock}/${activeBlock.duration}s</span>
            </div>
            <div class="active-task-progress-bar">
              <div class="active-task-fill" style="width: ${progressPct}%; background: ${activeBlock.color}"></div>
            </div>
            <small style="color: var(--text-dim); text-align: left;">Active quantum slice [${activeBlock.start}s - ${activeBlock.end}s]</small>
          </div>
        </div>
      `;
    }
    coresContainer.appendChild(singleBox);
  }

  // Update Ready Queue
  const readyList = document.getElementById("simReadyQueue");
  const readyTasks = tasks.filter(task => task.arrival <= t && task.completion_time > t && task.name !== (activeBlock ? activeBlock.task : null));
  readyList.innerHTML = "";
  if (readyTasks.length === 0) {
    readyList.innerHTML = `<span class="text-muted" style="font-size: 11px;">Queue is empty</span>`;
  } else {
    readyTasks.forEach(task => {
      const pill = document.createElement("div");
      pill.className = "queue-pill";
      pill.innerHTML = `
        <span style="font-weight: 700; color: ${task.color}">${escapeHtml(task.name)}</span>
        <span style="color: var(--text-dim); font-size: 10px;">Prio: ${task.priority} | Burst: ${task.burst}</span>
      `;
      readyList.appendChild(pill);
    });
  }

  // Update Completed List
  const completedList = document.getElementById("simCompletedList");
  const completedTasks = tasks.filter(task => task.completion_time <= t);
  completedList.innerHTML = "";
  if (completedTasks.length === 0) {
    completedList.innerHTML = `<span class="text-muted" style="font-size: 11px;">None completed yet</span>`;
  } else {
    completedTasks.forEach(task => {
      const pill = document.createElement("div");
      pill.className = "queue-pill";
      pill.innerHTML = `
        <span style="font-weight: 700; color: ${task.color}">${escapeHtml(task.name)}</span>
        <span style="color: var(--neon-green); font-size: 10px;">TAT: ${task.turnaround_time}s | WT: ${task.waiting_time}s</span>
      `;
      completedList.appendChild(pill);
    });
  }
}

// Live System Processes (psutil)
async function fetchSystemProcesses() {
  const currentApi = getApiBase();
  const tbody = document.getElementById("systemProcsTableBody");
  tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 16px;">Inspecting system processes...</td></tr>`;

  try {
    const res = await fetch(`${currentApi}/system-processes?limit=15`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to inspect system");

    tbody.innerHTML = "";
    (data.processes || []).forEach(proc => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="checkbox" class="proc-checkbox" data-name="${escapeHtml(proc.name)}" data-cpu="${proc.cpu_percent}" data-mem="${proc.memory_mb}" checked></td>
        <td><code>${proc.pid}</code></td>
        <td><strong>${escapeHtml(proc.name)}</strong></td>
        <td>${proc.cpu_percent}%</td>
        <td>${proc.memory_mb} MB</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 16px;">Failed to fetch system processes: ${err.message}</td></tr>`;
  }
}

function importSelectedProcesses() {
  const checked = document.querySelectorAll(".proc-checkbox:checked");
  if (checked.length === 0) {
    showToast("Please check at least 1 process to import", "info");
    return;
  }

  const imported = [];
  checked.forEach((cb, i) => {
    const name = cb.dataset.name;
    const mem = parseFloat(cb.dataset.mem) || 50;
    const cpu = parseFloat(cb.dataset.cpu) || 1;
    const burst = Math.max(1, Math.min(18, Math.round((mem / 120) + (cpu / 8))));
    const priority = cpu > 5 ? 1 : (mem > 200 ? 2 : 3);

    imported.push({
      name: name,
      arrival: i,
      burst: burst,
      priority: priority,
      memory_mb: mem,
      cpu_percent: cpu
    });
  });

  state.tasks = imported;
  renderTaskTable();
  renderCandlesticks(state.tasks);
  switchTab("schedulerTab");
  showToast(`Imported ${imported.length} live system processes!`, "success");
}

// History Management
async function fetchHistory() {
  const currentApi = getApiBase();
  const tbody = document.getElementById("historyTableBody");
  tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 16px;">Loading history...</td></tr>`;

  try {
    const res = await fetch(`${currentApi}/history?limit=25`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch history");

    tbody.innerHTML = "";
    const history = data.history || [];
    if (history.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 16px;">No history records yet. Run schedules to log executions.</td></tr>`;
      return;
    }

    history.forEach(h => {
      const tr = document.createElement("tr");
      const dateStr = h.created_at ? new Date(h.created_at).toLocaleTimeString() : "-";
      tr.innerHTML = `
        <td>#${h.id}</td>
        <td><small class="text-muted">${dateStr}</small></td>
        <td><strong>${h.algorithm}</strong></td>
        <td>${h.task_count}</td>
        <td><span style="color: var(--neon-green); font-weight: 700;">${h.avg_waiting_time}s</span></td>
        <td><span style="color: var(--neon-red); font-weight: 700;">${h.avg_turnaround_time}s</span></td>
        <td>${h.cpu_utilization}%</td>
        <td style="text-align: center;">
          <button class="btn btn-sm btn-outline btn-load-history" data-id="${h.id}" title="Load tasks into editor">Load</button>
          <button class="btn-icon-tiny btn-del-history" data-id="${h.id}" title="Delete" style="display: inline-flex;">✕</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".btn-load-history").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const record = history.find(item => item.id === id);
        if (record && record.tasks) {
          state.tasks = record.tasks;
          renderTaskTable();
          renderCandlesticks(state.tasks);
          switchTab("schedulerTab");
          showToast(`Loaded Schedule #${id} tasks!`, "success");
        }
      });
    });

    tbody.querySelectorAll(".btn-del-history").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        await deleteHistoryEntry(id);
      });
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 16px;">Failed to load history: ${err.message}</td></tr>`;
  }
}

async function deleteHistoryEntry(id) {
  const currentApi = getApiBase();
  try {
    const res = await fetch(`${currentApi}/history/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast(`Deleted history entry #${id}`, "info");
      fetchHistory();
    }
  } catch (err) {
    showToast("Delete failed", "error");
  }
}

async function clearAllHistory() {
  if (!confirm("Are you sure you want to clear all scheduling history?")) return;
  const currentApi = getApiBase();
  try {
    const res = await fetch(`${currentApi}/history/clear`, { method: "DELETE" });
    if (res.ok) {
      showToast("Cleared all history records", "success");
      fetchHistory();
    }
  } catch (err) {
    showToast("Clear failed", "error");
  }
}

// Export JSON
function exportScheduleJson() {
  if (!state.currentSchedule) {
    showToast("No active schedule to export", "info");
    return;
  }
  const blob = new Blob([JSON.stringify(state.currentSchedule, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `schedule_${state.currentSchedule.algorithm.toLowerCase().replace(/[^a-z0-9]/g, "_")}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Exported schedule JSON file!", "success");
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================
// ALL UI EVENT LISTENERS
// ==========================================
function setupEventListeners() {
  // Cyberpunk Audio FX Toggle
  const btnToggleAudio = document.getElementById("btnToggleAudio");
  if (btnToggleAudio) {
    btnToggleAudio.addEventListener("click", () => {
      const isEnabled = audio.toggle();
      showToast(isEnabled ? "🔊 Cyberpunk Sound FX Enabled" : "🔇 Sound FX Muted", "info");
    });
  }

  // Auto Freeze High-RAM Leaks button
  const btnAutoFreeze = document.getElementById("btnAutoFreezeLeaks");
  if (btnAutoFreeze) {
    btnAutoFreeze.addEventListener("click", async () => {
      await autoFreezeHighRamLeaks();
    });
  }

  // Retry health click
  document.getElementById("serverStatus").addEventListener("click", () => {
    document.getElementById("serverStatus").className = "status-badge checking";
    document.getElementById("serverStatusText").textContent = "Checking...";
    checkBackendHealth();
  });

  // Vercel / Cloud URL Toggle
  const btnToggleConfig = document.getElementById("btnToggleServerConfig");
  const vercelCard = document.getElementById("vercelConfigCard");
  const customInput = document.getElementById("customApiUrlInput");
  
  if (btnToggleConfig && vercelCard) {
    btnToggleConfig.addEventListener("click", () => {
      const isVisible = vercelCard.style.display !== "none";
      vercelCard.style.display = isVisible ? "none" : "flex";
      if (!isVisible && customInput) {
        customInput.value = localStorage.getItem("ai_scheduler_api_base") || "http://127.0.0.1:5000/api";
      }
    });
  }

  // Save Vercel API button
  const btnSaveApi = document.getElementById("btnSaveApiUrl");
  if (btnSaveApi && customInput) {
    btnSaveApi.addEventListener("click", () => {
      const url = customInput.value.trim();
      setApiBase(url);
      showToast(`API URL updated: ${getApiBase()}`, "success");
      checkBackendHealth();
      fetchRealChromeData(false, false);
      if (vercelCard) vercelCard.style.display = "none";
    });
  }

  // Reset Localhost API button
  const btnResetApi = document.getElementById("btnResetLocalApi");
  if (btnResetApi) {
    btnResetApi.addEventListener("click", () => {
      setApiBase("");
      if (customInput) customInput.value = "http://127.0.0.1:5000/api";
      showToast("Reset to Localhost: 127.0.0.1:5000", "info");
      checkBackendHealth();
      fetchRealChromeData(false, false);
      if (vercelCard) vercelCard.style.display = "none";
    });
  }

  // Real-Time Chrome Banner Buttons
  document.getElementById("btnSyncChrome").addEventListener("click", async () => {
    await fetchRealChromeData(false, true);
    showToast(`Synced ${state.tasks.length} live Chrome tabs & processes!`, "success");
  });

  document.getElementById("btnScheduleChromeNow").addEventListener("click", async () => {
    await fetchRealChromeData(true, true);
  });

  document.getElementById("toggleLiveStream").addEventListener("change", (e) => {
    if (e.target.checked) {
      startLiveStreamPolling();
      showToast("Live streaming active (2.5s)", "info");
    } else {
      if (state.chromeLive.streamTimer) clearInterval(state.chromeLive.streamTimer);
      showToast("Live stream paused", "info");
    }
  });

  // Candlestick Toolbar Controls
  const btnCandlePlay = document.getElementById("btnCandlePlay");
  if (btnCandlePlay) {
    btnCandlePlay.addEventListener("click", async () => {
      await toggleSimulation();
    });
  }

  const btnCandleStep = document.getElementById("btnCandleStep");
  if (btnCandleStep) {
    btnCandleStep.addEventListener("click", () => {
      stepSimulation();
    });
  }

  const btnCandleReset = document.getElementById("btnCandleReset");
  if (btnCandleReset) {
    btnCandleReset.addEventListener("click", () => {
      resetSimulation();
      showToast("Candles & clock reset", "info");
    });
  }

  const candleSpeed = document.getElementById("candleSpeedSelect");
  if (candleSpeed) {
    candleSpeed.addEventListener("change", (e) => {
      state.simulation.speedMs = parseInt(e.target.value);
      if (state.simulation.isPlaying) {
        clearInterval(state.simulation.timer);
        state.simulation.timer = setInterval(tickSimulation, state.simulation.speedMs);
      }
    });
  }

  // Candlestick Buttons
  const btnPulse = document.getElementById("btnCandlePulse");
  if (btnPulse) btnPulse.addEventListener("click", triggerCandlePulseWave);

  const btnSyncCandle = document.getElementById("btnSyncCandleChrome");
  if (btnSyncCandle) {
    btnSyncCandle.addEventListener("click", async () => {
      await fetchRealChromeData(false, true);
      renderCandlesticks(state.tasks);
      showToast("Synced Candlesticks with Chrome processes!", "success");
    });
  }

  // Chrome Process Details buttons
  document.getElementById("btnFetchChromeProcs").addEventListener("click", fetchChromeProcessesDetails);
  document.getElementById("btnImportAllChrome").addEventListener("click", importCheckedChromeProcs);
  document.getElementById("selectAllChromeProcs").addEventListener("change", (e) => {
    document.querySelectorAll(".chrome-proc-cb").forEach(cb => cb.checked = e.target.checked);
  });

  // Algorithm select changes
  const algSelect = document.getElementById("algorithmSelect");
  algSelect.addEventListener("change", () => {
    const isRR = algSelect.value === "rr";
    document.getElementById("quantumGroup").style.display = isRR ? "flex" : "none";
  });

  // Presets select
  document.getElementById("presetSelect").addEventListener("change", (e) => {
    const key = e.target.value;
    if (PRESETS[key]) {
      state.tasks = JSON.parse(JSON.stringify(PRESETS[key]));
      renderTaskTable();
      renderCandlesticks(state.tasks);
      showToast(`Loaded "${e.target.options[e.target.selectedIndex].text}" preset!`, "success");
    }
  });

  // Add Task
  document.getElementById("btnAddTask").addEventListener("click", () => {
    const nextIdx = state.tasks.length + 1;
    state.tasks.push({
      name: `Chrome Tab #${nextIdx}`,
      arrival: 0,
      burst: 4,
      priority: 2,
      is_real_chrome: true
    });
    renderTaskTable();
    renderCandlesticks(state.tasks);
  });

  // Clear All
  document.getElementById("btnClearAll").addEventListener("click", () => {
    if (state.tasks.length === 0) return;
    state.tasks = [];
    renderTaskTable();
    renderCandlesticks(state.tasks);
    showToast("Cleared queue", "info");
  });

  // Randomize Tasks
  document.getElementById("btnRandomize").addEventListener("click", () => {
    const names = ["Chrome: YouTube 4K Stream", "Chrome: GitHub Pull Request", "Chrome: WebGL 3D Canvas", "Chrome: ChatGPT Workspace", "Chrome: Stack Overflow", "Chrome: Gmail Client"];
    const count = 5;
    state.tasks = [];
    for (let i = 0; i < count; i++) {
      state.tasks.push({
        name: names[i % names.length],
        arrival: Math.floor(Math.random() * 3),
        burst: Math.floor(Math.random() * 8) + 2,
        priority: Math.floor(Math.random() * 3) + 1,
        is_real_chrome: true
      });
    }
    renderTaskTable();
    renderCandlesticks(state.tasks);
    showToast("Generated realistic browser tasks", "info");
  });

  // AI Auto-Estimate All Empty/Zero Fields
  document.getElementById("btnAiAutoPredict").addEventListener("click", handleAiAutoPredictAll);

  // Schedule Buttons
  document.getElementById("btnRunSchedule").addEventListener("click", handleRunSchedule);
  document.getElementById("btnCompareAll").addEventListener("click", handleCompareAll);
  document.getElementById("btnRefreshCompare").addEventListener("click", handleCompareAll);

  // Export JSON
  document.getElementById("btnExportJson").addEventListener("click", exportScheduleJson);

  // Full Tab Button
  document.getElementById("btnOpenNewTab").addEventListener("click", () => {
    if (window.chrome && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
    } else {
      window.open(window.location.href, "_blank");
    }
  });

  // History buttons
  document.getElementById("btnRefreshHistory").addEventListener("click", fetchHistory);
  document.getElementById("btnClearHistory").addEventListener("click", clearAllHistory);

  // System Process buttons
  document.getElementById("btnFetchSystemProcs").addEventListener("click", fetchSystemProcesses);
  document.getElementById("btnImportSelected").addEventListener("click", importSelectedProcesses);
  document.getElementById("selectAllProcs").addEventListener("change", (e) => {
    document.querySelectorAll(".proc-checkbox").forEach(cb => cb.checked = e.target.checked);
  });

  // Simulation controls
  document.getElementById("btnSimPlay").addEventListener("click", toggleSimulation);
  document.getElementById("btnSimStep").addEventListener("click", stepSimulation);
  document.getElementById("btnSimReset").addEventListener("click", resetSimulation);
  document.getElementById("simSpeedSelect").addEventListener("change", (e) => {
    state.simulation.speedMs = parseInt(e.target.value);
    if (state.simulation.isPlaying) {
      clearInterval(state.simulation.timer);
      state.simulation.timer = setInterval(tickSimulation, state.simulation.speedMs);
    }
  });
}

// ========================================================
// AI PROCESS TUTOR BOT CONTROLLER
// ========================================================
function setupAiTutor() {
  const btnOpen = document.getElementById("btnOpenAiTutor");
  const btnClose = document.getElementById("btnCloseAiTutor");
  const drawer = document.getElementById("aiTutorDrawer");
  const form = document.getElementById("tutorChatForm");
  const input = document.getElementById("tutorInputText");
  const container = document.getElementById("tutorMessagesContainer");
  const chips = document.querySelectorAll(".tutor-chip");

  if (!btnOpen || !drawer) return;

  btnOpen.addEventListener("click", () => {
    const isVisible = drawer.style.display !== "none";
    drawer.style.display = isVisible ? "none" : "flex";
    if (!isVisible && input) {
      input.focus();
      audio.playContextSwitch();
    }
  });

  if (btnClose) {
    btnClose.addEventListener("click", () => {
      drawer.style.display = "none";
    });
  }

  // Quick Chips
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      const q = chip.dataset.q;
      if (q) {
        if (input) input.value = q;
        submitTutorMessage(q);
      }
    });
  });

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input ? input.value.trim() : "";
      if (!text) return;
      submitTutorMessage(text);
      if (input) input.value = "";
    });
  }

  async function submitTutorMessage(text) {
    appendChatMessage(text, "user");

    const loadingId = "bot-loading-" + Date.now();
    appendChatMessage("Analyzing question & OS state...", "bot", loadingId);

    const currentApi = getApiBase();
    try {
      const res = await fetch(`${currentApi}/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          algorithm: document.getElementById("algorithmSelect")?.value || "ai",
          num_cores: parseInt(document.getElementById("cpuCoresSelect")?.value) || 4,
          tasks: state.tasks,
          anomalies: state.anomalies
        })
      });

      const data = await res.json();
      const botReply = data.response || "Mera server response generate nahi kar saka. Please dobara poochhein.";
      
      const loadingEl = document.getElementById(loadingId);
      if (loadingEl) {
        loadingEl.innerHTML = formatMarkdown(botReply);
      }
      audio.playContextSwitch();
    } catch (err) {
      const loadingEl = document.getElementById(loadingId);
      if (loadingEl) {
        loadingEl.innerHTML = `⚠️ Assistant network notice: Could not reach backend at ${currentApi}.`;
      }
    }

    if (container) container.scrollTop = container.scrollHeight;
  }

  function appendChatMessage(content, sender, id = null) {
    if (!container) return;
    const div = document.createElement("div");
    div.className = `tutor-msg ${sender}`;
    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";
    if (id) bubble.id = id;
    bubble.innerHTML = sender === "user" ? escapeHtml(content) : formatMarkdown(content);
    div.appendChild(bubble);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function formatMarkdown(text) {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n\n/g, "<br><br>")
      .replace(/\n/g, "<br>");
  }
}
