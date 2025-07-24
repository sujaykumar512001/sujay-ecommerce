/**
 * SEO Middleware
 * Enhanced SEO functionality with configuration, validation, and security
 */

/**
 * SEO Configuration
 */
const seoConfig = {
  site: {
    name: process.env.SEO_SITE_NAME || 'Ecommerce Store',
    url: process.env.SEO_SITE_URL || 'https://localhost:9000',
    brand: process.env.SEO_BRAND_NAME || 'Ecommerce Brand',
    currency: process.env.SEO_CURRENCY || 'USD',
    language: process.env.SEO_LANGUAGE || 'en-US'
  },
  defaults: {
    title: process.env.SEO_DEFAULT_TITLE || 'Premium Fashion & Handmade Art',
    description: process.env.SEO_DEFAULT_DESCRIPTION || 'Discover premium fashion and handmade art. Quality clothing, accessories, and unique handmade pieces.',
    keywords: process.env.SEO_DEFAULT_KEYWORDS || 'fashion, handmade art, clothing, accessories, premium fashion, online shopping, ecommerce',
    ogImage: process.env.SEO_DEFAULT_OG_IMAGE || '/images/og-image.jpg',
    maxDescriptionLength: parseInt(process.env.SEO_MAX_DESCRIPTION_LENGTH) || 160,
    maxKeywords: parseInt(process.env.SEO_MAX_KEYWORDS) || 10,
    minWordLength: parseInt(process.env.SEO_MIN_WORD_LENGTH) || 2
  },
  security: {
    sanitizeHtml: process.env.SEO_SANITIZE_HTML !== 'false',
    maxInputLength: parseInt(process.env.SEO_MAX_INPUT_LENGTH) || 10000,
    allowedHtmlTags: process.env.SEO_ALLOWED_HTML_TAGS?.split(',') || ['p', 'br', 'strong', 'em', 'b', 'i']
  }
};

/**
 * Validate configuration
 */
const validateConfig = () => {
  if (!seoConfig.site.url) {
    throw new Error('SEO_SITE_URL environment variable is required');
  }
  
  if (!seoConfig.site.name) {
    throw new Error('SEO_SITE_NAME environment variable is required');
  }
};

/**
 * Sanitize HTML content for security
 */
const sanitizeHtml = (html) => {
  if (!seoConfig.security.sanitizeHtml) {
    return html;
  }

  // Remove all HTML tags except allowed ones
  const allowedTags = seoConfig.security.allowedHtmlTags.join('|');
  const regex = new RegExp(`<(?!\/?(?:${allowedTags})\b)[^>]+>`, 'gi');
  return html.replace(regex, '');
};

/**
 * Validate and sanitize input text
 */
const validateAndSanitizeText = (text, maxLength = seoConfig.defaults.maxDescriptionLength) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Check input length
  if (text.length > seoConfig.security.maxInputLength) {
    throw new Error(`Input text too long. Maximum allowed: ${seoConfig.security.maxInputLength} characters`);
  }

  // Sanitize HTML
  const sanitized = sanitizeHtml(text);
  
  // Trim and limit length
  return sanitized.trim().substring(0, maxLength);
};

/**
 * Generate SEO-friendly slugs
 * Enhanced with validation and error handling
 */
function generateSlug(text = '') {
  try {
    const sanitizedText = validateAndSanitizeText(text, 200);
    
    if (!sanitizedText) {
      return 'untitled';
    }

    return sanitizedText
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 100); // Limit slug length
  } catch (error) {
    console.error('Slug generation error:', error.message);
    return 'untitled';
  }
}

/**
 * Generate meta description
 * Enhanced with validation and smart truncation
 */
