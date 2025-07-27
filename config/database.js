const mongoose = require('mongoose');

/**
 * DatabaseService
 * Handles MongoDB connection, retry logic, status, and graceful shutdown.
 */
class DatabaseService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.connectionOptions = this.buildConnectionOptions();
    this.eventListeners = [];
  }

  /**
   * Build Mongoose connection options
   */
  buildConnectionOptions() {
    return {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE) || 1,
      connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT) || 10000,
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT) || 45000,
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT) || 10000,
      bufferCommands: false,
      retryWrites: true,
      retryReads: true,
      maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME) || 30000,
      heartbeatFrequencyMS: parseInt(process.env.MONGODB_HEARTBEAT_FREQUENCY) || 10000,
      ssl: process.env.MONGODB_SSL === 'true',
      tlsAllowInvalidCertificates: process.env.MONGODB_SSL_VALIDATE === 'false',
      authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
      w: process.env.MONGODB_WRITE_CONCERN || 'majority',
      journal: process.env.MONGODB_JOURNAL === 'true'
    };
  }

  /**
   * Validate MongoDB URI
   */
  getMongoUri() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';
    if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
      throw new Error('❌ Invalid MongoDB URI. Must start with mongodb:// or mongodb+srv://');
    }
    return uri;
  }

  /**
   * Connect with retry logic
   */
  async connect() {
    const maxRetries = parseInt(process.env.MONGODB_MAX_RETRIES) || 3;
    const retryDelay = parseInt(process.env.MONGODB_RETRY_DELAY) || 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const uri = this.getMongoUri();
        // Connecting to MongoDB
        // Database URI masked for security

        this.setupEventListeners();

        this.connection = await mongoose.connect(uri, this.connectionOptions);
        this.isConnected = true;

        // MongoDB connected successfully
        return this.connection;
      } catch (err) {
        console.error(`❌ Connection attempt ${attempt} failed: ${err.message}`);
        if (attempt >= maxRetries) {
          throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts`);
        }
        const backoff = retryDelay * Math.pow(2, attempt - 1);
        // Retrying database connection
        await new Promise((res) => setTimeout(res, backoff));
      }
    }
  }

  /**
   * Setup Mongoose connection events
   */
  setupEventListeners() {
    const events = [
      ['connected', () => {
        // MongoDB connected successfully
        this.isConnected = true;
      }],
      ['disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
        this.isConnected = false;
      }],
      ['reconnected', () => {
        // MongoDB reconnected
        this.isConnected = true;
      }],
      ['error', (err) => {
        console.error('❌ MongoDB error:', err.message);
        this.isConnected = false;
        this.handleError(err);
      }],
      ['close', () => {
        // MongoDB connection closed
        this.isConnected = false;
      }]
    ];

    events.forEach(([event, handler]) => {
      mongoose.connection.on(event, handler);
      this.eventListeners.push({ event, handler });
    });
  }

  /**
   * Cleanup event listeners
   */
  cleanupEventListeners() {
    this.eventListeners.forEach(({ event, handler }) => {
      mongoose.connection.off(event, handler);
    });
    this.eventListeners = [];
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (this.isConnected && mongoose.connection.readyState !== 0) {
      this.cleanupEventListeners();
      await mongoose.disconnect();
      this.isConnected = false;
      // MongoDB disconnected cleanly
    }
  }

  /**
   * Graceful shutdown handler
   */
  async gracefulShutdown() {
    // Initiating graceful shutdown
    await this.disconnect();
    // Database shutdown complete
  }

  /**
   * Handle specific MongoDB errors
   */
  handleError(err) {
    switch (err.name) {
      case 'MongoNetworkError':
        console.error('🔌 Network issue - ensure MongoDB is reachable');
        break;
      case 'MongoServerSelectionError':
        console.error('🔍 Server selection failed - check cluster/URI');
        break;
      case 'MongoAuthenticationError':
        console.error('🔐 Auth failed - check credentials');
        break;
      case 'MongoParseError':
        console.error('📛 URI parsing failed');
        break;
      default:
        console.error('❗ Unknown MongoDB error');
    }
  }

  /**
   * Get database health status
   */
  async healthCheck() {
    try {
      if (!this.isConnected) return { status: 'disconnected' };

      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      const time = Date.now() - start;

      return {
        status: 'healthy',
        responseTime: `${time}ms`,
        timestamp: new Date().toISOString(),
        details: this.getStatus()
      };
    } catch (err) {
      return {
        status: 'unhealthy',
        message: err.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get current connection status
   */
  getStatus() {
    const conn = mongoose.connection;
    return {
      isConnected: this.isConnected,
      readyState: this.getStateName(conn.readyState),
      host: conn.host || 'unknown',
      port: conn.port || 'unknown',
      name: conn.name || 'unknown',
      poolSize: conn.poolSize || 0,
      maxPoolSize: this.connectionOptions.maxPoolSize
    };
  }

  /**
   * Convert readyState to readable name
   */
  getStateName(state) {
    return ['disconnected', 'connected', 'connecting', 'disconnecting'][state] || 'unknown';
  }

  /**
   * Mask MongoDB URI for logging
   */
  maskUri(uri) {
    try {
      const url = new URL(uri);
      if (url.password) url.password = '***';
      return url.toString();
    } catch {
      return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    }
  }
}

const db = new DatabaseService();

// Handle graceful shutdown
['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, async () => {
    // Received shutdown signal
    await db.gracefulShutdown();
    process.exit(0);
  });
});

module.exports = db;
