/**
 * Settings -> Info tab
 * Shows live FPS and renderer stats from three.js, plus WebGL context info.
 * Now includes GPU detection and utilization metrics.
 */
export function renderInfoTab(panelEl, ctx = {}) {
  const { renderer, getPerf, gpuDetector } = ctx;
  if (!panelEl || panelEl.dataset.rendered === "1") return;

  // Require static markup in index.html (css/info.css provides styles).
  // The shell should be present in the HTML; if it's missing, do nothing.
  if (!panelEl.querySelector(".perf-block")) {
    return;
  }

  // Query elements
  const el = (id) => panelEl.querySelector(id);
  const $fps = el("#perfFps");
  const $fpsLow = el("#perfFpsLow");
  const $avg = el("#perfAvgMs");
  const $ms = el("#perfMs");
  const $cpu = el("#perfCpu");
  const $calls = el("#perfCalls");
  const $tris = el("#perfTriangles");
  const $lines = el("#perfLines");
  const $pts = el("#perfPoints");
  const $geoms = el("#perfGeoms");
  const $tex = el("#perfTex");

  const $api = el("#glApi");
  const $aa = el("#glAA");
  const $power = el("#glPower");
  const $vendor = el("#glVendor");
  const $renderer = el("#glRenderer");

  // Memory UI elements (optional; only set if present)
  const $memUsed = el("#memUsed");
  const $memTotal = el("#memTotal");
  const $memPct = el("#memPct");
  const $memLimit = el("#memLimit");
  const $deviceMemory = el("#deviceMemory");

  // GPU UI elements
  const $gpuRenderer = el("#gpuRenderer");
  const $gpuVendor = el("#gpuVendor");
  const $gpuTier = el("#gpuTier");
  const $gpuWebGL = el("#gpuWebGL");
  const $gpuUsage = el("#gpuUsage");
  const $gpuMemory = el("#gpuMemory");
  const $gpuMaxTexture = el("#gpuMaxTexture");
  const $gpuWarnings = el("#gpuWarnings");
  const $gpuWarningsList = el("#gpuWarningsList");

  // Spatial Grid UI elements (Phase 2 optimization)
  const $spatialEnemies = el("#spatialEnemies");
  const $spatialCells = el("#spatialCells");
  const $spatialTotal = el("#spatialTotal");
  const $spatialWithout = el("#spatialWithout");
  const $spatialWith = el("#spatialWith");
  const $spatialEfficiency = el("#spatialEfficiency");

  // Initialize GPU detector and display static info
  if (gpuDetector) {
    try {
      const caps = gpuDetector.getCapabilities() || gpuDetector.detect();
      
      if (caps && caps.supported) {
        if ($gpuRenderer) $gpuRenderer.textContent = caps.renderer || 'Unknown';
        if ($gpuVendor) $gpuVendor.textContent = caps.vendor || 'Unknown';
        if ($gpuTier) {
          const tierText = caps.tier ? caps.tier.toUpperCase() : 'UNKNOWN';
          const tierColor = caps.tier === 'high' ? '#4CAF50' : caps.tier === 'medium' ? '#FF9800' : '#F44336';
          $gpuTier.textContent = tierText;
          $gpuTier.style.color = tierColor;
          $gpuTier.style.fontWeight = 'bold';
        }
        if ($gpuWebGL) $gpuWebGL.textContent = caps.webgl2 ? 'WebGL2 ✓' : 'WebGL1';
        if ($gpuMemory) $gpuMemory.textContent = `~${round(caps.estimatedMemoryMB / 1024, 1)} GB`;
        if ($gpuMaxTexture) $gpuMaxTexture.textContent = caps.maxTextureSize ? `${caps.maxTextureSize}px` : 'Unknown';
        
        // Display warnings if any
        const warnings = gpuDetector.getWarnings();
        if (warnings && warnings.length > 0 && $gpuWarnings && $gpuWarningsList) {
          $gpuWarnings.style.display = 'block';
          $gpuWarningsList.innerHTML = warnings.map(w => {
            const icon = w.level === 'critical' ? '🚫' : w.level === 'warning' ? '⚠️' : 'ℹ️';
            return `<div style="margin-bottom:4px;">${icon} <b>${w.message}</b>${w.suggestion ? `<br>&nbsp;&nbsp;&nbsp;→ ${w.suggestion}` : ''}</div>`;
          }).join('');
        }
      } else {
        if ($gpuRenderer) $gpuRenderer.textContent = 'Not supported';
        if ($gpuVendor) $gpuVendor.textContent = 'N/A';
        if ($gpuTier) {
          $gpuTier.textContent = 'NONE';
          $gpuTier.style.color = '#F44336';
        }
        if ($gpuWebGL) $gpuWebGL.textContent = 'Not available';
      }
    } catch (err) {
      console.warn('[Info] GPU detection failed:', err);
    }
  }

  // Static WebGL capability info
  try {
    if (renderer) {
      const caps = renderer.capabilities || {};
      const gl = renderer.getContext && renderer.getContext();
      const attrs = (gl && gl.getContextAttributes && gl.getContextAttributes()) || {};
      let vendor = "Unknown";
      let rendererName = "Unknown";
      try {
        const ext = gl && gl.getExtension && gl.getExtension("WEBGL_debug_renderer_info");
        vendor = gl && gl.getParameter && gl.getParameter(ext && ext.UNMASKED_VENDOR_WEBGL || (gl && gl.VENDOR)) || vendor;
        rendererName = gl && gl.getParameter && gl.getParameter(ext && ext.UNMASKED_RENDERER_WEBGL || (gl && gl.RENDERER)) || rendererName;
      } catch (_) {}

      if ($api) $api.textContent = caps.isWebGL2 ? "WebGL2" : "WebGL1";
      if ($aa) $aa.textContent = attrs.antialias ? "on" : "off";
      if ($power) $power.textContent = (renderer.getContext && renderer.getContext().getContextAttributes && renderer.getContext().getContextAttributes().powerPreference) || "high-performance";
      if ($vendor) $vendor.textContent = String(vendor);
      if ($renderer) $renderer.textContent = String(rendererName);
    }
  } catch (_) {}

  // CPU usage tracking - measures actual CPU time vs wall clock time
  let lastUpdateTime = performance.now();
  let lastIdleTime = 0;
  let cpuUsagePercent = 0;
  let cpuBusyTime = 0;
  let cpuTotalTime = 0;
  
  // Use requestIdleCallback to track idle time (when browser is not busy)
  function trackIdleTime() {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback((deadline) => {
        const idleDuration = deadline.timeRemaining();
        lastIdleTime = idleDuration;
        trackIdleTime(); // Continue tracking
      }, { timeout: 100 });
    }
  }
  trackIdleTime();

  // Live update loop
  function round(n, d = 0) {
    const m = Math.pow(10, d);
    return Math.round((Number.isFinite(n) ? n : 0) * m) / m;
  }
  function bytesToHuman(bytes) {
    const b = Number(bytes) || 0;
    const KB = 1024, MB = KB * 1024, GB = MB * 1024;
    if (b >= GB) return `${round(b / GB, 2)} GB`;
    if (b >= MB) return `${round(b / MB, 1)} MB`;
    if (b >= KB) return `${round(b / KB, 0)} KB`;
    return `${b} B`;
  }
  function update() {
    try {
      // Calculate CPU usage based on execution time vs wall clock time
      const now = performance.now();
      const wallClockDelta = now - lastUpdateTime;
      
      // Get performance metrics
      const perf = typeof getPerf === "function" ? getPerf() : (window.__perfMetrics || null);
      
      if (perf && perf.ms && wallClockDelta > 0) {
        // Estimate CPU usage: (frame time / wall clock time between updates) * 100
        // This gives us the percentage of time the CPU is actively working
        // Frame time represents active CPU work per frame
        // We multiply by FPS to get total CPU work time per second
        const fps = perf.fps || 60;
        const cpuWorkTime = perf.ms * fps; // Total ms of CPU work per second
        const rawCpuUsage = Math.min(100, (cpuWorkTime / 1000) * 100); // Convert to percentage
        
        // Smooth the value using exponential moving average
        cpuUsagePercent = cpuUsagePercent * 0.85 + rawCpuUsage * 0.15;
        
        // Clamp to 0-100% range
        cpuUsagePercent = Math.min(100, Math.max(0, cpuUsagePercent));
      }
      
      lastUpdateTime = now;
      
      if (perf) {
        if ($fps) $fps.textContent = String(round(perf.fps || 0, 1));
        if ($fpsLow) $fpsLow.textContent = String(round(perf.fpsLow1 || 0, 1));
        if ($avg) $avg.textContent = `${round(perf.avgMs || perf.ms || 0, 2)} ms`;
        if ($ms) $ms.textContent = `${round(perf.ms || perf.avgMs || 0, 2)} ms`;
        if ($cpu) $cpu.textContent = `${round(cpuUsagePercent, 1)}%`;

        const ri = perf.renderer || {};
        if ($calls) $calls.textContent = String(ri.calls || 0);
        if ($tris) $tris.textContent = String(ri.triangles || 0);
        if ($lines) $lines.textContent = String(ri.lines || 0);
        if ($pts) $pts.textContent = String(ri.points || 0);
        if ($geoms) $geoms.textContent = String(ri.geometries || (renderer?.info?.memory?.geometries || 0));
        if ($tex) $tex.textContent = String(ri.textures || (renderer?.info?.memory?.textures || 0));
      }

      // Memory usage (JS heap) and device memory (if supported)
      try {
        const mem = (typeof performance !== "undefined" && performance && performance.memory) ? performance.memory : null;
        if (mem) {
          const used = mem.usedJSHeapSize || 0;
          const total = mem.totalJSHeapSize || 0;
          const limit = mem.jsHeapSizeLimit || 0;
          const pct = limit ? (used / limit) * 100 : (total ? (used / total) * 100 : 0);
          if ($memUsed) $memUsed.textContent = bytesToHuman(used);
          if ($memTotal) $memTotal.textContent = total ? bytesToHuman(total) : "—";
          if ($memLimit) $memLimit.textContent = limit ? bytesToHuman(limit) : "—";
          if ($memPct) $memPct.textContent = `${round(pct, 1)}%`;
        } else {
          if ($memUsed) $memUsed.textContent = "—";
          if ($memTotal) $memTotal.textContent = "—";
          if ($memLimit) $memLimit.textContent = "—";
          if ($memPct) $memPct.textContent = "—";
        }
      } catch (_) {}

      try {
        const devMem = (typeof navigator !== "undefined" && navigator && typeof navigator.deviceMemory === "number") ? navigator.deviceMemory : null;
        if ($deviceMemory) $deviceMemory.textContent = devMem ? `${devMem} GB` : "—";
      } catch (_) {}

      // GPU usage estimation
      if (gpuDetector && $gpuUsage) {
        try {
          const frameTime = perf ? (perf.ms || perf.avgMs || 16.67) : 16.67;
          const gpuUtil = gpuDetector.getGPUUtilization(frameTime);
          if (gpuUtil && gpuUtil.estimated) {
            $gpuUsage.textContent = `~${round(gpuUtil.usage, 1)}% (est.)`;
            $gpuUsage.title = gpuUtil.note || '';
          } else {
            $gpuUsage.textContent = '—';
          }
        } catch (_) {
          if ($gpuUsage) $gpuUsage.textContent = '—';
        }
      }

      // Spatial Grid stats (Phase 2 optimization)
      if (perf && perf.spatialGrid) {
        const sg = perf.spatialGrid;
        if ($spatialEnemies) $spatialEnemies.textContent = String(sg.aliveEnemies || 0);
        if ($spatialCells) $spatialCells.textContent = String(sg.occupiedCells || 0);
        if ($spatialTotal) $spatialTotal.textContent = String(sg.totalEntities || 0);
        if ($spatialWithout) $spatialWithout.textContent = sg.efficiency ? String(sg.efficiency.withoutGrid || 0) : '—';
        if ($spatialWith) $spatialWith.textContent = sg.efficiency ? String(sg.efficiency.withGrid || 0) : '—';
        if ($spatialEfficiency) {
          const eff = sg.efficiency ? sg.efficiency.percentSaved : 0;
          $spatialEfficiency.textContent = `${round(eff, 1)}`;
          // Color code efficiency: green for good (>90%), yellow for medium (>70%), red for poor
          if (eff > 90) {
            $spatialEfficiency.style.color = '#4CAF50';
          } else if (eff > 70) {
            $spatialEfficiency.style.color = '#FF9800';
          } else {
            $spatialEfficiency.style.color = '#F44336';
          }
          $spatialEfficiency.style.fontWeight = 'bold';
        }
      } else {
        // No spatial grid data available
        if ($spatialEnemies) $spatialEnemies.textContent = '—';
        if ($spatialCells) $spatialCells.textContent = '—';
        if ($spatialTotal) $spatialTotal.textContent = '—';
        if ($spatialWithout) $spatialWithout.textContent = '—';
        if ($spatialWith) $spatialWith.textContent = '—';
        if ($spatialEfficiency) $spatialEfficiency.textContent = '—';
      }
    } catch (_) {}
  }

  // Bind interval once
  if (panelEl.dataset.bound !== "1") {
    const intv = setInterval(update, 300);
    // Store cleanup
    panelEl.dataset.bound = "1";
    panelEl.dataset.intv = String(intv);
    // Best-effort cleanup when panel removed
    const obs = new MutationObserver(() => {
      if (!document.body.contains(panelEl)) {
        try { clearInterval(Number(panelEl.dataset.intv)); } catch (_) {}
        try { obs.disconnect(); } catch (_) {}
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
  panelEl.dataset.rendered = "1";
  // Initial paint
  try { update(); } catch (_) {}
}
