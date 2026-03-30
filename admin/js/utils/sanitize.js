// ============================================
// INPUT SANITIZATION UTILITIES
// utils/sanitize.js
// ============================================

/**
 * Sanitize text input to prevent XSS attacks
 * @param {string} str - Input string to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/javascript:/gi, "")
        .replace(/on\w+\s*=/gi, "")
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .trim();
}

/**
 * Sanitize and validate number input
 * @param {any} val - Value to sanitize
 * @returns {number|null} - Validated number or null
 */
export function sanitizeNumber(val) {
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
}

/**
 * Sanitize and validate integer input
 * @param {any} val - Value to sanitize
 * @returns {number|null} - Validated integer or null
 */
export function sanitizeInteger(val) {
    const num = parseInt(val);
    return isNaN(num) ? null : num;
}

/**
 * Validate product name
 * @param {string} name - Product name to validate
 * @returns {object} - Validation result
 */
export function validateProductName(name) {
    const errors = [];
    const sanitizedName = sanitizeInput(name);
    
    if (!sanitizedName || sanitizedName.trim() === '') {
        errors.push('Product name is required');
    } else {
        if (sanitizedName.length < 2) {
            errors.push('Product name must be at least 2 characters');
        }
        if (sanitizedName.length > 100) {
            errors.push('Product name must be less than 100 characters');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors,
        sanitized: sanitizedName
    };
}

/**
 * Validate product price
 * @param {any} price - Price to validate
 * @returns {object} - Validation result
 */
export function validateProductPrice(price) {
    const errors = [];
    const sanitizedPrice = sanitizeNumber(price);
    
    if (sanitizedPrice === null) {
        errors.push('Price must be a valid number');
    } else {
        if (sanitizedPrice <= 0) {
            errors.push('Price must be greater than 0');
        }
        if (sanitizedPrice > 999999.99) {
            errors.push('Price must be less than 1,000,000');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors,
        sanitized: sanitizedPrice
    };
}

/**
 * Validate product stock
 * @param {any} stock - Stock to validate
 * @returns {object} - Validation result
 */
export function validateProductStock(stock) {
    const errors = [];
    const sanitizedStock = sanitizeInteger(stock);
    
    if (sanitizedStock === null) {
        errors.push('Stock must be a valid number');
    } else {
        if (sanitizedStock < 0) {
            errors.push('Stock cannot be negative');
        }
        if (sanitizedStock > 999999) {
            errors.push('Stock must be less than 1,000,000');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors,
        sanitized: sanitizedStock
    };
}

/**
 * Validate product description
 * @param {string} description - Description to validate
 * @returns {object} - Validation result
 */
export function validateProductDescription(description) {
    const errors = [];
    const sanitizedDescription = sanitizeInput(description);
    
    if (sanitizedDescription && sanitizedDescription.length > 1000) {
        errors.push('Description must be less than 1000 characters');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors,
        sanitized: sanitizedDescription
    };
}

/**
 * Validate complete product data
 * @param {object} product - Product data to validate
 * @returns {object} - Complete validation result
 */
export function validateProduct(product) {
    const results = {
        isValid: true,
        errors: [],
        sanitized: {}
    };
    
    // Validate name
    const nameValidation = validateProductName(product.name);
    results.sanitized.name = nameValidation.sanitized;
    if (!nameValidation.isValid) {
        results.isValid = false;
        results.errors.push(...nameValidation.errors);
    }
    
    // Validate price
    const priceValidation = validateProductPrice(product.price);
    results.sanitized.price = priceValidation.sanitized;
    if (!priceValidation.isValid) {
        results.isValid = false;
        results.errors.push(...priceValidation.errors);
    }
    
    // Validate stock
    const stockValidation = validateProductStock(product.stock);
    results.sanitized.stock = stockValidation.sanitized;
    if (!stockValidation.isValid) {
        results.isValid = false;
        results.errors.push(...stockValidation.errors);
    }
    
    // Validate description (optional)
    const descValidation = validateProductDescription(product.description);
    results.sanitized.description = descValidation.sanitized;
    if (!descValidation.isValid) {
        results.isValid = false;
        results.errors.push(...descValidation.errors);
    }
    
    // Category validation (will be checked against available categories)
    if (!product.category || product.category.trim() === '') {
        results.isValid = false;
        results.errors.push('Category is required');
        results.sanitized.category = product.category;
    } else {
        results.sanitized.category = sanitizeInput(product.category);
    }
    
    return results;
}
