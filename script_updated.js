/* --- 1. CONFIGURATION & UPDATED DATA --- */
(() => {
    "use strict";
    
    let cartArray = [];
    // Prevent browser from restoring scroll position on reload
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    // Hardware Back Button Fix for Overlays
    window.addEventListener('popstate', function (event) {
        const orderModal = document.getElementById('orderModal');
        if (orderModal) {
            orderModal.remove();
            return;
        }

        const socialOrderModal = document.getElementById('socialOrderModal');
        if (socialOrderModal) {
            socialOrderModal.remove();
            return;
        }

        const menu = document.getElementById('menuOverlay');
        if (menu && menu.classList.contains('active')) {
            menu.classList.remove('active');
            document.body.classList.remove('menu-open');
            return;
        }

        const cartOverlay = document.getElementById('cartSerialOverlay');
        if (cartOverlay && cartOverlay.classList.contains('active')) {
            cartOverlay.classList.remove('active');
            document.body.style.overflow = '';
            return;
        }

        const detailsPage = document.getElementById('productDetailsPage');
        if (detailsPage && detailsPage.classList.contains('active')) {
            detailsPage.classList.remove('active');
            document.body.style.overflow = 'auto'; // Restore scroll
            return;
        }
    });

    // Centralized config object
    const SOCIAL_CONFIG = {
        whatsappNumber: "8801601982509",
        messengerLink: "https://m.me/mushfikurrm0927"
    };

    // SECURITY: Telegram alerts disabled for public site
    const TELEGRAM_ENABLED = false;

    /* --- ORDER ID GENERATION --- */
    function generateOrderId() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        
        // Generate 4-6 digit random number
        const random = Math.floor(Math.random() * 900000) + 100000;
        
        return `ZN-${dateStr}-${random}`;
    }

    /* --- CREATE ORDER IN RTDB --- */
    async function createOrderInRTDB(orderData) {
        if (!window.firebaseDB) {
            throw new Error('Firebase not available');
        }

        const { ref, push, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        const orderRef = ref(window.firebaseDB, 'orders');
        
        // Generate unique orderId
        const orderId = generateOrderId();
        
        // Create order payload with required schema
        const payload = {
            orderId: orderId,
            createdAt: serverTimestamp(),
            status: "pending",
            channel: orderData.channel || "direct",
            customer: {
                name: orderData.customerName || '',
                phone: orderData.phone || '',
                address: orderData.address || '',
                note: orderData.note || ''
            },
            items: orderData.items || [],
            totals: {
                subtotal: orderData.subtotal || 0,
                deliveryCharge: orderData.deliveryCharge || 0,
                total: orderData.total || 0
            }
        };

        // Save to RTDB
        const result = await push(orderRef, payload);
        
        // Return the orderId and the Firebase key
        return {
            orderId: orderId,
            firebaseKey: result.key
        };
    }

    // Export functions for inline handlers
    window.generateOrderId = generateOrderId;
    window.createOrderInRTDB = createOrderInRTDB;
    window.TELEGRAM_ENABLED = TELEGRAM_ENABLED;

    console.log('Phase 5 Script Loaded - Order ID Generation & RTDB Integration Active');

})();
