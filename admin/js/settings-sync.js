// admin/js/settings-sync.js - PHASE 4: Media Manager & Dynamic Site Configuration
import { db } from '../../firebase-config.js';
import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const settingsRef = ref(db, 'settings');

// 1. Load Current Settings into Inputs
onValue(settingsRef, (snapshot) => {
    if (snapshot.exists()) {
        const data = snapshot.val();
        document.getElementById('config-banner-url').value = data.bannerUrl || '';
        document.getElementById('config-promo-text').value = data.promoText || '';
        document.getElementById('config-delivery-fee').value = data.deliveryFee || 0;
    }
});

// 2. Save Settings to Firebase
window.saveInarahSettings = () => {
    const banner = document.getElementById('config-banner-url').value;
    const promo = document.getElementById('config-promo-text').value;
    const fee = document.getElementById('config-delivery-fee').value;

    // Validation
    if (!banner && !promo && !fee) {
        alert("Please enter at least one setting to update.");
        return;
    }

    // Show loading state
    const saveBtn = document.querySelector('.btn-save-settings');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Updating Storefront...';
    saveBtn.disabled = true;

    set(settingsRef, {
        bannerUrl: banner,
        promoText: promo,
        deliveryFee: Number(fee) || 0,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'Admin Panel'
    })
    .then(() => {
        // Success feedback
        saveBtn.textContent = '✅ Storefront Updated!';
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }, 2000);
        
        // Show success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--gold);
            color: #000;
            padding: 15px 25px;
            border-radius: 12px;
            font-weight: bold;
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 5px 15px rgba(197, 160, 89, 0.3);
        `;
        notification.textContent = "INARAH Storefront Updated Successfully!";
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 4000);
    })
    .catch(err => {
        console.error('Settings save failed:', err);
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        alert("Error saving settings. Please try again.");
    });
};

// Auto-save on input change (optional - for better UX)
document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('.config-input');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            // Visual indicator that changes are pending
            input.style.borderColor = 'var(--gold)';
        });
    });
});