function generateDescription(text = '', maxLength = seoConfig.defaults.maxDescriptionLength) {
  try {
    const cleanText = validateAndSanitizeText(text, maxLength);
    
    if (!cleanText) {
      return seoConfig.defaults.description;
    }

    // Smart truncation - try to break at word boundary
    if (cleanText.length > maxLength) {
      const truncated = cleanText.substring(0, maxLength - 3);
      const lastSpace = truncated.lastIndexOf(' ');
      
      if (lastSpace > maxLength * 0.8) { // If we can break at a word boundary
        return truncated.substring(0, lastSpace) + '...';
      }
      
      return truncated + '...';
    }

    return cleanText;
  } catch (error) {
    console.error('Description generation error:', error.message);
    return seoConfig.defaults.description;
  }
}

/**
 * Generate keywords
 * Enhanced with better stop words and validation
 */
function generateKeywords(text = '', additionalKeywords = []) {
  try {
    const sanitizedText = validateAndSanitizeText(text, 5000);
    
    // Extended stop words list
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
      'am', 'is', 'are', 'was', 'were', 'being', 'been', 'have', 'has', 'had', 'having',
      'do', 'does', 'did', 'doing', 'will', 'would', 'could', 'should', 'shall', 'may', 'might', 'must'
    ]);

    const words = sanitizedText
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => 
        word.length >= seoConfig.defaults.minWordLength && 
        !stopWords.has(word) &&
        !/^\d+$/.test(word) // Exclude pure numbers
      );

    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    const keywords = Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, seoConfig.defaults.maxKeywords)
      .map(([word]) => word);

    // Filter and validate additional keywords
    const validAdditionalKeywords = additionalKeywords
      .filter(keyword => 
        keyword && 
        typeof keyword === 'string' && 
        keyword.length >= seoConfig.defaults.minWordLength &&
        keyword.length <= 50
      )
      .map(keyword => keyword.toLowerCase().trim());

    const allKeywords = [...new Set([...keywords, ...validAdditionalKeywords])];
    return allKeywords.join(', ');
  } catch (error) {
    console.error('Keywords generation error:', error.message);
    return seoConfig.defaults.keywords;
  }
}

/**
 * Build canonical URL
 */
const buildCanonicalUrl = (path = '') => {
  const baseUrl = seoConfig.site.url.replace(/\/$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  return `${baseUrl}/${cleanPath}`;
};

/**
 * Build structured data for products
 */
const buildProductStructuredData = (product) => {
  if (!product) return null;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name || 'Product',
    "description": generateDescription(product.description || '', 200),
    "image": product.images?.[0] || buildCanonicalUrl(seoConfig.defaults.ogImage),
    "brand": {
      "@type": "Brand",
      "name": seoConfig.site.brand
    },
    "category": product.category || '',
    "offers": {
      "@type": "Offer",
      "price": product.price || 0,
      "priceCurrency": seoConfig.site.currency,
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "url": buildCanonicalUrl(`products/${product.slug || product._id}`)
    }
  };

  // Add additional product properties if available
  if (product.sku) structuredData.sku = product.sku;
  if (product.weight) structuredData.weight = product.weight;
  if (product.dimensions) structuredData.dimensions = product.dimensions;
  if (product.rating) structuredData.aggregateRating = {
    "@type": "AggregateRating",
    "ratingValue": product.rating,
    "reviewCount": product.reviewCount || 0
  };

  return structuredData;
};

/**
 * Build structured data for categories
 */
