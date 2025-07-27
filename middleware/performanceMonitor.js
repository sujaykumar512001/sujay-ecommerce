/**
 * Performance Monitoring Middleware
 * Tracks response times, database queries, and performance metrics
 */

const performanceConfig = {
  enabled: process.env.PERFORMANCE_MONITORING_ENABLED !== 'false',
  logLevel: process.env.PERFORMANCE_LOG_LEVEL || 'info',
  slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000, // 1 second
  slowResponseThreshold: parseInt(process.env.SLOW_RESPONSE_THRESHOLD) || 2000, // 2 seconds
  includeQueryDetails: process.env.PERFORMANCE_INCLUDE_QUERIES === 'true',
  includeHeaders: process.env.PERFORMANCE_INCLUDE_HEADERS === 'true',
  maxLogSize: parseInt(process.env.PERFORMANCE_MAX_LOG_SIZE) || 1000
};

// Performance metrics storage
const performanceMetrics = {
  requests: new Map(),
  slowQueries: [],
  slowResponses: [],
  errors: [],
  cacheHits: 0,
  cacheMisses: 0
};

/**
 * Performance monitoring middleware
 */
const performanceMonitor = (req, res, next) => {
  if (!performanceConfig.enabled) {
    return next();
  }

  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Store request start time
  performanceMetrics.requests.set(requestId, {
    startTime,
    url: req.url,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    userId: req.user?.id
  });

  // Monitor response
  res.on('finish', () => {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Get request data
    const requestData = performanceMetrics.requests.get(requestId);
    if (requestData) {
      performanceMetrics.requests.delete(requestId);
    }

    // Log slow responses
    if (responseTime > performanceConfig.slowResponseThreshold) {
      const slowResponse = {
        requestId,
        url: req.url,
        method: req.method,
        responseTime,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString(),
        ...requestData
      };

      performanceMetrics.slowResponses.push(slowResponse);
      
      // Keep only recent slow responses
      if (performanceMetrics.slowResponses.length > performanceConfig.maxLogSize) {
        performanceMetrics.slowResponses.shift();
      }

      console.warn('🐌 Slow Response Detected:', {
        url: req.url,
        method: req.method,
        responseTime: `${responseTime}ms`,
        statusCode: res.statusCode
      });
    }

    // Log performance metrics
    if (performanceConfig.logLevel === 'debug') {
      // Performance metrics logged by service
      console.log('📊 Performance Metrics:', {
        requestId,
        url: req.url,
        method: req.method,
        responseTime: `${responseTime}ms`,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Add performance headers
  res.set('X-Response-Time', `${Date.now() - startTime}ms`);
  res.set('X-Request-ID', requestId);

  next();
};

/**
 * Database query monitoring
 */
const queryMonitor = (req, res, next) => {
  if (!performanceConfig.enabled || !performanceConfig.includeQueryDetails) {
    return next();
  }

  const originalQuery = mongoose.Query.prototype.exec;
  const queryStartTimes = new Map();

  mongoose.Query.prototype.exec = function() {
    const queryId = generateQueryId();
    const startTime = Date.now();
    
    queryStartTimes.set(queryId, startTime);

    return originalQuery.apply(this, arguments).then(result => {
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      // Log slow queries
      if (queryTime > performanceConfig.slowQueryThreshold) {
        const slowQuery = {
          queryId,
          query: this.getQuery(),
          collection: this.mongooseCollection.name,
          queryTime,
          timestamp: new Date().toISOString(),
          url: req.url,
          method: req.method
        };

        performanceMetrics.slowQueries.push(slowQuery);
        
        // Keep only recent slow queries
        if (performanceMetrics.slowQueries.length > performanceConfig.maxLogSize) {
          performanceMetrics.slowQueries.shift();
        }

        console.warn('🐌 Slow Query Detected:', {
          collection: this.mongooseCollection.name,
          queryTime: `${queryTime}ms`,
          query: JSON.stringify(this.getQuery())
        });
      }

      queryStartTimes.delete(queryId);
      return result;
    }).catch(error => {
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      console.error('❌ Query Error:', {
        collection: this.mongooseCollection.name,
        queryTime: `${queryTime}ms`,
        error: error.message,
        query: JSON.stringify(this.getQuery())
      });

      queryStartTimes.delete(queryId);
      throw error;
    });
  };

  next();
};

/**
 * Cache monitoring
 */
const cacheMonitor = {
  hit: () => {
    if (performanceConfig.enabled) {
      performanceMetrics.cacheHits++;
    }
  },
  
  miss: () => {
    if (performanceConfig.enabled) {
      performanceMetrics.cacheMisses++;
    }
  }
};

/**
 * Get performance statistics
 */
const getPerformanceStats = () => {
  const totalRequests = performanceMetrics.requests.size;
  const slowResponsesCount = performanceMetrics.slowResponses.length;
  const slowQueriesCount = performanceMetrics.slowQueries.length;
  const errorsCount = performanceMetrics.errors.length;
  
  const cacheHitRate = performanceMetrics.cacheHits + performanceMetrics.cacheMisses > 0
    ? (performanceMetrics.cacheHits / (performanceMetrics.cacheHits + performanceMetrics.cacheMisses)) * 100
    : 0;

  return {
    activeRequests: totalRequests,
    slowResponses: slowResponsesCount,
    slowQueries: slowQueriesCount,
    errors: errorsCount,
    cacheHits: performanceMetrics.cacheHits,
    cacheMisses: performanceMetrics.cacheMisses,
    cacheHitRate: `${cacheHitRate.toFixed(2)}%`,
    timestamp: new Date().toISOString()
  };
};

/**
 * Get detailed performance data
 */
const getDetailedPerformanceData = () => {
  return {
    stats: getPerformanceStats(),
    slowResponses: performanceMetrics.slowResponses.slice(-10), // Last 10
    slowQueries: performanceMetrics.slowQueries.slice(-10), // Last 10
    errors: performanceMetrics.errors.slice(-10) // Last 10
  };
};

/**
 * Clear performance data
 */
const clearPerformanceData = () => {
  performanceMetrics.requests.clear();
  performanceMetrics.slowQueries.length = 0;
  performanceMetrics.slowResponses.length = 0;
  performanceMetrics.errors.length = 0;
  performanceMetrics.cacheHits = 0;
  performanceMetrics.cacheMisses = 0;
};

/**
 * Generate unique request ID
 */
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate unique query ID
 */
const generateQueryId = () => {
  return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Performance monitoring routes (for admin access)
 */
const performanceRoutes = (req, res) => {
  const { detailed = 'false' } = req.query;
  
  if (detailed === 'true') {
    res.json({
      success: true,
      data: getDetailedPerformanceData()
    });
  } else {
    res.json({
      success: true,
      data: getPerformanceStats()
    });
  }
};

/**
 * Clear performance data route
 */
const clearPerformanceRoute = (req, res) => {
  clearPerformanceData();
  res.json({
    success: true,
    message: 'Performance data cleared successfully'
  });
};

module.exports = {
  performanceMonitor,
  queryMonitor,
  cacheMonitor,
  getPerformanceStats,
  getDetailedPerformanceData,
  clearPerformanceData,
  performanceRoutes,
  clearPerformanceRoute
}; 