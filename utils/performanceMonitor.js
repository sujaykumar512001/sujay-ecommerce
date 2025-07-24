/**
 * Performance Monitor - Track async operations and performance metrics
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.activeTimers = new Map()
  }

  /**
   * Start timing an operation
   * @param {string} operation - Operation name
   * @param {Object} metadata - Additional metadata
   */
  startTimer(operation, metadata = {}) {
    const timerId = `${operation}_${Date.now()}_${Math.random()}`
    this.activeTimers.set(timerId, {
      operation,
      startTime: process.hrtime.bigint(),
      metadata
    })
    return timerId
  }

  /**
   * End timing an operation
   * @param {string} timerId - Timer ID returned from startTimer
   * @param {Object} result - Operation result
   */
  endTimer(timerId, result = {}) {
    const timer = this.activeTimers.get(timerId)
    if (!timer) {
      console.warn(`Timer ${timerId} not found`)
      return
    }

    const endTime = process.hrtime.bigint()
    const duration = Number(endTime - timer.startTime) / 1000000 // Convert to milliseconds

    // Store metrics
    if (!this.metrics.has(timer.operation)) {
      this.metrics.set(timer.operation, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        lastResult: null
      })
    }

    const metric = this.metrics.get(timer.operation)
    metric.count++
    metric.totalTime += duration
    metric.avgTime = metric.totalTime / metric.count
    metric.minTime = Math.min(metric.minTime, duration)
    metric.maxTime = Math.max(metric.maxTime, duration)
    metric.lastResult = result

    this.activeTimers.delete(timerId)

    // Log slow operations
    if (duration > 1000) { // Log operations taking more than 1 second
      console.warn(`Slow operation detected: ${timer.operation} took ${duration.toFixed(2)}ms`)
    }
  }

  /**
   * Get performance metrics
   * @param {string} operation - Specific operation (optional)
   * @returns {Object} Performance metrics
   */
  getMetrics(operation = null) {
    if (operation) {
      return this.metrics.get(operation) || null
    }

    const result = {}
    for (const [key, value] of this.metrics.entries()) {
      result[key] = { ...value }
    }
    return result
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    this.metrics.clear()
    this.activeTimers.clear()
  }

  /**
   * Get summary statistics
   * @returns {Object} Summary statistics
   */
  getSummary() {
    const operations = Array.from(this.metrics.keys())
    const totalOperations = operations.reduce((sum, op) => sum + this.metrics.get(op).count, 0)
    const avgTime = operations.reduce((sum, op) => sum + this.metrics.get(op).avgTime, 0) / operations.length || 0

    return {
      totalOperations,
      uniqueOperations: operations.length,
      averageTime: avgTime,
      slowestOperation: operations.reduce((slowest, op) => {
        const metric = this.metrics.get(op)
        return metric.maxTime > (this.metrics.get(slowest)?.maxTime || 0) ? op : slowest
      }, null)
    }
  }

  /**
   * Async wrapper for monitoring operations
   * @param {string} operation - Operation name
   * @param {Function} asyncFn - Async function to monitor
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<any>} Function result
   */
  async monitor(operation, asyncFn, metadata = {}) {
    const timerId = this.startTimer(operation, metadata)
    
    try {
      const result = await asyncFn()
      this.endTimer(timerId, { success: true, result })
      return result
    } catch (error) {
      this.endTimer(timerId, { success: false, error: error.message })
      throw error
    }
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor()

module.exports = performanceMonitor 