const buildCategoryStructuredData = (category, url) => {
  if (!category) return null;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${category} Collection`,
    "description": `${category} products at ${seoConfig.site.brand}`,
    "url": url,
    "brand": {
      "@type": "Brand",
      "name": seoConfig.site.brand
    }
  };
};

/**
 * Global SEO defaults middleware
 * Enhanced with configuration and validation
 */
function seoMiddleware(req, res, next) {
  try {
    validateConfig();

    // Add utility functions to res.locals
    res.locals.generateSlug = generateSlug;
    res.locals.generateDescription = generateDescription;
    res.locals.generateKeywords = generateKeywords;
    res.locals.buildCanonicalUrl = buildCanonicalUrl;

    // Set default SEO data
    res.locals.seo = {
      title: seoConfig.defaults.title,
      description: seoConfig.defaults.description,
      keywords: seoConfig.defaults.keywords,
      ogImage: buildCanonicalUrl(seoConfig.defaults.ogImage),
      canonical: buildCanonicalUrl(req.originalUrl),
      structuredData: null,
      siteName: seoConfig.site.name,
      siteUrl: seoConfig.site.url,
      language: seoConfig.site.language
    };

    next();
  } catch (error) {
    console.error('SEO middleware error:', error.message);
    // Continue without SEO data rather than failing the request
    next();
  }
}

/**
 * Product-specific SEO middleware
 * Enhanced with validation and error handling
 */
function productSEOMiddleware(req, res, next) {
  try {
    validateConfig();

    const product = req.product;
    if (product) {
      const name = validateAndSanitizeText(product.name || 'Product', 100);
      const description = product.description || '';
      const image = product.images?.[0] || seoConfig.defaults.ogImage;
      const slug = product.slug || product._id;

      res.locals.seo = {
        title: `${name} - ${seoConfig.site.brand}`,
        description: generateDescription(description, seoConfig.defaults.maxDescriptionLength),
        keywords: generateKeywords(description, [
          name, 
          product.category || '', 
          'fashion', 
          'handmade art', 
          seoConfig.site.brand
        ]),
        ogImage: buildCanonicalUrl(image),
        canonical: buildCanonicalUrl(`products/${slug}`),
        structuredData: buildProductStructuredData(product),
        siteName: seoConfig.site.name,
        siteUrl: seoConfig.site.url,
        language: seoConfig.site.language
      };
    }

    next();
  } catch (error) {
    console.error('Product SEO middleware error:', error.message);
    next();
  }
}

/**
 * Category-specific SEO middleware
 * Enhanced with validation and error handling
 */
function categorySEOMiddleware(req, res, next) {
  try {
    validateConfig();

    const category = req.query.category;
    if (category) {
      const sanitizedCategory = validateAndSanitizeText(category, 50);
      const lowerCategory = sanitizedCategory.toLowerCase();
      const categoryUrl = buildCanonicalUrl(`products?category=${encodeURIComponent(sanitizedCategory)}`);

      res.locals.seo = {
        title: `${sanitizedCategory} - ${seoConfig.site.brand}`,
        description: `Shop the best ${lowerCategory} at ${seoConfig.site.brand}. Quality products, competitive prices, and excellent customer service.`,
        keywords: `${sanitizedCategory}, fashion, handmade art, ${seoConfig.site.brand}, online shopping`,
        ogImage: buildCanonicalUrl(seoConfig.defaults.ogImage),
        canonical: categoryUrl,
        structuredData: buildCategoryStructuredData(sanitizedCategory, categoryUrl),
        siteName: seoConfig.site.name,
        siteUrl: seoConfig.site.url,
        language: seoConfig.site.language
      };
    }

    next();
  } catch (error) {
    console.error('Category SEO middleware error:', error.message);
    next();
  }
}

/**
 * Get SEO configuration (admin function)
 */
const getSEOConfig = () => {
  return {
    ...seoConfig,
    site: {
      ...seoConfig.site,
      url: seoConfig.site.url // Don't expose sensitive config
    }
  };
};

/**
 * Update SEO configuration (admin function)
 */
const updateSEOConfig = (newConfig) => {
  // Only allow updating certain fields
  const allowedUpdates = ['defaults', 'security'];
  
  allowedUpdates.forEach(key => {
    if (newConfig[key]) {
      seoConfig[key] = { ...seoConfig[key], ...newConfig[key] };
    }
  });
};

module.exports = {
  seoMiddleware,
  productSEOMiddleware,
  categorySEOMiddleware,
  generateSlug,
  generateDescription,
  generateKeywords,
  buildCanonicalUrl,
  buildProductStructuredData,
  buildCategoryStructuredData,
  getSEOConfig,
  updateSEOConfig,
  seoConfig
};
