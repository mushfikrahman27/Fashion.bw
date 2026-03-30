// ============================================
// GLOBAL ERROR BOUNDARY
// js/error-boundary.js
// ============================================

import { showToast } from './utils/ui-helpers.js';
import { logSystemAction } from './utils/audit-log.js';

class ErrorBoundary {
    constructor() {
        this.errorCount = 0;
        this.maxErrors = 10; // Max errors before showing critical message
        this.errorHistory = [];
        this.criticalErrors = ['SecurityError', 'QuotaExceededError', 'UnauthenticatedError'];
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    init() {
        this.setupGlobalErrorHandlers();
        this.setupUnhandledRejectionHandler();
        this.setupResourceErrorHandler();
    }

    // ─────────────────────────────────────────
    // SETUP GLOBAL ERROR HANDLERS
    // ─────────────────────────────────────────
    setupGlobalErrorHandlers() {
        // Global JavaScript error handler
        window.onerror = (msg, src, line, col, err) => {
            this.handleError({
                type: 'JAVASCRIPT_ERROR',
                message: msg,
                source: src,
                line: line,
                column: col,
                error: err,
                timestamp: new Date(),
                userAgent: navigator.userAgent,
                pageUrl: window.location.href
            });
        };

        // Global promise rejection handler
        window.onunhandledrejection = (event) => {
            this.handleError({
                type: 'UNHANDLED_PROMISE',
                message: event.reason?.message || 'Unhandled promise rejection',
                reason: event.reason,
                timestamp: new Date(),
                userAgent: navigator.userAgent,
                pageUrl: window.location.href
            });
            
            // Prevent the default browser behavior
            event.preventDefault();
        };

        // Resource loading error handler
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleError({
                    type: 'RESOURCE_ERROR',
                    message: `Failed to load resource: ${event.target.src || event.target.href}`,
                    element: event.target.tagName,
                    source: event.target.src || event.target.href,
                    timestamp: new Date(),
                    userAgent: navigator.userAgent
                });
            }
        }, true);
    }

    // ─────────────────────────────────────────
    // HANDLE ERROR
    // ─────────────────────────────────────────
    async handleError(errorInfo) {
        this.errorCount++;
        this.errorHistory.push(errorInfo);

        // Log to audit system
        await logSystemAction('ERROR_OCCURRED', {
            component: 'ERROR_BOUNDARY',
            operation: errorInfo.type,
            result: 'ERROR',
            details: {
                message: errorInfo.message,
                source: errorInfo.source,
                line: errorInfo.line,
                error: this.serializeError(errorInfo.error)
            }
        });

        // Determine error severity
        const severity = this.determineSeverity(errorInfo);

        // Show appropriate user message
        this.showUserMessage(errorInfo, severity);

        // Check if we should show critical error message
        if (this.errorCount >= this.maxErrors) {
            this.showCriticalError();
        }

        // Log to console for debugging
        this.logToConsole(errorInfo, severity);
    }

    // ─────────────────────────────────────────
    // DETERMINE SEVERITY
    // ─────────────────────────────────────────
    determineSeverity(errorInfo) {
        // Check for critical error types
        if (this.criticalErrors.some(critical => 
            errorInfo.error && errorInfo.error.name === critical
        )) {
            return 'CRITICAL';
        }

        // Check for network errors
        if (errorInfo.type === 'RESOURCE_ERROR' || 
            errorInfo.message?.includes('NetworkError') ||
            errorInfo.message?.includes('fetch')) {
            return 'HIGH';
        }

        // Check for Firebase errors
        if (errorInfo.message?.includes('Firebase') ||
            errorInfo.message?.includes('permission-denied')) {
            return 'HIGH';
        }

        // Default to medium for other errors
        return 'MEDIUM';
    }

    // ─────────────────────────────────────────
    // SHOW USER MESSAGE
    // ─────────────────────────────────────────
    showUserMessage(errorInfo, severity) {
        let message = 'An unexpected error occurred. Please refresh the page.';
        
        switch (severity) {
            case 'CRITICAL':
                message = 'A critical error occurred. Please contact support immediately.';
                break;
            case 'HIGH':
                message = 'A network error occurred. Please check your connection and refresh.';
                break;
            case 'MEDIUM':
                message = 'A background operation failed. Please try again.';
                break;
        }

        // Show toast notification
        showToast(message, 'error', 8000); // Show for 8 seconds

        // Add retry button for network errors
        if (severity === 'HIGH') {
            setTimeout(() => {
                this.showRetryOption();
            }, 1000);
        }
    }

    // ─────────────────────────────────────────
    // SHOW RETRY OPTION
    // ─────────────────────────────────────────
    showRetryOption() {
        const existingRetry = document.getElementById('errorRetryButton');
        if (existingRetry) return;

        const retryButton = document.createElement('button');
        retryButton.id = 'errorRetryButton';
        retryButton.className = 'btn btn-primary error-retry-btn';
        retryButton.innerHTML = '🔄 Retry Operation';
        retryButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
        `;

        retryButton.onclick = () => {
            this.retryLastOperation();
            retryButton.remove();
        };

        document.body.appendChild(retryButton);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (retryButton.parentNode) {
                retryButton.remove();
            }
        }, 10000);
    }

    // ─────────────────────────────────────────
    // RETRY LAST OPERATION
    // ─────────────────────────────────────────
    retryLastOperation() {
        // Reload the page to retry the last operation
        window.location.reload();
    }

    // ─────────────────────────────────────────
    // SHOW CRITICAL ERROR
    // ─────────────────────────────────────────
    showCriticalError() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal critical-error-modal">
                <div class="critical-icon">🚨</div>
                <h3>Critical Error Detected</h3>
                <p>Multiple errors have occurred. The application may be unstable.</p>
                <p><strong>Recommended actions:</strong></p>
                <ul>
                    <li>Refresh the page</li>
                    <li>Clear browser cache</li>
                    <li>Check browser console for details</li>
                    <li>Contact support if the problem persists</li>
                </ul>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="errorBoundary.refreshPage()">
                        🔄 Refresh Page
                    </button>
                    <button class="btn btn-secondary" onclick="errorBoundary.viewErrorLog()">
                        📋 View Error Log
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add backdrop click to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // ─────────────────────────────────────────
    // REFRESH PAGE
    // ─────────────────────────────────────────
    refreshPage() {
        // Clear any existing modals
        document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
        
        // Clear error count
        this.errorCount = 0;
        
        // Reload page
        window.location.reload();
    }

    // ─────────────────────────────────────────
    // VIEW ERROR LOG
    // ─────────────────────────────────────────
    viewErrorLog() {
        const errorLog = this.errorHistory.slice(-10).map((error, index) => 
            `${index + 1}. ${error.type}: ${error.message}`
        ).join('\n');

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <h3>Recent Errors</h3>
                <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; font-size: 12px; max-height: 300px; overflow-y: auto;">${errorLog}</pre>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add backdrop click to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // ─────────────────────────────────────────
    // LOG TO CONSOLE
    // ─────────────────────────────────────────
    logToConsole(errorInfo, severity) {
        const style = severity === 'CRITICAL' ? 'color: red; font-weight: bold;' : 
                     severity === 'HIGH' ? 'color: orange; font-weight: bold;' : 'color: #666;';

        console.group(`%c${errorInfo.type}`, style);
        console.log('Message:', errorInfo.message);
        console.log('Severity:', severity);
        console.log('Timestamp:', errorInfo.timestamp);
        
        if (errorInfo.source) {
            console.log('Source:', errorInfo.source);
        }
        
        if (errorInfo.line) {
            console.log('Line:', errorInfo.line);
        }
        
        if (errorInfo.error) {
            console.log('Error Object:', errorInfo.error);
        }
        
        console.groupEnd();
    }

    // ─────────────────────────────────────────
    // SERIALIZE ERROR
    // ─────────────────────────────────────────
    serializeError(error) {
        if (!error) return null;
        
        try {
            return JSON.stringify(error, Object.getOwnPropertyNames(error));
        } catch (e) {
            return `[Object: ${error.toString()}]`;
        }
    }

    // ─────────────────────────────────────────
    // GET ERROR STATISTICS
    // ─────────────────────────────────────────
    getErrorStats() {
        const last24Hours = this.errorHistory.filter(error => 
            Date.now() - error.timestamp < 24 * 60 * 60 * 1000
        );

        const errorTypes = {};
        last24Hours.forEach(error => {
            errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
        });

        return {
            totalErrors: this.errorHistory.length,
            last24Hours: last24Hours.length,
            errorTypes: errorTypes,
            criticalErrors: this.errorHistory.filter(e => 
                this.determineSeverity(e) === 'CRITICAL'
            ).length
        };
    }

    // ─────────────────────────────────────────
    // RESET ERROR COUNT
    // ─────────────────────────────────────────
    resetErrorCount() {
        this.errorCount = 0;
    }
}

// Initialize error boundary
window.errorBoundary = new ErrorBoundary();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.errorBoundary.init();
});

// Global functions for backward compatibility
window.refreshPage = () => window.errorBoundary.refreshPage();
window.viewErrorLog = () => window.errorBoundary.viewErrorLog();
