/**
 * Image Optimization Service
 * Handles image optimization, responsive images, and lazy loading
 */

const cloudinary = require('cloudinary').v2;
const CONSTANTS = require('../config/constants');

class ImageOptimizationService {
  constructor() {
    this.config = {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
      defaultTransformations: {
        quality: 'auto',
        fetch_format: 'auto',
        crop: 'scale'
      },
      responsiveBreakpoints: [
        { width: 320, height: 240, suffix: 'xs' },
        { width: 640, height: 480, suffix: 'sm' },
        { width: 1024, height: 768, suffix: 'md' },
        { width: 1920, height: 1080, suffix: 'lg' },
        { width: 2560, height: 1440, suffix: 'xl' }
      ],
      lazyLoading: {
        enabled: true,
        placeholder: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1lcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TG9hZGluZy4uLjwvdGV4dD48L3N2Zz4='
      }
    };

    // Configure Cloudinary
    if (this.config.cloudName && this.config.apiKey && this.config.apiSecret) {
      cloudinary.config({
        cloud_name: this.config.cloudName,
        api_key: this.config.apiKey,
        api_secret: this.config.apiSecret
      });
    }
  }

  /**
   * Upload image to Cloudinary with optimization
   */
  async uploadImage(file, options = {}) {
    try {
      const uploadOptions = {
        ...this.config.defaultTransformations,
        ...options,
        resource_type: 'image'
      };

      const result = await cloudinary.uploader.upload(file.path, uploadOptions);
      
      return {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        optimizedUrl: this.getOptimizedUrl(result.public_id, options)
      };
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Generate optimized image URL
   */
  getOptimizedUrl(publicId, options = {}) {
    const transformations = {
      ...this.config.defaultTransformations,
      ...options
    };

    return cloudinary.url(publicId, {
      secure: true,
      transformation: transformations
    });
  }

  /**
   * Generate responsive image URLs
   */
  getResponsiveUrls(publicId, options = {}) {
    const urls = {};
    
    this.config.responsiveBreakpoints.forEach(breakpoint => {
      urls[breakpoint.suffix] = this.getOptimizedUrl(publicId, {
        ...options,
        width: breakpoint.width,
        height: breakpoint.height,
        crop: 'fill'
      });
    });

    return urls;
  }

  /**
   * Generate srcset for responsive images
   */
  getSrcset(publicId, options = {}) {
    const srcset = this.config.responsiveBreakpoints.map(breakpoint => {
      const url = this.getOptimizedUrl(publicId, {
        ...options,
        width: breakpoint.width,
        height: breakpoint.height,
        crop: 'fill'
      });
      return `${url} ${breakpoint.width}w`;
    });

    return srcset.join(', ');
  }

  /**
   * Generate lazy loading image HTML
   */
  generateLazyImage(publicId, options = {}) {
    const {
      alt = 'Product image',
      className = 'lazy-image',
      sizes = '(max-width: 768px) 100vw, 50vw',
      ...imageOptions
    } = options;

    const srcset = this.getSrcset(publicId, imageOptions);
    const placeholder = this.config.lazyLoading.placeholder;
    const optimizedUrl = this.getOptimizedUrl(publicId, {
      ...imageOptions,
      width: 320,
      height: 240,
      crop: 'fill'
    });

    return `
      <img 
        src="${placeholder}"
        data-src="${optimizedUrl}"
        data-srcset="${srcset}"
        data-sizes="${sizes}"
        alt="${alt}"
        class="${className}"
        loading="lazy"
        onload="this.classList.remove('lazy-image'); this.classList.add('loaded');"
      />
    `;
  }

  /**
   * Generate optimized product image
   */
  generateProductImage(product, options = {}) {
    const {
      size = 'md',
      lazy = true,
      className = 'product-image',
      ...imageOptions
    } = options;

    if (!product.images || product.images.length === 0) {
      return this.getPlaceholderImage(size);
    }

    const imageUrl = product.images[0];
    const publicId = this.extractPublicId(imageUrl);

    if (!publicId) {
      // If not a Cloudinary image, return original with optimization
      return this.generateFallbackImage(imageUrl, options);
    }

    if (lazy) {
      return this.generateLazyImage(publicId, {
        alt: product.name,
        className,
        ...imageOptions
      });
    }

    const optimizedUrl = this.getOptimizedUrl(publicId, {
      ...imageOptions,
      ...this.getSizeOptions(size)
    });

    return `
      <img 
        src="${optimizedUrl}"
        alt="${product.name}"
        class="${className}"
        loading="lazy"
      />
    `;
  }

  /**
   * Generate optimized hero image
   */
  generateHeroImage(imageUrl, options = {}) {
    const {
      alt = 'Hero image',
      className = 'hero-image',
      lazy = false,
      ...imageOptions
    } = options;

    const publicId = this.extractPublicId(imageUrl);

    if (!publicId) {
      return this.generateFallbackImage(imageUrl, options);
    }

    const optimizedUrl = this.getOptimizedUrl(publicId, {
      ...imageOptions,
      width: 1920,
      height: 1080,
      crop: 'fill',
      quality: 'auto:best'
    });

    return `
      <img 
        src="${optimizedUrl}"
        alt="${alt}"
        class="${className}"
        loading="${lazy ? 'lazy' : 'eager'}"
      />
    `;
  }

  /**
   * Generate optimized thumbnail
   */
  generateThumbnail(publicId, options = {}) {
    return this.getOptimizedUrl(publicId, {
      width: 150,
      height: 150,
      crop: 'fill',
      quality: 'auto:good',
      ...options
    });
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  extractPublicId(url) {
    if (!url || !url.includes('cloudinary.com')) {
      return null;
    }

    try {
      const urlParts = url.split('/');
      const uploadIndex = urlParts.findIndex(part => part === 'upload');
      if (uploadIndex === -1) return null;

      const publicIdParts = urlParts.slice(uploadIndex + 2);
      const publicId = publicIdParts.join('/').split('.')[0];
      return publicId;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get size options for different breakpoints
   */
  getSizeOptions(size) {
    const sizes = {
      xs: { width: 320, height: 240 },
      sm: { width: 640, height: 480 },
      md: { width: 1024, height: 768 },
      lg: { width: 1920, height: 1080 },
      xl: { width: 2560, height: 1440 }
    };

    return sizes[size] || sizes.md;
  }

  /**
   * Generate placeholder image
   */
  getPlaceholderImage(size = 'md') {
    const { width, height } = this.getSizeOptions(size);
    return `https://via.placeholder.com/${width}x${height}/f0f0f0/999999?text=No+Image`;
  }

  /**
   * Generate fallback image for non-Cloudinary images
   */
  generateFallbackImage(imageUrl, options = {}) {
    const {
      alt = 'Image',
      className = 'fallback-image',
      lazy = true
    } = options;

    return `
      <img 
        src="${imageUrl}"
        alt="${alt}"
        class="${className}"
        loading="${lazy ? 'lazy' : 'eager'}"
      />
    `;
  }

  /**
   * Optimize existing image URLs
   */
  optimizeImageUrl(imageUrl, options = {}) {
    const publicId = this.extractPublicId(imageUrl);
    
    if (!publicId) {
      return imageUrl; // Return original if not Cloudinary
    }

    return this.getOptimizedUrl(publicId, options);
  }

  /**
   * Batch optimize image URLs
   */
  optimizeImageUrls(imageUrls, options = {}) {
    return imageUrls.map(url => this.optimizeImageUrl(url, options));
  }

  /**
   * Generate WebP version of image
   */
  getWebPUrl(publicId, options = {}) {
    return this.getOptimizedUrl(publicId, {
      ...options,
      fetch_format: 'webp'
    });
  }

  /**
   * Generate picture element with multiple formats
   */
  generatePictureElement(publicId, options = {}) {
    const {
      alt = 'Image',
      className = 'optimized-image',
      sizes = '(max-width: 768px) 100vw, 50vw',
      ...imageOptions
    } = options;

    const webpSrcset = this.getSrcset(publicId, {
      ...imageOptions,
      fetch_format: 'webp'
    });

    const jpgSrcset = this.getSrcset(publicId, {
      ...imageOptions,
      fetch_format: 'jpg'
    });

    const fallbackUrl = this.getOptimizedUrl(publicId, {
      ...imageOptions,
      fetch_format: 'jpg'
    });

    return `
      <picture class="${className}">
        <source srcset="${webpSrcset}" sizes="${sizes}" type="image/webp">
        <source srcset="${jpgSrcset}" sizes="${sizes}" type="image/jpeg">
        <img src="${fallbackUrl}" alt="${alt}" loading="lazy">
      </picture>
    `;
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Image deletion error:', error);
      return false;
    }
  }

  /**
   * Get image statistics
   */
  async getImageStats(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        size: result.bytes,
        url: result.secure_url,
        createdAt: result.created_at
      };
    } catch (error) {
      console.error('Image stats error:', error);
      return null;
    }
  }
}

module.exports = ImageOptimizationService; 