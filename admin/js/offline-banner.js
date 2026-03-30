// ============================================
// OFFLINE STATUS BANNER
// js/offline-banner.js
// ============================================

import { showToast } from './utils/ui-helpers.js';

class OfflineBanner {
    constructor() {
        this.isOnline = navigator.onLine;
        this.banner = null;
        this.syncInProgress = false;
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    init() {
        this.createBanner();
        this.setupEventListeners();
        this.updateBannerStatus();
    }

    // ─────────────────────────────────────────
    // CREATE BANNER
    // ─────────────────────────────────────────
    createBanner() {
        this.banner = document.createElement('div');
        this.banner.id = 'offlineBanner';
        this.banner.className = 'offline-banner';
        this.banner.innerHTML = `
            <div class="banner-content">
                <div class="banner-icon">
                    <span id="bannerIcon">🌐</span>
                </div>
                <div class="banner-text">
                    <strong id="bannerTitle">Online</strong>
                    <span id="bannerMessage">All systems operational</span>
                </div>
                <button class="banner-close" onclick="offlineBanner.hideBanner()">×</button>
            </div>
        `;
        
        // Insert at the top of the page
        document.body.insertBefore(this.banner, document.body.firstChild);
    }

    // ─────────────────────────────────────────
    // SETUP EVENT LISTENERS
    // ─────────────────────────────────────────
    setupEventListeners() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateBannerStatus();
            this.showOnlineMessage();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateBannerStatus();
            this.showOfflineMessage();
        });

        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Check connection status when page becomes visible
                this.isOnline = navigator.onLine;
                this.updateBannerStatus();
            }
        });

        // Periodic connection check
        setInterval(() => {
            this.checkConnection();
        }, 30000); // Check every 30 seconds
    }

    // ─────────────────────────────────────────
    // CHECK CONNECTION
    // ─────────────────────────────────────────
    async checkConnection() {
        try {
            const response = await fetch('/favicon.ico', {
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            const wasOnline = this.isOnline;
            this.isOnline = response.ok;
            
            if (wasOnline !== this.isOnline) {
                this.updateBannerStatus();
                if (this.isOnline) {
                    this.showOnlineMessage();
                    this.triggerSync();
                } else {
                    this.showOfflineMessage();
                }
            }
        } catch (error) {
            if (this.isOnline) {
                this.isOnline = false;
                this.updateBannerStatus();
                this.showOfflineMessage();
            }
        }
    }

    // ─────────────────────────────────────────
    // UPDATE BANNER STATUS
    // ─────────────────────────────────────────
    updateBannerStatus() {
        if (!this.banner) return;

        if (this.isOnline) {
            this.banner.className = 'offline-banner online';
            this.banner.style.background = 'var(--success)';
            document.getElementById('bannerIcon').textContent = '🌐';
            document.getElementById('bannerTitle').textContent = 'Online';
            document.getElementById('bannerMessage').textContent = 'All systems operational';
        } else {
            this.banner.className = 'offline-banner offline';
            this.banner.style.background = 'var(--warning)';
            document.getElementById('bannerIcon').textContent = '📴';
            document.getElementById('bannerTitle').textContent = 'Offline';
            document.getElementById('bannerMessage').textContent = 'You are offline. Changes will sync when reconnected.';
        }
    }

    // ─────────────────────────────────────────
    // SHOW ONLINE MESSAGE
    // ─────────────────────────────────────────
    showOnlineMessage() {
        showToast('Back online. Syncing any pending changes...', 'success');
        
        // Auto-hide the online banner after 3 seconds
        setTimeout(() => {
            if (this.isOnline) {
                this.hideBanner();
            }
        }, 3000);
    }

    // ─────────────────────────────────────────
    // SHOW OFFLINE MESSAGE
    // ─────────────────────────────────────────
    showOfflineMessage() {
        showToast('Connection lost. You are now offline.', 'warning');
    }

    // ─────────────────────────────────────────
    // TRIGGER SYNC
    // ─────────────────────────────────────────
    async triggerSync() {
        if (this.syncInProgress) return;
        
        this.syncInProgress = true;
        
        try {
            // Trigger sync for all loaded modules
            if (window.productSystem && typeof window.productSystem.loadProducts === 'function') {
                await window.productSystem.loadProducts();
            }
            
            if (window.orderSystem && typeof window.orderSystem.init === 'function') {
                await window.orderSystem.init();
            }
            
            if (window.inventorySystem && typeof window.inventorySystem.init === 'function') {
                await window.inventorySystem.init();
            }
            
            showToast('Data synchronization complete', 'success');
            
        } catch (error) {
            console.error('Sync error:', error);
            showToast('Sync failed: ' + error.message, 'error');
        } finally {
            this.syncInProgress = false;
        }
    }

    // ─────────────────────────────────────────
    // HIDE BANNER
    // ─────────────────────────────────────────
    hideBanner() {
        if (this.banner) {
            this.banner.style.transform = 'translateY(-100%)';
            setTimeout(() => {
                if (this.banner && this.banner.parentNode) {
                    this.banner.parentNode.removeChild(this.banner);
                }
                this.banner = null;
            }, 300);
        }
    }

    // ─────────────────────────────────────────
    // SHOW BANNER
    // ─────────────────────────────────────────
    showBanner() {
        if (this.banner) {
            this.banner.style.transform = 'translateY(0)';
        }
    }

    // ─────────────────────────────────────────
    // GET STATUS
    // ─────────────────────────────────────────
    getStatus() {
        return {
            isOnline: this.isOnline,
            syncInProgress: this.syncInProgress,
            bannerVisible: this.banner !== null
        };
    }
}

// Initialize offline banner
window.offlineBanner = new OfflineBanner();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.offlineBanner.init();
});
