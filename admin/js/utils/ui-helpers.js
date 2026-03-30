// ============================================
// UI HELPERS - LOADING STATES & ERROR MESSAGES
// utils/ui-helpers.js
// ============================================

// ─────────────────────────────────────────
// ASYNC TIMEOUT WRAPPER
// ─────────────────────────────────────────
export function withTimeout(promise, ms = 10000, label = "Operation") {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    );
    return Promise.race([promise, timeout]);
}

// ─────────────────────────────────────────
// FORM SUBMISSION LOCK
// ─────────────────────────────────────────
export function lockForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.querySelectorAll("button, input, select, textarea")
        .forEach(el => el.disabled = true);
    form.dataset.locked = "true";
}

export function unlockForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.querySelectorAll("button, input, select, textarea")
        .forEach(el => el.disabled = false);
    delete form.dataset.locked;
}

export function isFormLocked(formId) {
    return document.getElementById(formId)?.dataset.locked === "true";
}

// ─────────────────────────────────────────
// DEBOUNCED SEARCH
// ─────────────────────────────────────────
export function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Show skeleton loader for a section
 * @param {string} sectionId - Section element ID
 * @param {number} rows - Number of skeleton rows to show
 */
export function showSkeleton(sectionId, rows = 5) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    const skeletonHTML = Array(rows).fill('').map(() => `
        <div class="skeleton-row">
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-button"></div>
        </div>
    `).join('');
    
    section.innerHTML = `
        <div class="skeleton-container">
            ${skeletonHTML}
        </div>
    `;
}

/**
 * Hide skeleton loader and show real content
 * @param {string} sectionId - Section element ID
 * @param {string} content - Real content to show
 */
export function hideSkeleton(sectionId, content = '') {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    section.innerHTML = content;
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success' | 'error' | 'warning'
 * @param {number} duration - Auto-dismiss duration in milliseconds
 */
export function showToast(message, type = 'success', duration = 3000) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️'}
            </div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Add styles
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: var(--z-toast, 9999);
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--warning)'};
        color: white;
        padding: 0;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        min-width: 300px;
        max-width: 400px;
        transform: translateX(100%);
        transition: all 0.3s ease;
        overflow: hidden;
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }, duration);
}

/**
 * Show error message in a section with retry button
 * @param {string} sectionId - Section element ID
 * @param {string} message - Error message to display
 * @param {function} retryCallback - Function to call on retry
 */
export function showError(sectionId, message, retryCallback = null) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    const retryButton = retryCallback ? 
        `<button class="btn btn-primary" onclick="(${retryCallback.toString()})()">
            🔄 Try Again
        </button>` : '';
    
    section.innerHTML = `
        <div class="error-container">
            <div class="error-icon">❌</div>
            <div class="error-message">
                <h4>Oops! Something went wrong</h4>
                <p>${message}</p>
                ${retryButton}
            </div>
        </div>
    `;
}

/**
 * Show inline field error
 * @param {string} fieldId - Field element ID
 * @param {string} message - Error message
 */
export function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Remove existing error
    hideFieldError(fieldId);
    
    // Add error styling
    field.classList.add('field-error');
    
    // Create error message element
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error-message';
    errorElement.textContent = message;
    errorElement.style.cssText = `
        color: var(--danger);
        font-size: 12px;
        margin-top: 4px;
        display: block;
    `;
    
    // Insert after field
    field.parentNode.insertBefore(errorElement, field.nextSibling);
}

/**
 * Hide inline field error
 * @param {string} fieldId - Field element ID
 */
export function hideFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    field.classList.remove('field-error');
    
    // Remove error message element
    const errorElement = field.parentNode.querySelector('.field-error-message');
    if (errorElement) {
        errorElement.remove();
    }
}

/**
 * Clear all field errors in a form
 * @param {string} formId - Form element ID
 */
export function clearFormErrors(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const errorFields = form.querySelectorAll('.field-error');
    const errorMessages = form.querySelectorAll('.field-error-message');
    
    errorFields.forEach(field => field.classList.remove('field-error'));
    errorMessages.forEach(msg => msg.remove());
}

/**
 * Disable save button during validation/loading
 * @param {string} buttonId - Button element ID
 * @param {string} text - Button text while disabled
 */
export function disableSaveButton(buttonId, text = 'Saving...') {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    button.disabled = true;
    button.textContent = text;
    button.classList.add('disabled');
}

/**
 * Enable save button after validation/loading
 * @param {string} buttonId - Button element ID
 * @param {string} text - Normal button text
 */
export function enableSaveButton(buttonId, text = 'Save') {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    button.disabled = false;
    button.textContent = text;
    button.classList.remove('disabled');
}

/**
 * Show loading spinner on button
 * @param {string} buttonId - Button element ID
 */
export function showButtonLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    button.disabled = true;
    button.innerHTML = `
        <span class="spinner"></span>
        Processing...
    `;
}

/**
 * Hide loading spinner on button
 * @param {string} buttonId - Button element ID
 * @param {string} text - Normal button text
 */
export function hideButtonLoading(buttonId, text = 'Save') {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    button.disabled = false;
    button.textContent = text;
}

/**
 * Show progress bar for uploads/processing
 * @param {string} containerId - Container element ID
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} message - Progress message
 */
export function showProgress(containerId, progress, message = 'Processing...') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="progress-container">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="progress-text">${message} ${progress}%</div>
        </div>
    `;
}

/**
 * Hide progress bar
 * @param {string} containerId - Container element ID
 */
export function hideProgress(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
}
