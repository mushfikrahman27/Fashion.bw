// ============================================
// SETTINGS MANAGEMENT SYSTEM
// js/settings.js
// ============================================

import { getCollectionRef } from './firebase-paths.js';
import { showToast, withTimeout } from './utils/ui-helpers.js';
import { logUserAction } from './utils/audit-log.js';

class SettingsManager {
    constructor() {
        this.settings = {};
        this.isOnline = navigator.onLine;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000; // 5 seconds
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    async init() {
        if (!window.firebaseDB) {
            console.warn('Firebase not ready');
            return;
        }
        const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");

        try {
            // Load settings from Firebase
            const settingsSnap = await get(ref(window.firebaseDB, 'settings'));
            if (settingsSnap.exists()) {
                this.settings = { ...this.settings, ...settingsSnap.val() };
            }
            this.render();
        } catch (err) {
            console.error('Settings load error:', err);
            this.showToast('Failed to load settings', 'error');
        }
    }

    // ─────────────────────────────────────────
    // RENDER SETTINGS FORM
    // ─────────────────────────────────────────
    render() {
        const el = document.getElementById('settingsSection');
        if (!el) return;

        el.innerHTML = `
            <div class="section-header">
                <div class="header-content">
                    <h2 class="section-title">⚙️ Settings</h2>
                    <p class="section-subtitle">Configure your store settings</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="settings.saveSettings()">
                        <i class="fas fa-save"></i>
                        Save Settings
                    </button>
                </div>
            </div>

            <div class="section-body">
                <form id="settingsForm" onsubmit="settings.handleSubmit(event)">
                    <!-- General Settings -->
                    <div class="settings-section">
                        <h3>🏪 General Settings</h3>
                        <div class="settings-grid">
                            <div class="form-group">
                                <label for="siteName">Site Name</label>
                                <input type="text" id="siteName" name="siteName" value="${this.settings.siteName}" class="form-input" required>
                            </div>
                            <div class="form-group">
                                <label for="siteEmail">Site Email</label>
                                <input type="email" id="siteEmail" name="siteEmail" value="${this.settings.siteEmail}" class="form-input" required>
                            </div>
                            <div class="form-group">
                                <label for="currency">Currency</label>
                                <select id="currency" name="currency" class="form-select">
                                    <option value="BDT" ${this.settings.currency === 'BDT' ? 'selected' : ''}>BDT - Bangladeshi Taka</option>
                                    <option value="USD" ${this.settings.currency === 'USD' ? 'selected' : ''}>USD - US Dollar</option>
                                    <option value="EUR" ${this.settings.currency === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
                                    <option value="GBP" ${this.settings.currency === 'GBP' ? 'selected' : ''}>GBP - British Pound</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Contact Information -->
                    <div class="settings-section">
                        <h3>📞 Contact Information</h3>
                        <div class="settings-grid">
                            <div class="form-group">
                                <label for="contactPhone">Contact Phone</label>
                                <input type="tel" id="contactPhone" name="contactPhone" value="${this.settings.contactPhone}" class="form-input">
                            </div>
                            <div class="form-group">
                                <label for="contactEmail">Contact Email</label>
                                <input type="email" id="contactEmail" name="contactEmail" value="${this.settings.contactEmail}" class="form-input">
                            </div>
                            <div class="form-group full-width">
                                <label for="address">Business Address</label>
                                <textarea id="address" name="address" class="form-textarea" rows="3">${this.settings.address}</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Social Links -->
                    <div class="settings-section">
                        <h3>🌐 Social Links</h3>
                        <div class="settings-grid">
                            <div class="form-group">
                                <label for="facebook">Facebook</label>
                                <input type="url" id="facebook" name="facebook" value="${this.settings.socialLinks.facebook}" class="form-input" placeholder="https://facebook.com/yourpage">
                            </div>
                            <div class="form-group">
                                <label for="twitter">Twitter</label>
                                <input type="url" id="twitter" name="twitter" value="${this.settings.socialLinks.twitter}" class="form-input" placeholder="https://twitter.com/yourhandle">
                            </div>
                            <div class="form-group">
                                <label for="instagram">Instagram</label>
                                <input type="url" id="instagram" name="instagram" value="${this.settings.socialLinks.instagram}" class="form-input" placeholder="https://instagram.com/yourhandle">
                            </div>
                        </div>
                    </div>

                    <!-- Save Button -->
                    <div class="settings-actions">
                        <button type="submit" class="btn btn-primary" ${this.isLoading ? 'disabled' : ''}>
                            <i class="fas fa-save"></i>
                            ${this.isLoading ? 'Saving...' : 'Save Settings'}
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="settings.resetSettings()">
                            <i class="fas fa-undo"></i>
                            Reset to Default
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    // ─────────────────────────────────────────
    // FORM HANDLING
    // ─────────────────────────────────────────
    async handleSubmit(event) {
        event.preventDefault();
        
        if (this.isLoading) return;

        this.isLoading = true;
        this.render();

        try {
            // Get form values
            const formData = new FormData(event.target);
            const updatedSettings = {
                siteName: formData.get('siteName'),
                siteEmail: formData.get('siteEmail'),
                currency: formData.get('currency'),
                contactPhone: formData.get('contactPhone'),
                contactEmail: formData.get('contactEmail'),
                address: formData.get('address'),
                socialLinks: {
                    facebook: formData.get('facebook'),
                    twitter: formData.get('twitter'),
                    instagram: formData.get('instagram')
                }
            };

            // Validate required fields
            if (!updatedSettings.siteName || !updatedSettings.siteEmail) {
                this.showToast('Site name and email are required', 'error');
                this.isLoading = false;
                this.render();
                return;
            }

            // Save to Firebase
            const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            await set(ref(window.firebaseDB, 'settings'), updatedSettings);

            // Update local settings
            this.settings = updatedSettings;

            this.showToast('Settings saved successfully', 'success');

        } catch (err) {
            console.error('Settings save error:', err);
            this.showToast('Failed to save settings', 'error');
        } finally {
            this.isLoading = false;
            this.render();
        }
    }

    async resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to default values?')) return;

        try {
            const defaultSettings = {
                siteName: '',
                siteEmail: '',
                currency: 'BDT',
                contactPhone: '',
                contactEmail: '',
                address: '',
                socialLinks: {
                    facebook: '',
                    twitter: '',
                    instagram: ''
                }
            };

            // Save to Firebase
            const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            await set(ref(window.firebaseDB, 'settings'), defaultSettings);

            // Update local settings
            this.settings = defaultSettings;

            this.showToast('Settings reset to default', 'success');
            this.render();

        } catch (err) {
            console.error('Settings reset error:', err);
            this.showToast('Failed to reset settings', 'error');
        }
    }

    // ─────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────
    showToast(msg, type = 'success') {
        const t = document.createElement('div');
        t.className = `order-toast ${type}`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.classList.add('show'), 10);
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
    }
}

// Initialize settings
window.settings = new AdminSettings();
document.addEventListener('DOMContentLoaded', () => window.settings.init());
