const mongoose = require('mongoose');

/**
 * Database Configuration
 * Handles MongoDB connection and configuration
 */
class DatabaseService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.connectionOptions = this.getConnectionOptions();
    this.eventListeners = [];
  }

  /**
   * Get connection options from environment variables
   */
  getConnectionOptions() {
    return {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE) || 1,
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT) || 10000,
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT) || 45000,
      connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT) || 10000,
      bufferCommands: false,
      retryWrites: true,
      retryReads: true,
      maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME) || 30000,
      heartbeatFrequencyMS: parseInt(process.env.MONGODB_HEARTBEAT_FREQUENCY) || 10000,
      // Security options
      ssl: process.env.MONGODB_SSL === 'true',
      tlsAllowInvalidCertificates: process.env.MONGODB_SSL_VALIDATE === 'false',
      // Authentication
      authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
      // Write concern
      w: process.env.MONGODB_WRITE_CONCERN || 'majority',
      journal: process.env.MONGODB_JOURNAL === 'true'
    };
  }

  /**
   * Validate environment variables
   */
  validateEnvironment() {
    const requiredVars = ['MONGODB_URI'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn(`⚠️ Missing MongoDB environment variables: ${missingVars.join(', ')}`);
      console.warn('⚠️ Using default local MongoDB connection');
      return false;
    }
    
    return true;
  }

  /**
   * Get MongoDB URI with validation
   */
  getMongoUri() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';
    
    // Validate URI format
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
    }
    
    return mongoUri;
  }

  /**
   * Setup connection event listeners
   */
  setupEventListeners() {
    const connection = mongoose.connection;
    
    const listeners = [
      {
        event: 'error',
        handler: (err) => {
          console.error('❌ MongoDB connection error:', err.message);
          this.isConnected = false;
          this.handleConnectionError(err);
        }
      },
      {
        event: 'disconnected',
        handler: () => {
          console.log('⚠️ MongoDB disconnected');
          this.isConnected = false;
        }
      },
      {
        event: 'reconnected',
        handler: () => {
          console.log('✅ MongoDB reconnected');
          this.isConnected = true;
        }
      },
      {
        event: 'connected',
        handler: () => {
          console.log('✅ MongoDB connected');
          this.isConnected = true;
        }
      },
      {
        event: 'close',
        handler: () => {
          console.log('🔒 MongoDB connection closed');
          this.isConnected = false;
        }
      }
    ];

    // Add listeners and store references for cleanup
    listeners.forEach(({ event, handler }) => {
      connection.on(event, handler);
      this.eventListeners.push({ event, handler });
    });
  }

  /**
   * Handle connection errors
   */
  handleConnectionError(error) {
    // Log specific error types
    if (error.name === 'MongoNetworkError') {
      console.error('❌ Network error - check if MongoDB is running');
    } else if (error.name === 'MongoServerSelectionError') {
      console.error('❌ Server selection error - check MongoDB URI and network');
    } else if (error.name === 'MongoParseError') {
      console.error('❌ URI parsing error - check MongoDB connection string');
    } else if (error.name === 'MongoAuthenticationError') {
      console.error('❌ Authentication error - check username/password');
    }
  }

  /**
   * Connect to MongoDB with retry logic
   */
  async connect() {
    try {
      // Validate environment
      this.validateEnvironment();
      
      const maxRetries = parseInt(process.env.MONGODB_MAX_RETRIES) || 3;
      const retryDelay = parseInt(process.env.MONGODB_RETRY_DELAY) || 2000;
      let retryCount = 0;
      
      while (retryCount < maxRetries) {
        try {
          const mongoUri = this.getMongoUri();
          
          console.log(`🔄 Attempting MongoDB connection (attempt ${retryCount + 1}/${maxRetries})...`);
          console.log(`📍 URI: ${this.maskUri(mongoUri)}`);
          
          // Setup event listeners before connecting
          this.setupEventListeners();
          
          this.connection = await mongoose.connect(mongoUri, this.connectionOptions);
          this.isConnected = true;
          
          console.log('✅ MongoDB connected successfully');
          console.log(`📊 Connection pool size: ${this.connectionOptions.maxPoolSize}`);
          
          return this.connection;
          
        } catch (error) {
          retryCount++;
          console.error(`❌ MongoDB connection failed (attempt ${retryCount}/${maxRetries}):`, error.message);
          
          if (retryCount >= maxRetries) {
            console.error('❌ Max retries reached. MongoDB connection failed.');
            throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts: ${error.message}`);
          }
          
          // Wait before retrying with exponential backoff
          const delay = retryDelay * Math.pow(2, retryCount - 1);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      console.error('❌ Database connection error:', error.message);
      throw error;
    }
  }

  /**
   * Mask sensitive information in URI for logging
   */
  maskUri(uri) {
    try {
      const url = new URL(uri);
      if (url.password) {
        url.password = '***';
      }
      return url.toString();
    } catch {
      return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.connection && mongoose.connection.readyState !== 0) {
        // Remove event listeners to prevent memory leaks
        this.cleanupEventListeners();
        
        await mongoose.disconnect();
        this.isConnected = false;
        this.connection = null;
        console.log('✅ MongoDB disconnected successfully');
      }
    } catch (error) {
      console.error('❌ MongoDB disconnect error:', error.message);
      throw error;
    }
  }

  /**
   * Cleanup event listeners
   */
  cleanupEventListeners() {
    const connection = mongoose.connection;
    this.eventListeners.forEach(({ event, handler }) => {
      connection.off(event, handler);
    });
    this.eventListeners = [];
  }

  /**
   * Get connection status
   */
  getStatus() {
    const connection = mongoose.connection;
    return {
      isConnected: this.isConnected,
      readyState: connection.readyState,
      readyStateText: this.getReadyStateText(connection.readyState),
      host: connection.host || 'unknown',
      port: connection.port || 'unknown',
      name: connection.name || 'unknown',
      poolSize: connection.poolSize || 0,
      maxPoolSize: this.connectionOptions.maxPoolSize
    };
  }

  /**
   * Get human-readable ready state
   */
  getReadyStateText(readyState) {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[readyState] || 'unknown';
  }

  /**
   * Health check with detailed information
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { 
          status: 'disconnected', 
          message: 'Database not connected',
          timestamp: new Date().toISOString()
        };
      }
      
      // Ping the database
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - startTime;
      
      return { 
        status: 'healthy', 
        message: 'Database connection is healthy',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        connectionInfo: this.getStatus()
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown() {
    console.log('🔄 Starting graceful database shutdown...');
    
    try {
      await this.disconnect();
      console.log('✅ Database shutdown completed');
    } catch (error) {
      console.error('❌ Error during database shutdown:', error.message);
      throw error;
    }
  }
}

// Create and export singleton instance
const databaseService = new DatabaseService();

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await databaseService.gracefulShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await databaseService.gracefulShutdown();
  process.exit(0);
});

module.exports = databaseService; 