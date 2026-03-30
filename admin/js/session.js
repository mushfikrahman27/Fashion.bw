// ============================================
// SESSION MANAGEMENT SYSTEM
// js/session.js
// ============================================

import { showToast } from './utils/ui-helpers.js';
import { logUserAction } from './utils/audit-log.js';

class SessionManager {
    constructor() {
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.warningTimeout = 5 * 60 * 1000; // 5 minutes before timeout
        this.lastActivity = Date.now();
        this.warningShown = false;
        this.sessionTimer = null;
        this.warningTimer = null;
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    init() {
        if (!window.firebaseAuth) {
            console.warn('Firebase Auth not available');
            return;
        }

        // Track user activity
        this.trackActivity();
        
        // Start session monitoring
        this.startSessionMonitoring();
        
        // Listen for auth state changes
        window.firebaseAuth.onAuthStateChanged((user) => {
            if (user) {
                // User logged in
                this.resetActivity();
                this.startSessionMonitoring();
                this.logSessionEvent('LOGIN');
            } else {
                // User logged out
                this.stopSessionMonitoring();
                this.clearTimers();
            }
        });
    }

    // ─────────────────────────────────────────
    // TRACK USER ACTIVITY
    // ─────────────────────────────────────────
    trackActivity() {
        const events = [
            'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'
        ];

        events.forEach(event => {
            document.addEventListener(event, () => {
                this.resetActivity();
            }, { passive: true });
        });

        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.resetActivity();
            }
        });

        // Track window focus
        window.addEventListener('focus', () => {
            this.resetActivity();
        });
    }

    // ─────────────────────────────────────────
    // RESET ACTIVITY TIMER
    // ─────────────────────────────────────────
    resetActivity() {
        this.lastActivity = Date.now();
        this.warningShown = false;
        
        // Hide any existing warning modal
        this.hideWarningModal();
    }

    // ─────────────────────────────────────────
    // START SESSION MONITORING
    // ─────────────────────────────────────────
    startSessionMonitoring() {
        this.stopSessionMonitoring(); // Clear any existing timers
        
        this.sessionTimer = setTimeout(() => {
            this.handleSessionTimeout();
        }, this.sessionTimeout);
    }

    // ─────────────────────────────────────────
    // STOP SESSION MONITORING
    // ─────────────────────────────────────────
    stopSessionMonitoring() {
        this.clearTimers();
    }

    // ─────────────────────────────────────────
    // CLEAR TIMERS
    // ─────────────────────────────────────────
    clearTimers() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
        
        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }
    }

    // ─────────────────────────────────────────
    // HANDLE SESSION TIMEOUT
    // ─────────────────────────────────────────
    async handleSessionTimeout() {
        try {
            // Log session timeout
            await logUserAction('SESSION_TIMEOUT', {
                duration: Date.now() - this.lastActivity,
                reason: 'INACTIVITY'
            });

            // Sign out user
            await window.firebaseAuth.signOut();
            
            // Show timeout message
            showToast('Session expired due to inactivity. Please log in again.', 'warning');
            
            // Redirect to login page
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
            
        } catch (error) {
            console.error('Session timeout error:', error);
            // Fallback: force redirect
            window.location.href = '../index.html';
        }
    }

    // ─────────────────────────────────────────
    // CHECK WARNING TIME
    // ─────────────────────────────────────────
    checkWarningTime() {
        const timeUntilTimeout = this.sessionTimeout - (Date.now() - this.lastActivity);
        
        if (timeUntilTimeout <= this.warningTimeout && !this.warningShown) {
            this.showWarningModal();
        }
        
        // Schedule next check
        this.warningTimer = setTimeout(() => {
            this.checkWarningTime();
        }, 60000); // Check every minute
    }

    // ─────────────────────────────────────────
    // SHOW WARNING MODAL
    // ─────────────────────────────────────────
    showWarningModal() {
        if (this.warningShown) return;
        
        this.warningShown = true;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal session-warning-modal">
                <h3>⏰ Session Expiring Soon</h3>
                <p>Your session will expire in <strong>5 minutes</strong> due to inactivity.</p>
                <p>Click "Stay Logged In" to extend your session.</p>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="sessionManager.extendSession()">
                        🔄 Stay Logged In
                    </button>
                    <button class="btn btn-secondary" onclick="sessionManager.logoutNow()">
                        🚪 Logout Now
                    </button>
                </div>
                <div class="session-countdown">
                    <span id="sessionCountdown">5:00</span> remaining
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Start countdown
        this.startCountdown();
        
        // Auto-close modal after 5 minutes
        this.warningTimer = setTimeout(() => {
            this.hideWarningModal();
            this.handleSessionTimeout();
        }, this.warningTimeout);
    }

    // ─────────────────────────────────────────
    // HIDE WARNING MODAL
    // ─────────────────────────────────────────
    hideWarningModal() {
        const modal = document.querySelector('.session-warning-modal');
        if (modal) {
            modal.closest('.modal-overlay').remove();
        }
        
        this.stopCountdown();
    }

    // ─────────────────────────────────────────
    // EXTEND SESSION
    // ─────────────────────────────────────────
    extendSession() {
        this.resetActivity();
        this.hideWarningModal();
        this.startSessionMonitoring();
        
        showToast('Session extended successfully', 'success');
        
        // Log session extension
        logUserAction('SESSION_EXTENDED', {
            reason: 'USER_ACTIVITY'
        });
    }

    // ─────────────────────────────────────────
    // LOGOUT NOW
    // ─────────────────────────────────────────
    async logoutNow() {
        this.hideWarningModal();
        this.clearTimers();
        
        try {
            await logUserAction('LOGOUT', {
                reason: 'USER_INITIATED'
            });
            
            await window.firebaseAuth.signOut();
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '../index.html';
        }
    }

    // ─────────────────────────────────────────
    // START COUNTDOWN
    // ─────────────────────────────────────────
    startCountdown() {
        this.stopCountdown();
        let seconds = 300; // 5 minutes in seconds
        
        this.countdownInterval = setInterval(() => {
            seconds--;
            
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            
            const countdownEl = document.getElementById('sessionCountdown');
            if (countdownEl) {
                countdownEl.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
            }
            
            if (seconds <= 0) {
                this.stopCountdown();
                this.handleSessionTimeout();
            }
        }, 1000);
    }

    // ─────────────────────────────────────────
    // STOP COUNTDOWN
    // ─────────────────────────────────────────
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    // ─────────────────────────────────────────
    // LOG SESSION EVENT
    // ─────────────────────────────────────────
    async logSessionEvent(event) {
        try {
            await logUserAction(event, {
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                pageUrl: window.location.href
            });
        } catch (error) {
            console.error('Failed to log session event:', error);
        }
    }

    // ─────────────────────────────────────────
    // GET SESSION STATUS
    // ─────────────────────────────────────────
    getSessionStatus() {
        const timeUntilTimeout = this.sessionTimeout - (Date.now() - this.lastActivity);
        const minutesUntilTimeout = Math.max(0, Math.floor(timeUntilTimeout / 60000));
        
        return {
            isActive: timeUntilTimeout > 0,
            minutesRemaining: minutesUntilTimeout,
            warningShown: this.warningShown
        };
    }
}

// Initialize session manager
window.sessionManager = new SessionManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.sessionManager.init();
});

// Global functions for backward compatibility
window.extendSession = () => window.sessionManager.extendSession();
window.logoutNow = () => window.sessionManager.logoutNow();
