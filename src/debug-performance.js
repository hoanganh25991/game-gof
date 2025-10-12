/**
 * Performance Debugging Tool
 * Helps identify bottlenecks in the update loop
 */

export class PerformanceProfiler {
  constructor() {
    this.measurements = {};
    this.enabled = false;
  }

  enable() {
    this.enabled = true;
    console.info('[Profiler] Enabled - measurements will be logged every 60 frames');
  }

  disable() {
    this.enabled = false;
  }

  startMeasure(name) {
    if (!this.enabled) return;
    if (!this.measurements[name]) {
      this.measurements[name] = { total: 0, count: 0, max: 0 };
    }
    this.measurements[name].startTime = performance.now();
  }

  endMeasure(name) {
    if (!this.enabled) return;
    const measurement = this.measurements[name];
    if (!measurement || !measurement.startTime) return;
    
    const duration = performance.now() - measurement.startTime;
    measurement.total += duration;
    measurement.count++;
    measurement.max = Math.max(measurement.max, duration);
    delete measurement.startTime;
  }

  report() {
    if (!this.enabled || Object.keys(this.measurements).length === 0) return;

    const results = {};
    let totalTime = 0;

    for (const [name, data] of Object.entries(this.measurements)) {
      if (data.count === 0) continue;
      const avg = data.total / data.count;
      results[name] = {
        avg: avg.toFixed(3) + 'ms',
        max: data.max.toFixed(3) + 'ms',
        count: data.count
      };
      totalTime += data.total;
    }

    console.table(results);
    console.info(`[Profiler] Total measured time: ${totalTime.toFixed(2)}ms across ${Object.keys(results).length} operations`);

    // Reset measurements
    this.measurements = {};
  }
}

// Global profiler instance
const profiler = new PerformanceProfiler();

// Expose to window for easy access
if (typeof window !== 'undefined') {
  window.__perfProfiler = profiler;
  window.enableProfiling = () => {
    profiler.enable();
    console.info('Performance profiling enabled. Call window.__perfProfiler.report() to see results.');
  };
  window.disableProfiling = () => profiler.disable();
}

export default profiler;
