/**
 * Asset Optimization Service
 * Handles CSS/JS minification, bundling, and cache busting
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class AssetOptimizationService {
  constructor() {
    this.config = {
      publicDir: path.join(__dirname, '../public'),
      assetsDir: path.join(__dirname, '../public/assets'),
      cacheDir: path.join(__dirname, '../cache'),
      version: process.env.ASSET_VERSION || '1.0.0',
      minify: process.env.NODE_ENV === 'production',
      cacheBusting: process.env.NODE_ENV === 'production',
      compression: {
        enabled: true,
        level: 6
      }
    };

    this.assetManifest = new Map();
    this.cache = new Map();
  }

  /**
   * Initialize asset optimization
   */
  async initialize() {
    try {
      // Create cache directory if it doesn't exist
      await this.ensureDirectoryExists(this.config.cacheDir);
      
      // Load existing manifest
      await this.loadAssetManifest();
      
      console.log('✅ Asset optimization service initialized');
    } catch (error) {
      console.error('❌ Asset optimization initialization failed:', error);
    }
  }

  /**
   * Minify CSS content
   */
  minifyCSS(css) {
    if (!this.config.minify) return css;

    return css
      // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove unnecessary whitespace
      .replace(/\s+/g, ' ')
      // Remove whitespace around certain characters
      .replace(/\s*([{}:;,>+~])\s*/g, '$1')
      // Remove trailing semicolons
      .replace(/;}/g, '}')
      // Remove leading/trailing whitespace
      .trim();
  }

  /**
   * Minify JavaScript content
   */
  minifyJS(js) {
    if (!this.config.minify) return js;

    return js
      // Remove single-line comments
      .replace(/\/\/.*$/gm, '')
      // Remove multi-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove unnecessary whitespace
      .replace(/\s+/g, ' ')
      // Remove whitespace around certain characters
      .replace(/\s*([{}:;,=+\-*/<>()[\]&|!])\s*/g, '$1')
      // Remove leading/trailing whitespace
      .trim();
  }

  /**
   * Generate cache busting hash
   */
  generateHash(content) {
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
  }

  /**
   * Process CSS file
   */
  async processCSS(filePath, options = {}) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const minified = this.minifyCSS(content);
      const hash = this.generateHash(minified);
      
      const processed = {
        original: content,
        minified: minified,
        hash: hash,
        size: {
          original: Buffer.byteLength(content, 'utf8'),
          minified: Buffer.byteLength(minified, 'utf8'),
          savings: Math.round((1 - Buffer.byteLength(minified, 'utf8') / Buffer.byteLength(content, 'utf8')) * 100)
        }
      };

      // Cache the result
      this.cache.set(filePath, processed);
      
      return processed;
    } catch (error) {
      console.error(`CSS processing error for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Process JavaScript file
   */
  async processJS(filePath, options = {}) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const minified = this.minifyJS(content);
      const hash = this.generateHash(minified);
      
      const processed = {
        original: content,
        minified: minified,
        hash: hash,
        size: {
          original: Buffer.byteLength(content, 'utf8'),
          minified: Buffer.byteLength(minified, 'utf8'),
          savings: Math.round((1 - Buffer.byteLength(minified, 'utf8') / Buffer.byteLength(content, 'utf8')) * 100)
        }
      };

      // Cache the result
      this.cache.set(filePath, processed);
      
      return processed;
    } catch (error) {
      console.error(`JS processing error for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Bundle multiple CSS files
   */
  async bundleCSS(files, outputPath, options = {}) {
    try {
      const bundles = [];
      
      for (const file of files) {
        const processed = await this.processCSS(file, options);
        bundles.push(processed.minified);
      }

      const bundled = bundles.join('\n');
      const hash = this.generateHash(bundled);
      const finalPath = this.config.cacheBusting ? 
        outputPath.replace('.css', `.${hash}.css`) : outputPath;

      // Write bundled file
      await this.ensureDirectoryExists(path.dirname(finalPath));
      await fs.writeFile(finalPath, bundled);

      return {
        path: finalPath,
        hash: hash,
        size: Buffer.byteLength(bundled, 'utf8'),
        files: files.length
      };
    } catch (error) {
      console.error('CSS bundling error:', error);
      throw error;
    }
  }

  /**
   * Bundle multiple JavaScript files
   */
  async bundleJS(files, outputPath, options = {}) {
    try {
      const bundles = [];
      
      for (const file of files) {
        const processed = await this.processJS(file, options);
        bundles.push(processed.minified);
      }

      const bundled = bundles.join(';');
      const hash = this.generateHash(bundled);
      const finalPath = this.config.cacheBusting ? 
        outputPath.replace('.js', `.${hash}.js`) : outputPath;

      // Write bundled file
      await this.ensureDirectoryExists(path.dirname(finalPath));
      await fs.writeFile(finalPath, bundled);

      return {
        path: finalPath,
        hash: hash,
        size: Buffer.byteLength(bundled, 'utf8'),
        files: files.length
      };
    } catch (error) {
      console.error('JS bundling error:', error);
      throw error;
    }
  }

  /**
   * Generate asset URL with cache busting
   */
  generateAssetUrl(assetPath, options = {}) {
    const { hash, version } = options;
    
    if (this.config.cacheBusting && hash) {
      const ext = path.extname(assetPath);
      const base = assetPath.replace(ext, '');
      return `${base}.${hash}${ext}`;
    }
    
    if (version) {
      return `${assetPath}?v=${version}`;
    }
    
    return assetPath;
  }

  /**
   * Generate critical CSS for above-the-fold content
   */
  async generateCriticalCSS(cssFiles, criticalSelectors = []) {
    try {
      const allCSS = [];
      
      for (const file of cssFiles) {
        const processed = await this.processCSS(file);
        allCSS.push(processed.minified);
      }

      const fullCSS = allCSS.join('\n');
      
      // Extract critical CSS based on selectors
      const criticalCSS = this.extractCriticalCSS(fullCSS, criticalSelectors);
      
      return {
        critical: criticalCSS,
        full: fullCSS,
        size: {
          critical: Buffer.byteLength(criticalCSS, 'utf8'),
          full: Buffer.byteLength(fullCSS, 'utf8'),
          savings: Math.round((1 - Buffer.byteLength(criticalCSS, 'utf8') / Buffer.byteLength(fullCSS, 'utf8')) * 100)
        }
      };
    } catch (error) {
      console.error('Critical CSS generation error:', error);
      throw error;
    }
  }

  /**
   * Extract critical CSS based on selectors
   */
  extractCriticalCSS(css, selectors) {
    if (!selectors || selectors.length === 0) {
      return css;
    }

    const criticalRules = [];
    const lines = css.split('}');
    
    for (const line of lines) {
      const rule = line.trim();
      if (!rule) continue;
      
      const hasCriticalSelector = selectors.some(selector => 
        rule.includes(selector)
      );
      
      if (hasCriticalSelector) {
        criticalRules.push(rule + '}');
      }
    }
    
    return criticalRules.join('\n');
  }

  /**
   * Generate asset manifest
   */
  async generateAssetManifest() {
    try {
      const manifest = {
        version: this.config.version,
        timestamp: new Date().toISOString(),
        assets: {}
      };

      // Process CSS files
      const cssFiles = await this.findFiles(this.config.publicDir, '.css');
      for (const file of cssFiles) {
        const processed = await this.processCSS(file);
        const relativePath = path.relative(this.config.publicDir, file);
        manifest.assets[relativePath] = {
          hash: processed.hash,
          size: processed.size,
          type: 'css'
        };
      }

      // Process JS files
      const jsFiles = await this.findFiles(this.config.publicDir, '.js');
      for (const file of jsFiles) {
        const processed = await this.processJS(file);
        const relativePath = path.relative(this.config.publicDir, file);
        manifest.assets[relativePath] = {
          hash: processed.hash,
          size: processed.size,
          type: 'js'
        };
      }

      // Save manifest
      const manifestPath = path.join(this.config.cacheDir, 'asset-manifest.json');
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

      this.assetManifest = new Map(Object.entries(manifest.assets));
      
      return manifest;
    } catch (error) {
      console.error('Asset manifest generation error:', error);
      throw error;
    }
  }

  /**
   * Load asset manifest
   */
  async loadAssetManifest() {
    try {
      const manifestPath = path.join(this.config.cacheDir, 'asset-manifest.json');
      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestData);
      
      this.assetManifest = new Map(Object.entries(manifest.assets));
      return manifest;
    } catch (error) {
      // Manifest doesn't exist, create it
      return await this.generateAssetManifest();
    }
  }

  /**
   * Get asset info
   */
  getAssetInfo(assetPath) {
    return this.assetManifest.get(assetPath) || null;
  }

  /**
   * Generate optimized asset URL
   */
  getOptimizedAssetUrl(assetPath) {
    const assetInfo = this.getAssetInfo(assetPath);
    
    if (!assetInfo) {
      return assetPath;
    }

    return this.generateAssetUrl(assetPath, {
      hash: assetInfo.hash,
      version: this.config.version
    });
  }

  /**
   * Generate HTML for optimized assets
   */
  generateAssetHTML(assets, options = {}) {
    const { criticalCSS = false, defer = false } = options;
    let html = '';

    // Critical CSS
    if (criticalCSS && assets.criticalCSS) {
      html += `<style>${assets.criticalCSS}</style>\n`;
    }

    // CSS files
    if (assets.css) {
      for (const css of assets.css) {
        const url = this.getOptimizedAssetUrl(css);
        html += `<link rel="stylesheet" href="${url}">\n`;
      }
    }

    // JavaScript files
    if (assets.js) {
      for (const js of assets.js) {
        const url = this.getOptimizedAssetUrl(js);
        const deferAttr = defer ? ' defer' : '';
        html += `<script src="${url}"${deferAttr}></script>\n`;
      }
    }

    return html;
  }

  /**
   * Find files by extension
   */
  async findFiles(dir, ext) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          const subFiles = await this.findFiles(fullPath, ext);
          files.push(...subFiles);
        } else if (item.isFile() && item.name.endsWith(ext)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
    
    return files;
  }

  /**
   * Ensure directory exists
   */
  async ensureDirectoryExists(dir) {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('✅ Asset cache cleared');
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats() {
    let totalOriginalSize = 0;
    let totalMinifiedSize = 0;
    let totalFiles = 0;

    for (const [filePath, processed] of this.cache) {
      totalOriginalSize += processed.size.original;
      totalMinifiedSize += processed.size.minified;
      totalFiles++;
    }

    const totalSavings = totalOriginalSize > 0 ? 
      Math.round((1 - totalMinifiedSize / totalOriginalSize) * 100) : 0;

    return {
      files: totalFiles,
      originalSize: totalOriginalSize,
      minifiedSize: totalMinifiedSize,
      savings: totalSavings,
      savingsBytes: totalOriginalSize - totalMinifiedSize
    };
  }

  /**
   * Optimize all assets
   */
  async optimizeAllAssets() {
    try {
      console.log('🔄 Starting asset optimization...');
      
      // Find all CSS and JS files
      const cssFiles = await this.findFiles(this.config.publicDir, '.css');
      const jsFiles = await this.findFiles(this.config.publicDir, '.js');
      
      console.log(`Found ${cssFiles.length} CSS files and ${jsFiles.length} JS files`);
      
      // Process CSS files
      for (const file of cssFiles) {
        await this.processCSS(file);
      }
      
      // Process JS files
      for (const file of jsFiles) {
        await this.processJS(file);
      }
      
      // Generate manifest
      await this.generateAssetManifest();
      
      const stats = this.getOptimizationStats();
      console.log('✅ Asset optimization completed:', stats);
      
      return stats;
    } catch (error) {
      console.error('❌ Asset optimization failed:', error);
      throw error;
    }
  }
}

module.exports = AssetOptimizationService; 