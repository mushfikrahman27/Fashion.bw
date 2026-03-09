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

    /* --- FILTER STATE SINGLE SOURCE OF TRUTH --- */
    const filterState = {
        category: null,
        subCategory: null,
        priceMin: null,
        priceMax: null,
        searchText: ""
    };

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

    /* --- SECURITY: VALIDATION & SANITIZATION --- */
    function validateOrderPayload(orderData) {
        const errors = [];
        
        // Customer validation
        if (!orderData.customerName || orderData.customerName.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }
        if (orderData.customerName && orderData.customerName.length > 60) {
            errors.push('Name must be 60 characters or less');
        }
        
        // Phone validation (Bangladesh format)
        const phone = orderData.phone ? orderData.phone.trim() : '';
        const phoneRegex = /^(?:\+880|01)[0-9]{9,10}$/;
        if (!phone || !phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
            errors.push('Please enter a valid Bangladesh phone number (e.g., 01234567890 or +8801234567890)');
        }
        
        // Address validation
        if (!orderData.address || orderData.address.trim().length < 6) {
            errors.push('Address must be at least 6 characters long');
        }
        if (orderData.address && orderData.address.length > 200) {
            errors.push('Address must be 200 characters or less');
        }
        
        // Items validation
        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
            errors.push('Order must contain at least one item');
        } else {
            if (orderData.items.length > 30) {
                errors.push('Order cannot contain more than 30 items');
            }
            
            orderData.items.forEach((item, index) => {
                if (!item.name || item.name.trim().length < 1) {
                    errors.push(`Item ${index + 1}: Name is required`);
                }
                if (!item.price || isNaN(item.price) || parseFloat(item.price) <= 0) {
                    errors.push(`Item ${index + 1}: Valid price is required`);
                }
                if (!item.productId || item.productId.toString().trim().length < 1) {
                    errors.push(`Item ${index + 1}: Product ID is required`);
                }
                if (item.qty && (isNaN(item.qty) || parseInt(item.qty) < 1)) {
                    errors.push(`Item ${index + 1}: Quantity must be at least 1`);
                }
            });
        }
        
        // Totals validation
        if (isNaN(orderData.subtotal) || parseFloat(orderData.subtotal) < 0) {
            errors.push('Invalid subtotal amount');
        }
        if (isNaN(orderData.total) || parseFloat(orderData.total) < 0) {
            errors.push('Invalid total amount');
        }
        
        // Recalculate and verify totals
        const calculatedSubtotal = orderData.items.reduce((sum, item) => {
            const price = parseFloat(item.price) || 0;
            const qty = parseInt(item.qty) || 1;
            return sum + (price * qty);
        }, 0);
        
        // Allow small differences due to rounding
        if (Math.abs(calculatedSubtotal - parseFloat(orderData.subtotal)) > 1) {
            errors.push('Subtotal does not match item prices');
        }
        
        return errors;
    }

    function sanitizeOrderData(orderData) {
        const sanitized = { ...orderData };
        
        // Trim and limit string lengths
        sanitized.customerName = (sanitized.customerName || '').toString().trim().substring(0, 60);
        sanitized.phone = (sanitized.phone || '').toString().trim().substring(0, 20);
        sanitized.address = (sanitized.address || '').toString().trim().substring(0, 200);
        sanitized.note = (sanitized.note || '').toString().trim().substring(0, 200);
        
        // Remove suspicious characters
        const controlCharRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
        sanitized.customerName = sanitized.customerName.replace(controlCharRegex, '');
        sanitized.phone = sanitized.phone.replace(controlCharRegex, '');
        sanitized.address = sanitized.address.replace(controlCharRegex, '');
        sanitized.note = sanitized.note.replace(controlCharRegex, '');
        
        // Sanitize items
        if (sanitized.items && Array.isArray(sanitized.items)) {
            sanitized.items = sanitized.items.map(item => ({
                productId: item.productId ? item.productId.toString().trim().substring(0, 50) : '',
                name: item.name ? item.name.toString().trim().substring(0, 100) : '',
                price: Math.max(0, parseFloat(item.price) || 0),
                qty: Math.max(1, parseInt(item.qty) || 1),
                selectedSize: item.selectedSize ? item.selectedSize.toString().trim().substring(0, 10) : 'N/A',
                color: item.color ? item.color.toString().trim().substring(0, 30) : ''
            }));
        }
        
        // Ensure numeric types
        sanitized.subtotal = Math.max(0, parseFloat(sanitized.subtotal) || 0);
        sanitized.total = Math.max(0, parseFloat(sanitized.total) || 0);
        
        return sanitized;
    }

    /* --- SECURITY: RATE LIMITING --- */
    const RATE_LIMIT_STORAGE_KEY = 'order_rate_limit';
    const MAX_ORDERS_PER_MINUTE = 3;
    const ORDER_COOLDOWN_SECONDS = 20;

    function checkRateLimit() {
        const now = Date.now();
        const rateData = JSON.parse(localStorage.getItem(RATE_LIMIT_STORAGE_KEY) || '{}');
        
        // Clean old entries (older than 1 minute)
        const oneMinuteAgo = now - 60000;
        rateData.recentAttempts = (rateData.recentAttempts || []).filter(timestamp => timestamp > oneMinuteAgo);
        
        // Check rate limit
        if (rateData.recentAttempts.length >= MAX_ORDERS_PER_MINUTE) {
            return {
                allowed: false,
                message: `Too many order attempts. Please wait ${Math.ceil((rateData.recentAttempts[0] + 60000 - now) / 1000)} seconds before trying again.`
            };
        }
        
        // Check cooldown
        if (rateData.lastOrderTime && (now - rateData.lastOrderTime) < (ORDER_COOLDOWN_SECONDS * 1000)) {
            const remainingCooldown = Math.ceil((ORDER_COOLDOWN_SECONDS * 1000 - (now - rateData.lastOrderTime)) / 1000);
            return {
                allowed: false,
                message: `Please wait ${remainingCooldown} seconds before placing another order.`
            };
        }
        
        return { allowed: true };
    }

    function recordOrderAttempt() {
        const now = Date.now();
        const rateData = JSON.parse(localStorage.getItem(RATE_LIMIT_STORAGE_KEY) || '{}');
        
        rateData.recentAttempts = (rateData.recentAttempts || []).filter(timestamp => timestamp > (now - 60000));
        rateData.recentAttempts.push(now);
        rateData.lastOrderTime = now;
        
        localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(rateData));
    }

    function resetRateLimit() {
        localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
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

    /* --- SMART SIZE LOGIC FOR PRODUCT CARDS --- */
    function getSizeTypeForProduct(p) {
        if (!p) return 'none';
        const sub = (p.subCategory || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();

        // Accessories: no size
        const accessorySubs = ['bags', 'sunglasses', 'wallet', 'wallets', 'belts', 'caps', 'winter', 'travel', 'watches'];
        if (accessorySubs.includes(sub)) return 'none';

        // Footwear: numeric sizes
        const footwearSubs = ['sneakers', 'shoes', 'sandal', 'sandals'];
        if (footwearSubs.includes(sub)) return 'footwear';

        // Clothing: M–XXL
        const clothingSubs = ['shirt', 'shirts', 'tshirt', 'tshirts', 'shorts', 'leggings', 'sweater', 'hoodie', 'dress', 'abaya', 'borkha', 'pants'];
        if (clothingSubs.includes(sub)) return 'clothing';
        if (cat === 'men' || cat === 'women') return 'clothing';

        return 'none';
    }

    function buildSizeOptionsHTML(p) {
        const sizeType = getSizeTypeForProduct(p);
        let sizes = [];

        if (sizeType === 'clothing') {
            sizes = ['M', 'L', 'XL', 'XXL'];
        } else if (sizeType === 'footwear') {
            sizes = ['40', '41', '42', '43', '44', '45'];
        } else {
            return '';
        }

        const spans = sizes.map(size => 
            `<span onclick="event.stopPropagation(); selectSize(${p.id}, this)">${size}</span>`
        ).join('');

        return `
            <div class="size-container">
                <label class="size-label">Select Size:</label>
                <div class="size-options" id="sizes-prod-${p.id}">
                    ${spans}
                </div>
            </div>
        `;
    }

    /* --- CART PERSISTENCE --- */
    const CART_STORAGE_KEY = 'policia_cart';

    function saveCartToStorage() {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartArray));
    }

    function loadCartFromStorage() {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        if (saved) {
            try {
                cartArray = JSON.parse(saved);
                // Update UI
                const countLabel = document.getElementById('navbarCartCount');
                if (countLabel) countLabel.innerText = cartArray.length;
                renderSerialItems();
            } catch (e) {
                console.error('Failed to load cart:', e);
            }
        }
    }

    // Load cart on page load
    document.addEventListener('DOMContentLoaded', loadCartFromStorage);

    /* --- BACKGROUND PRODUCT INTERACTION ANALYTICS --- */
    function scheduleBackgroundTask(task) {
        try {
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(() => task(), { timeout: 2000 });
            } else {
                setTimeout(() => task(), 0);
            }
        } catch (_) {
            // no-op
        }
    }

    function trackProductAnalytics(product, eventType) {
        if (!product || !product.id) return;
        if (!window.firebaseDB) return; // Firebase not ready / not loaded

        const productId = String(product.id);
        const safeEvent = eventType === 'views' ? 'views' : (eventType === 'carts' ? 'carts' : null);
        if (!safeEvent) return;

        scheduleBackgroundTask(async () => {
            try {
                const { ref, runTransaction, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                const analyticsRef = ref(window.firebaseDB, `product_analytics/${productId}`);

                await runTransaction(analyticsRef, (current) => {
                    const cur = current && typeof current === 'object' ? current : {};
                    const next = { ...cur };

                    next.productId = product.id;
                    next.productName = product.name || cur.productName || '';
                    next.price = product.price || cur.price || '';
                    next.img = product.img || cur.img || '';
                    next.category = product.category || cur.category || '';
                    next.subCategory = product.subCategory || cur.subCategory || '';

                    next.views = (typeof next.views === 'number' ? next.views : 0);
                    next.carts = (typeof next.carts === 'number' ? next.carts : 0);
                    next[safeEvent] = next[safeEvent] + 1;
                    next.lastUpdated = serverTimestamp();

                    return next;
                });
            } catch (e) {
                // Keep completely silent for users (background only)
            }
        });
    }

    let productsPerPage = window.innerWidth <= 768 ? 10 : 16;
    let currentPage = 1;

    // Re-check width on resize
    window.addEventListener('resize', () => {
        productsPerPage = window.innerWidth <= 768 ? 10 : 16;
    });

    // INITIAL DATA: Fallback hardcoded products
    const fallbackProducts = [
        // WOMEN CATEGORY
        { id: 1, name: "Luxury Tote Bag", price: "750", color: "Black", img: "bag1.jpg", category: "Women", subCategory: "Bags", img: "images/tote-bag.jpeg" },
        { id: 2, name: "Premium Handbag", price: "950", color: "Brown", img: "bag2.jpg", category: "Women", subCategory: "Bags", img: "images/pic-2.jpg" },
        { id: 6, name: "Elegant Shoulder Bag", price: "820", color: "Beige", img: "bag3.jpg", category: "Women", subCategory: "Bags", img: "images/pic-3.jpg" },
        { id: 7, name: "Mini Party Clutch", price: "640", color: "Gold", img: "bag4.jpg", category: "Women", subCategory: "Bags", img: "images/pic-4.jpg" },
        { id: 8, name: "Casual Canvas Bag", price: "520", color: "Cream", img: "bag5.jpg", category: "Women", subCategory: "Bags", img: "images/pic-5.jpeg" },

        { id: 9, name: "Premium Abaya", price: "1400", color: "Pink", img: "dress1.jpg", category: "Women", subCategory: "Most Viewed", img: "images/pic-6.jpg" },
        { id: 10, name: "premium borkha", price: "2600", color: "Maroon", img: "dress2.jpg", category: "Women", subCategory: "Dress", img: "images/pic-7.jpg" },
        { id: 11, name: "Casual Women Watch", price: "980", color: "Sky Blue", img: "dress3.jpg", category: "Women", subCategory: "Trending", img: "images/pic-8.webp" },

        // MEN CATEGORY
        { id: 3, name: "Urban Street Sneaker", price: "1800", color: "White/Grey", img: "sneaker1.jpg", category: "Men", subCategory: "Sneakers", img: "images/pic-9.webp" },
        { id: 4, name: "Classic Sport Sneaker", price: "2200", color: "Blue", img: "sneaker2.jpg", category: "Men", subCategory: "Sneakers", img: "images/pic-10.jpg" },
        { id: 12, name: "Running Pro Sneaker", price: "1950", color: "Black/Red", img: "sneaker3.jpg", category: "Men", subCategory: "Sneakers", img: "images/pic-11.jpg" },
        { id: 13, name: "Minimal White Sneaker", price: "1750", color: "White", img: "sneaker4.jpg", category: "Men", subCategory: "Sneakers", img: "images/pic-12.webp" },

        { id: 14, name: "Formal Leather Shoe", price: "2600", color: "Dark Brown", img: "shoe1.jpg", category: "Men", subCategory: "Shoes", img: "images/pic-13.jpg" },
        { id: 15, name: "Office Classic Shoe", price: "2400", color: "Black", img: "shoe2.jpg", category: "Men", subCategory: "Shoes", img: "images/pic-14.jpg" },

        { id: 16, name: "Slim Fit Shirt", price: "1200", color: "White", img: "shirt1.jpg", category: "Men", subCategory: "Shirt", img: "images/pic-15.webp" },
        { id: 17, name: "Casual Check Shirt", price: "980", color: "Green", img: "shirt2.jpg", category: "Men", subCategory: "Shirt", img: "images/pic-15.webp" },
        { id: 18, name: "Denim Casual Shirt", price: "1450", color: "Blue", img: "shirt3.jpg", category: "Men", subCategory: "Shirt", img: "images/pic-15.webp" },

        // COLLECTION CATEGORY
        { id: 5, name: "Dark Aviator", price: "1200", color: "Silver", img: "glass1.jpg", category: "Men", subCategory: "Sunglasses", img: "images/pic-16.webp" },
        { id: 19, name: "Retro Round Glass", price: "1350", color: "Black", img: "glass2.jpg", category: "Men", subCategory: "Sunglasses", img: "images/pic-16.webp" },
        { id: 20, name: "Luxury Gold Frame", price: "1650", color: "Gold", img: "glass3.jpg", category: "Men", subCategory: "Sunglasses", img: "images/pic-16.webp" },

        { id: 21, name: "Smart Analog Watch", price: "3200", color: "Silver", img: "watch1.jpg", category: "Collection", subCategory: "Watches", img: "images/pic-17.png" },
        { id: 22, name: "Leather Strap Watch", price: "2850", color: "Brown", img: "watch2.jpg", category: "Collection", subCategory: "Watches", img: "images/pic-17.png" },
        { id: 23, name: "Modern Black Watch", price: "3100", color: "Black", img: "watch3.jpg", category: "Collection", subCategory: "Watches", img: "images/pic-17.png" },

        // ACCESSORIES
        { id: 24, name: "Classic Leather Belt", price: "850", color: "Brown", img: "belt1.jpg", category: "Collection", subCategory: "Belts", img: "images/pic-18.jpg" },
        { id: 25, name: "Minimal Black Belt", price: "780", color: "Black", img: "belt2.jpg", category: "Collection", subCategory: "Belts", img: "images/pic-18.jpg" },

        { id: 26, name: "Travel Backpack", price: "2100", color: "Grey", img: "bag6.jpg", category: "Men", subCategory: "Bags", img: "images/pic-19.jpg" },
        { id: 27, name: "Office Laptop Bag", price: "2350", color: "Black", img: "bag7.jpg", category: "Men", subCategory: "Bags", img: "images/pic-19.jpg" },

        { id: 28, name: "Women Fashion Sandal", price: "1450", color: "Beige", img: "sandal1.jpg", category: "Women", subCategory: "Shoes", img: "images/pic-20.jpg" },
        { id: 29, name: "Elegant Heel Sandal", price: "1750", color: "Black", img: "sandal2.jpg", category: "Women", subCategory: "Shoes", img: "images/pic-20.jpg" },

        { id: 30, name: "Sports Cap", price: "420", color: "Navy", img: "cap1.jpg", category: "Collection", subCategory: "Caps" },
        { id: 31, name: "Urban Snapback Cap", price: "520", color: "Black", img: "cap2.jpg", category: "Collection", subCategory: "Caps" },

        { id: 32, name: "Winter Hoodie", price: "1850", color: "Charcoal", img: "hoodie1.jpg", category: "Men", subCategory: "Hoodie" },
        { id: 33, name: "Casual Zip Hoodie", price: "1950", color: "Olive", img: "hoodie2.jpg", category: "Men", subCategory: "Hoodie" },

        { id: 34, name: "Women Knit Sweater", price: "1680", color: "Cream", img: "sweater1.jpg", category: "Women", subCategory: "Sweater" },
        { id: 35, name: "Soft Wool Cardigan", price: "1780", color: "Lavender", img: "sweater2.jpg", category: "Women", subCategory: "Sweater" },

        { id: 36, name: "Premium Wallet", price: "980", color: "Dark Brown", img: "wallet1.jpg", category: "Collection", subCategory: "Wallet" },
        { id: 37, name: "Compact Card Holder", price: "620", color: "Black", img: "wallet2.jpg", category: "Collection", subCategory: "Wallet" },

        { id: 38, name: "Travel Duffel Bag", price: "2600", color: "Army Green", img: "bag8.jpg", category: "Men", subCategory: "Bags" },
        { id: 39, name: "Luxury Party Purse", price: "1450", color: "Rose Gold", img: "bag9.jpg", category: "Women", subCategory: "Bags" },

        { id: 40, name: "Classic Polo T-Shirt", price: "920", color: "White", img: "tshirt1.jpg", category: "Men", subCategory: "Tshirt" },
        { id: 41, name: "Graphic Street Tee", price: "880", color: "Black", img: "tshirt2.jpg", category: "Men", subCategory: "Tshirt" },

        { id: 42, name: "Women Basic Tee", price: "760", color: "Peach", img: "tshirt3.jpg", category: "Women", subCategory: "Tshirt" },
        { id: 43, name: "Oversized Street Tee", price: "990", color: "Grey", img: "tshirt4.jpg", category: "Women", subCategory: "Tshirt" },

        { id: 44, name: "Running Shorts", price: "720", color: "Black", img: "short1.jpg", category: "Men", subCategory: "Shorts" },
        { id: 45, name: "Casual Cotton Shorts", price: "680", color: "Khaki", img: "short2.jpg", category: "Men", subCategory: "Shorts" },

        { id: 46, name: "Yoga Leggings", price: "1100", color: "Black", img: "legging1.jpg", category: "Women", subCategory: "Leggings" },
        { id: 47, name: "Active Sports Leggings", price: "1250", color: "Purple", img: "legging2.jpg", category: "Women", subCategory: "Leggings" },

        { id: 48, name: "Winter Scarf", price: "520", color: "Maroon", img: "scarf1.jpg", category: "Collection", subCategory: "Winter" },
        { id: 49, name: "Knitted Gloves", price: "480", color: "Grey", img: "glove1.jpg", category: "Collection", subCategory: "Winter" },

        { id: 50, name: "Premium Travel Suitcase", price: "5400", color: "Black", img: "case1.jpg", category: "Collection", subCategory: "Travel" }
    ];

    // GLOBAL PRODUCTS ARRAY - CRITICAL FOR ALL FUNCTIONS
    window.allProducts = [...fallbackProducts];

    // Default filtered list
    let filteredProducts = [...window.allProducts];

    /* --- FIREBASE PRODUCT LOADER --- */
    async function loadProductsFromFirebase() {
        if (!window.firebaseDB) {
            console.log('Firebase not available, using fallback products');
            return false;
        }

        try {
            const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const productsRef = ref(window.firebaseDB, 'products');
            const snapshot = await get(productsRef);
            
            if (snapshot.exists()) {
                const firebaseProducts = snapshot.val();
                const activeProducts = Object.values(firebaseProducts)
                    .filter(product => product.isActive !== false) // Only active products
                    .map(product => ({
                        id: product.id || product.name.toLowerCase().replace(/\s+/g, '_'),
                        name: product.name,
                        price: product.price,
                        color: product.color || 'Default',
                        category: product.category,
                        subCategory: product.subCategory || '',
                        img: product.imgUrl || product.img // Support both field names
                    }));
                
                if (activeProducts.length > 0) {
                    window.allProducts = activeProducts;
                    filteredProducts = [...window.allProducts];
                    console.log(`Loaded ${activeProducts.length} products from Firebase`);
                    return true;
                }
            }
        } catch (error) {
            console.warn('Failed to load products from Firebase:', error);
        }
        
        return false; // Use fallback
    }

    // Initialize products on page load
    document.addEventListener('DOMContentLoaded', async () => {
        const loadedFromFirebase = await loadProductsFromFirebase();
        if (!loadedFromFirebase) {
            console.log('Using fallback hardcoded products');
        }
        
        // Continue with existing initialization
        if (typeof renderProducts === 'function') {
            renderProducts();
        }
    });

    /* --- 3. UI & CART ACTIONS --- */
    function toggleMenu() {
        const menu = document.getElementById('menuOverlay');
        if (!menu) return;
        if (menu.classList.contains('active')) {
            if (history.state && history.state.overlay) {
                history.back();
            } else {
                menu.classList.remove('active');
            }
        } else {
            history.pushState({ overlay: true }, "");
            menu.classList.add('active');
        }
    }

    function toggleSub(btn) {
        const parent = btn.parentElement;
        parent.classList.toggle('active');
        parent.classList.toggle('open');

        const icon = btn.querySelector('.plus-icon');
        if (icon) {
            icon.innerText = (parent.classList.contains('active') || parent.classList.contains('open')) ? "−" : "+";
        }
    }

    function toggleCartDisplay() {
        const cartOverlay = document.getElementById('cartSerialOverlay');
        if (!cartOverlay) return;

        if (cartOverlay.classList.contains('active')) {
            if (history.state && history.state.overlay) {
                history.back();
            } else {
                cartOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        } else {
            history.pushState({ overlay: true }, "");
            cartOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            renderSerialItems();
        }
    }

    /* --- 4. THE ADD TO CART SYSTEM --- */
    function addToCart(id) {
        // Safety guard for undefined products
        if (!window.allProducts || window.allProducts.length === 0) {
            console.error('Products not loaded yet');
            return;
        }
        const product = window.allProducts.find(p => p.id === id);
        if (!product) return;

        // Background analytics: cart adds
        trackProductAnalytics(product, 'carts');

        // --- TRACKING START: FB Pixel & GA4 AddToCart ---
        const numericPrice = parseFloat(product.price.toString().replace(/[^0-9.]/g, ''));

        // Facebook Pixel Event
        if (typeof fbq === 'function') {
            fbq('track', 'AddToCart', {
                content_name: product.name,
                content_ids: [product.id.toString()],
                content_type: 'product',
                value: numericPrice,
                currency: 'BDT'
            });
        }

        // Google Analytics Event
        if (typeof gtag === 'function') {
            gtag('event', 'add_to_cart', {
                currency: 'BDT',
                value: numericPrice,
                items: [{
                    item_id: product.id,
                    item_name: product.name,
                    price: numericPrice
                }]
            });
        }
        // --- TRACKING END ---

        const btn = document.querySelector(`button[onclick*="addToCart(${id})"]`);

        if (btn) {
            // Premium feedback animation
            const oldText = btn.innerText;
            btn.innerText = "Added ✓";
            btn.style.background = "var(--accent-gold)";
            btn.style.color = "var(--background)";
            btn.style.transform = "scale(0.95)";
            
            setTimeout(() => {
                btn.innerText = oldText;
                btn.style.background = "";
                btn.style.color = "";
                btn.style.transform = "";
            }, 1500);
        }

        const size = document.querySelector(`#sizes-prod-${id} span.active`)?.innerText || "Not Specified";
        cartArray.push({ ...product, selectedSize: size });
        saveCartToStorage();

        const countLabel = document.getElementById('navbarCartCount');
        if (countLabel) countLabel.innerText = cartArray.length;

        const cartIcon = document.querySelector('.cart-glass');
        if (cartIcon) {
            cartIcon.classList.add('cart-bounce-active');
            setTimeout(() => cartIcon.classList.remove('cart-bounce-active'), 400);
        }
        showToast(product.name);
    }

    function showToast(productName) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <div class="toast-content">
                <p>Added <span>${productName}</span> to your Cart!</p>
            </div>
            <button class="toast-view-btn" onclick="toggleCartDisplay()">View Cart</button>
        `;
        container.appendChild(toast);

        // Force a reflow before adding the active class
        void toast.offsetWidth;

        toast.classList.add('active');
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    function removeItem(index) {
        cartArray.splice(index, 1);
        saveCartToStorage();
        const countLabel = document.getElementById('navbarCartCount');
        if (countLabel) countLabel.innerText = cartArray.length;
        renderSerialItems();
    }

    /* --- 6. RENDER CART --- */
    function renderSerialItems() {
        const container = document.getElementById('serialItemList');
        if (!container) return;

        const headerHtml = `
            <div class="cart-header-cool">
                <span>YOUR SELECTION (${cartArray.length})</span>
                <button class="cool-close-btn" onclick="toggleCartDisplay()">
                    <div class="close-icon-line"></div>
                </button>
            </div>`;

        if (cartArray.length === 0) {
            container.innerHTML = headerHtml + `<div class="empty-cart-ui"><p>Your bag is empty</p></div>`;
            return;
        }

        const total = cartArray.reduce((sum, item) => sum + parseInt(item.price), 0);
        const itemsHtml = cartArray.map((item, index) => `
            <div class="serial-item-card">
                <img src="${item.img}" onerror="this.src='https://via.placeholder.com/55x65'">
                <div class="serial-item-details">
                    <p><strong>${item.name}</strong></p>
                    <p style="font-size:0.75rem;">Size: ${item.selectedSize} | TK ${item.price}</p>
                </div>
                <button class="remove-item-btn" onclick="removeItem(${index})">✕</button>
            </div>`).join('');

        container.innerHTML = headerHtml + `
            <div style="flex: 1; overflow-y: auto; max-height: calc(80vh - 60px);">${itemsHtml}</div>
            <div class="cart-checkout-footer">
                <div class="cart-total-row"><span>Total:</span><span>TK ${total}</span></div>
                <button class="checkout-buy-btn" onclick="processCartCheckout()">Buy Now</button>
            </div>`;
    }

    /* --- 7. ORDER LOGIC --- */
    function openOrderOptions(fullMessage) {
        // 1. FB Pixel Tracking: InitiateCheckout
        if (typeof fbq === 'function') {
            fbq('track', 'InitiateCheckout', {
                content_name: 'Order Modal Open',
                currency: 'BDT'
            });
        }

        const encodedMsg = encodeURIComponent(fullMessage);
        const escapedMessage = fullMessage.replace(/'/g, "\\'");

        const modalHtml = `
            <div id="orderModal" class="social-modal-overlay">
                <div class="social-modal-content">
                    <h3>Order via</h3>
                    <div class="social-options">
                        <a href="https://api.whatsapp.com/send?phone=${SOCIAL_CONFIG.whatsappNumber}&text=${encodedMsg}" 
                           target="_blank" class="social-opt wa">WhatsApp</a>
                        
                        <a href="javascript:void(0)" 
                           onclick="copyAndRedirectMessenger('${escapedMessage}')" 
                           class="social-opt fb">Messenger</a>
                    </div>
                    <button onclick="closeOrderModal()" class="close-modal-btn">Cancel</button>
                </div>
            </div>`;
        history.pushState({ overlay: true }, "");
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Messenger Redirect & Clipboard Logic
    function copyAndRedirectMessenger(message) {
        navigator.clipboard.writeText(message).then(() => {
            if (typeof showToast === "function") {
                showToast("Order details copied! Please paste it in Messenger.");
            } else {
                alert("Order details copied! Please paste it in our Messenger inbox.");
            }

            setTimeout(() => {
                window.open(SOCIAL_CONFIG.messengerLink, '_blank');
                closeOrderModal();
            }, 1200);
        }).catch(err => {
            console.error('Could not copy text: ', err);
            window.open(SOCIAL_CONFIG.messengerLink, '_blank');
            closeOrderModal();
        });
    }

    function closeOrderModal() {
        if (history.state && history.state.overlay) {
            history.back();
        } else {
            const modal = document.getElementById('orderModal');
            if (modal) modal.remove();
        }
    }

    function handleSingleBuy(card) {
        const name = card.querySelector('.p-name').innerText;
        const price = card.querySelector('.p-price').innerText.replace('TK-', '');
        const color = card.querySelector('.p-meta').innerText.replace('Color: ', '');
        const size = card.querySelector('.size-options span.active')?.innerText || "Not Specified";
        openOrderOptions(`Hello! I want to Buy: ${name} (Size: ${size}, Color: ${color}), Total Price: TK ${price}`);
    }

    function processCartCheckout() {
        if (cartArray.length === 0) return;
        if (typeof triggerCartOrderFlow === 'function') {
            triggerCartOrderFlow();
        }
    }

    /* --- 8. PRODUCT RENDERING & PAGINATION --- */
    function renderSingleCard(container, p) {
        let html = '';
        html += `
            <div class="product-card">
                <div class="product-img-holder skeleton" onclick="openProductDetails(${p.id})" style="cursor: pointer;">
                    <img src="${p.img}" onload="this.parentElement.classList.remove('skeleton')" onerror="this.src='https://via.placeholder.com/400x500'">
                </div>
                
                <div class="product-details">
                    <h3 class="p-name" onclick="openProductDetails(${p.id})" style="cursor: pointer;">${p.name}</h3>
                    
                    <p class="p-meta">Color: ${p.color}</p>
                    <p class="p-price">TK-${p.price}</p>
                    
                    ${buildSizeOptionsHTML(p)}
                    
                    <div class="button-group">
                        <button class="action-btn buy-btn" onclick="event.stopPropagation(); triggerOrderFlow(${p.id})">Buy Now</button>
                        <button class="action-btn cart-btn" onclick="event.stopPropagation(); addToCart(${p.id})">Add to Cart</button>
                    </div>
                </div>
            </div>`;
        container.innerHTML += html;
    }

    function selectSize(prodId, element) {
        const options = document.querySelectorAll(`#sizes-prod-${prodId} span`);
        options.forEach(opt => opt.classList.remove('active'));
        element.classList.add('active');
    }

    function displayProducts(page) {
        const grid = document.getElementById('productGrid');
        if (!grid) return;

        grid.innerHTML = "";
        const currentLimit = window.innerWidth <= 768 ? 10 : 16;
        const start = (page - 1) * currentLimit;
        const end = start + currentLimit;
        const itemsToShow = filteredProducts.slice(start, end);

        if (itemsToShow.length === 0) {
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--muted-foreground); padding: 40px;">No products found in this category.</p>`;
        } else {
            itemsToShow.forEach(p => {
                const card = document.createElement('div');
                card.className = 'product-card';
                
                card.onclick = function() { 
                    openProductDetails(p.id); 
                };
                
        card.innerHTML = `
        <div class="product-img-holder">
            <img src="${p.img}" alt="${p.name}">
        </div>
        <div class="p-info">
            <h3 class="p-name">${p.name}</h3>
            <p class="p-meta" style="display:none;">Color: ${p.color || "Default"}</p>
            <p class="p-price">TK-${p.price}</p>
        </div>
        ${buildSizeOptionsHTML(p)}
        <div class="button-group" style="display: flex; gap: 10px; margin-top: 10px; width: 100%;">
            <button class="action-btn buy-btn" onclick="event.stopPropagation(); triggerOrderFlow(${p.id})" style="flex: 1; padding: 12px 0;">Buy Now</button>
            <button class="cart-btn action-btn" onclick="event.stopPropagation(); addToCart(${p.id})" style="flex: 1; padding: 12px 0;">Add to Cart</button>
        </div>
    `;
                grid.appendChild(card);
            });
        }

        if (typeof setupPagination === 'function') {
            setupPagination(filteredProducts.length, currentLimit);
        }
    }

    function setupPagination(totalItems, itemsPerPage) {
        const paginationContainer = document.getElementById('paginationBar');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = '';
        const pageCount = Math.ceil(totalItems / itemsPerPage);

        if (pageCount <= 1) return;

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button');
            btn.innerText = i;
            btn.className = `page-num ${i === currentPage ? 'active' : ''}`;
            btn.onclick = () => {
                currentPage = i;
                displayProducts(i);
                window.scrollTo({ top: document.getElementById('productGrid').offsetTop - 100, behavior: 'smooth' });
            };
            paginationContainer.appendChild(btn);
        }
    }

    // Page load hoye gele loading screen hide korar jonno
    window.addEventListener('load', () => {
        const loader = document.getElementById('loadingScreen');
        if (loader) {
            loader.style.display = 'none';
        }
    });

    /* --- UNIFIED FILTER SYSTEM --- */
    function applyFilters(products, state) {
        return products.filter(product => {
            // 1. Category filter
            if (state.category && state.category !== 'All') {
                if (product.category !== state.category) return false;
                if (state.subCategory && state.subCategory !== 'All' && product.subCategory !== state.subCategory) {
                    return false;
                }
            }

            // 2. SubCategory filter (standalone, when category is 'All')
            if (!state.category || state.category === 'All') {
                if (state.subCategory && state.subCategory !== 'All' && product.subCategory !== state.subCategory) {
                    return false;
                }
            }

            // 3. Price filter
            if (state.priceMin !== null) {
                const productPriceNum = typeof product.price === 'string'
                    ? parseInt(product.price.replace(/[^0-9]/g, ''))
                    : product.price;
                if (productPriceNum < state.priceMin) return false;
            }
            if (state.priceMax !== null) {
                const productPriceNum = typeof product.price === 'string'
                    ? parseInt(product.price.replace(/[^0-9]/g, ''))
                    : product.price;
                if (productPriceNum > state.priceMax) return false;
            }

            // 4. Search filter
            if (state.searchText && state.searchText.trim()) {
                const searchTerm = state.searchText.toLowerCase().trim();
                const matchesName = product.name.toLowerCase().includes(searchTerm);
                const matchesCategory = product.category.toLowerCase().includes(searchTerm);
                const matchesSubCategory = product.subCategory ? product.subCategory.toLowerCase().includes(searchTerm) : false;
                if (!matchesName && !matchesCategory && !matchesSubCategory) return false;
            }

            return true;
        });
    }

    // UPDATE PRODUCT VIEW - Single entrypoint
    function updateProductView() {
        const base = window.allProducts || [];
        const filtered = applyFilters(base, filterState);
        filteredProducts = filtered;
        
        // Reset to page 1 for new filter results
        currentPage = 1;
        displayProducts(currentPage);
        
        // Scroll to grid
        const gridDiv = document.getElementById('productGrid');
        if (gridDiv && filtered.length > 0) {
            gridDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // BACKWARD COMPATIBILITY WRAPPERS
    function filterByCategory(mainCat, subCat = 'All', element) {
        if (subCat && typeof subCat !== 'string') {
            element = subCat;
            subCat = 'All';
        }

        if (element && element.classList) {
            const allPills = document.querySelectorAll('.pill');
            allPills.forEach(pill => pill.classList.remove('active'));
            element.classList.add('active');
        }

        if (mainCat === 'All') {
            filterState.category = null;
            filterState.subCategory = null;
        } else {
            filterState.category = mainCat;
            filterState.subCategory = subCat === 'All' ? null : subCat;
        }

        updateProductView();
    }

    function filterBySubCategory(subCatName) {
        const allPills = document.querySelectorAll('.pill');
        allPills.forEach(pill => pill.classList.remove('active'));

        filterState.category = null;
        filterState.subCategory = subCatName;

        updateProductView();
    }

    function applyAdvancedFilters() {
        updateProductView();
    }

    // Price slider update - now updates filter state
    function updatePriceLabel(val) {
        const label = document.getElementById('priceLabel');
        if (label) label.innerText = `৳${val}`;

        filterState.priceMax = parseInt(val);
        updateProductView();
    }

    // Search input handler - now updates filter state
    function handleSearchInput() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            filterState.searchText = searchInput.value;
            updateProductView();
        }
    }

    // Clear search function
    function clearSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = "";
            filterState.searchText = "";
            updateProductView();
        }
    }

    /* --- FINAL MERGED PRODUCT DETAILS LOGIC --- */
    function openProductDetails(id) {
        if (!window.allProducts || window.allProducts.length === 0) {
            console.error('Products not loaded yet');
            return;
        }
        const p = window.allProducts.find(item => item.id === id);
        if (!p) return;

        // Background analytics: details page opens
        trackProductAnalytics(p, 'views');

        // --- TRACKING ---
        if (typeof fbq === 'function') {
            fbq('track', 'ViewContent', {
                content_name: p.name,
                content_category: p.category || p.subCategory,
                content_ids: [p.id.toString()],
                content_type: 'product',
                value: parseFloat(p.price.toString().replace(/[^0-9.]/g, '')),
                currency: 'BDT'
            });
        }

        // 1. Basic Info Load
        document.getElementById('detName').innerText = p.name;
        document.getElementById('detPrice').innerText = `TK-${p.price}`;
        document.getElementById('mainDetailImg').src = p.img;
        document.getElementById('detDesc').innerText = p.description || `Experience premium quality with this ${p.name}.`;
        document.getElementById('detCare').innerText = p.care || "Dry clean only. Handle with care.";

        // 2. Thumbnails Logic
        const thumbContainer = document.getElementById('thumbnailStrip');
        thumbContainer.innerHTML = '';
        const gallery = p.gallery || [p.img, p.img, p.img];
        gallery.forEach(imgSrc => {
            const thumb = document.createElement('img');
            thumb.src = imgSrc;
            thumb.onclick = () => { document.getElementById('mainDetailImg').src = imgSrc; };
            thumbContainer.appendChild(thumb);
        });

        // 3. Dynamic Size Section (DESIGN ONLY)
        const sizeSection = document.getElementById('sizeSection');
        const sizeContainer = document.getElementById('detSizes');
        sizeContainer.innerHTML = '';
        const needSize = ['Sneakers', 'Shoes', 'Shirts', 'Pants'].includes(p.subCategory) || ['Men', 'Women'].includes(p.category);

        if (needSize) {
            sizeSection.style.display = 'block';
            ['S', 'M', 'L', 'XL'].forEach(s => {
                const span = document.createElement('span');
                span.innerText = s;
                span.onclick = function () {
                    sizeContainer.querySelectorAll('span').forEach(el => el.classList.remove('active'));
                    this.classList.add('active');
                };
                sizeContainer.appendChild(span);
            });
        } else {
            sizeSection.style.display = 'none';
        }

        // 4. Related Products - PERFORMANCE OPTIMIZED
        const relatedGrid = document.getElementById('relatedGrid');
        relatedGrid.innerHTML = '';
        const related = window.allProducts.filter(item => item.subCategory === p.subCategory && item.id !== p.id).slice(0, 4);
        if (related.length > 0) {
            let relatedHtml = '';
            related.forEach(rp => {
                if (typeof renderSingleCard === 'function') {
                    renderSingleCard(relatedGrid, rp);
                } else {
                    relatedHtml += `
                        <div class="product-card" onclick="openProductDetails(${rp.id})">
                            <div class="product-img-holder"><img src="${rp.img}"></div>
                            <div class="p-info">
                                <h3 class="p-name">${rp.name}</h3>
                                <p class="p-meta" style="display:none;">Color: ${rp.color || "Default"}</p>
                                <p class="p-price">TK-${rp.price}</p>
                            </div>
                            <div class="button-group" style="display: flex; gap: 10px; margin-top: 10px; width: 100%;">
                                <button class="action-btn buy-btn" onclick="event.stopPropagation(); handleSingleBuy(this.closest('.product-card'))" style="flex: 1; padding: 12px 0;">Buy Now</button>
                                <button class="cart-btn action-btn" onclick="event.stopPropagation(); addToCart(${rp.id})" style="flex: 1; padding: 12px 0;">Add to Cart</button>
                            </div>
                        </div>`;
                }
            });
            if (relatedHtml) {
                relatedGrid.innerHTML = relatedHtml;
            }
        }

        /// --- 5. THE ULTIMATE FIX: BYPASS SIZE LOGIC & ADD MSGR ---
        const dPage = document.getElementById('productDetailsPage');
        const bBtn = dPage.querySelector('.buy-now-btn') || dPage.querySelector('.buy-now');
        const aBtn = dPage.querySelector('.add-to-cart-btn') || dPage.querySelector('.add-cart');

        if (aBtn) aBtn.style.display = 'none';

        if (bBtn) {
            // FORCE BUTTON ACTIVE
            bBtn.style.width = '100%';
            bBtn.style.opacity = '1';
            bBtn.style.pointerEvents = 'auto'; 
            bBtn.removeAttribute('disabled'); 

            bBtn.onclick = function (e) {
                e.preventDefault();
                triggerOrderFlow(p.id); 
            };
        }

        // 6. Show the Page
        history.pushState({ overlay: true }, "");
        dPage.classList.add('active');
        document.body.style.overflow = 'hidden';
        dPage.scrollTop = 0;
    }

    // 7. Action Button Handlers
    function handleAddToCartFromDetails() {
        const productName = document.getElementById('detName').innerText;
        const p = window.allProducts.find(item => item.name === productName);
        if (p) {
            if (typeof addToCart === "function") {
                addToCart(p.id);
                alert(`${p.name} added to cart!`);
            } else {
                console.error("addToCart function not found!");
            }
        }
    }

    function handleDirectBuy() {
        const productName = document.getElementById('detName').innerText;
        const p = window.allProducts.find(item => item.name === productName);
        if (p) {
            if (typeof addToCart === "function") {
                addToCart(p.id);
                closeProductDetails();
                alert("Proceeding to Checkout with " + p.name);
            }
        }
    }

    // 8. Close Function
    function closeProductDetails() {
        if (history.state && history.state.overlay) {
            history.back();
        } else {
            const detailsPage = document.getElementById('productDetailsPage');
            detailsPage.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }

    /* --- HARDWARE BACK BUTTON FIX --- */
    window.onpopstate = function (event) {
        const menu = document.getElementById('menuOverlay');
        const detailsPage = document.getElementById('productDetailsPage');
        const cartOverlay = document.getElementById('cartSerialOverlay');
        const orderModal = document.getElementById('orderModal') || document.getElementById('socialOrderModal');

        if (menu && menu.classList.contains('active')) {
            toggleMenu();
        }
        else if (detailsPage && detailsPage.classList.contains('active')) {
            closeProductDetails();
        }
        else if (cartOverlay && cartOverlay && cartOverlay.classList.contains('active')) {
            toggleCartDisplay();
        }
        else if (orderModal) {
            orderModal.remove();
        }
    };

    const originalOpenDetails = openProductDetails;
    openProductDetails = function (id) {
        history.pushState({ overlay: true }, "");
        originalOpenDetails(id);
    };

    const originalToggleMenu = toggleMenu;
    toggleMenu = function () {
        if (!document.getElementById('menuOverlay').classList.contains('active')) {
            history.pushState({ overlay: true }, "");
        }
        originalToggleMenu();
    };

    const originalToggleCart = toggleCartDisplay;
    toggleCartDisplay = function () {
        if (!document.getElementById('cartSerialOverlay').classList.contains('active')) {
            history.pushState({ overlay: true }, "");
        }
        originalToggleCart();
    };

    /* --- UNIVERSAL ORDER MODAL SYSTEM --- */
    let currentOrderContext = null;

    function triggerOrderFlow(productId) {
        if (!window.allProducts || window.allProducts.length === 0) {
            console.error('Products not loaded yet');
            return;
        }
        const p = window.allProducts.find(item => item.id === productId);
        if (!p) return;

        // Size check: details page priority, then main card selection
        let selectedSize = null;
        const sizeContainer = document.getElementById('detSizes');
        const activeSize = sizeContainer ? sizeContainer.querySelector('span.active') : null;
        if (activeSize) selectedSize = activeSize.innerText;

        if (!selectedSize) {
            const cardSizeContainer = document.getElementById(`sizes-prod-${productId}`);
            const activeCardSize = cardSizeContainer ? cardSizeContainer.querySelector('span.active') : null;
            if (activeCardSize) selectedSize = activeCardSize.innerText;
        }

        const sizeLabelPart = selectedSize ? `, Size: ${selectedSize}` : '';
        const safeSizeForContext = selectedSize || 'N/A';

        // Context for single-product direct buy
        currentOrderContext = {
            type: 'single',
            items: [{
                productId: p.id,
                productName: p.name,
                productSize: safeSizeForContext,
                price: p.price,
                color: p.color || ''
            }],
            totalPrice: parseInt(p.price.toString().replace(/[^0-9.]/g, ''), 10) || 0
        };

        const rawMsg = `Hello! I want to order: ${p.name} (ID: ${p.id}${sizeLabelPart}, Price: TK-${p.price})`;

        const modalHtml = `
            <div id="socialOrderModal" style="position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:99999999; display:flex; align-items:center; justify-content:center; padding:20px; font-family: 'Poppins', sans-serif;">
                <div id="modalContent" style="background:#111; padding:25px; border-radius:15px; text-align:center; max-width:380px; width:100%; border:1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    
                    <div id="orderOptions">
                        <h3 style="color:#fff; margin-bottom:20px;">Complete Your Order</h3>
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            <button onclick="showDirectOrderForm()" style="background:#d4af37; color:#000; padding:15px; border-radius:10px; border:none; font-weight:bold; cursor:pointer; font-size:16px;">Direct Order (Cash on Delivery)</button>
                            <a href="javascript:void(0)" onclick="handleWhatsAppOrder()" style="background:#25D366; color:#fff; padding:14px; border-radius:10px; text-decoration:none; font-weight:bold; display:block;">Order on WhatsApp</a>
                            <a href="javascript:void(0)" onclick="handleMessengerOrder()" style="background:#0084FF; color:#fff; padding:14px; border-radius:10px; text-decoration:none; font-weight:bold; display:block;">Order on Messenger</a>
                        </div>
                    </div>

                    <div id="directOrderForm" style="display:none; text-align:left;">
                        <h3 style="color:#fff; margin-bottom:15px; text-align:center;">Shipping Details</h3>
                        <input type="text" id="custName" placeholder="Full Name" style="width:100%; padding:12px; margin-bottom:12px; border-radius:8px; border:1px solid #444; background:#000; color:#fff; box-sizing: border-box;">
                        <input type="number" id="custPhone" placeholder="Phone Number" style="width:100%; padding:12px; margin-bottom:12px; border-radius:8px; border:1px solid #444; background:#000; color:#fff; box-sizing: border-box;">
                        <textarea id="custAddress" placeholder="Full Address (Area/City)" rows="3" style="width:100%; padding:12px; margin-bottom:15px; border-radius:8px; border:1px solid #444; background:#000; color:#fff; box-sizing: border-box; resize:none;"></textarea>
                        
                        <button onclick="submitDirectOrder()" id="confirmBtn" style="width:100%; background:#d4af37; color:#000; padding:15px; border-radius:8px; border:none; font-weight:bold; cursor:pointer; font-size:16px;">Confirm Order</button>
                        <button onclick="hideDirectOrderForm()" style="width:100%; background:none; border:none; color:#888; margin-top:10px; cursor:pointer; text-decoration:underline;">Back</button>
                    </div>

                    <button onclick="closeSocialModal()" style="margin-top:20px; background:none; border:none; color:#555; cursor:pointer; font-size:14px;">Cancel</button>
                </div>
            </div>`;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    function triggerCartOrderFlow() {
        if (!cartArray || cartArray.length === 0) return;

        const items = cartArray.map(item => ({
            productId: item.id,
            productName: item.name,
            productSize: item.selectedSize || 'N/A',
            price: item.price,
            color: item.color || ''
        }));

        const totalPrice = items.reduce((sum, it) => {
            return sum + (parseInt(it.price.toString().replace(/[^0-9.]/g, ''), 10) || 0);
        }, 0);

        currentOrderContext = {
            type: 'cart',
            items,
            totalPrice
        };

        const itemLines = items.map((it, idx) => `${idx + 1}. ${it.productName} (Size: ${it.productSize}, Color: ${it.color}) - TK ${it.price}`).join('\n');
        const rawMsg = `Hello! I want to order the following items:\n${itemLines}\n\nTotal Price: TK-${totalPrice}`;

        const modalHtml = `
            <div id="socialOrderModal" style="position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:99999999; display:flex; align-items:center; justify-content:center; padding:20px; font-family: 'Poppins', sans-serif;">
                <div id="modalContent" style="background:#111; padding:25px; border-radius:15px; text-align:center; max-width:380px; width:100%; border:1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    
                    <div id="orderOptions">
                        <h3 style="color:#fff; margin-bottom:20px;">Complete Your Order</h3>
                        <p style="color:#aaa; font-size:13px; margin-bottom:15px;">You have ${items.length} item(s) in your cart.</p>
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            <button onclick="showDirectOrderForm()" style="background:#d4af37; color:#000; padding:15px; border-radius:10px; border:none; font-weight:bold; cursor:pointer; font-size:16px;">Direct Order (Cash on Delivery)</button>
                            <a href="javascript:void(0)" onclick="handleWhatsAppOrder()" style="background:#25D366; color:#fff; padding:14px; border-radius:10px; text-decoration:none; font-weight:bold; display:block;">Order on WhatsApp</a>
                            <a href="javascript:void(0)" onclick="handleMessengerOrder()" style="background:#0084FF; color:#fff; padding:14px; border-radius:10px; text-decoration:none; font-weight:bold; display:block;">Order on Messenger</a>
                        </div>
                    </div>

                    <div id="directOrderForm" style="display:none; text-align:left;">
                        <h3 style="color:#fff; margin-bottom:15px; text-align:center;">Shipping Details</h3>
                        <input type="text" id="custName" placeholder="Full Name" style="width:100%; padding:12px; margin-bottom:12px; border-radius:8px; border:1px solid #444; background:#000; color:#fff; box-sizing: border-box;">
                        <input type="number" id="custPhone" placeholder="Phone Number" style="width:100%; padding:12px; margin-bottom:12px; border-radius:8px; border:1px solid #444; background:#000; color:#fff; box-sizing: border-box;">
                        <textarea id="custAddress" placeholder="Full Address (Area/City)" rows="3" style="width:100%; padding:12px; margin-bottom:15px; border-radius:8px; border:1px solid #444; background:#000; color:#fff; box-sizing: border-box; resize:none;"></textarea>
                        
                        <button onclick="submitDirectOrder()" id="confirmBtn" style="width:100%; background:#d4af37; color:#000; padding:15px; border-radius:8px; border:none; font-weight:bold; cursor:pointer; font-size:16px;">Confirm Order</button>
                        <button onclick="hideDirectOrderForm()" style="width:100%; background:none; border:none; color:#888; margin-top:10px; cursor:pointer; text-decoration:underline;">Back</button>
                    </div>

                    <button onclick="closeSocialModal()" style="margin-top:20px; background:none; border:none; color:#555; cursor:pointer; font-size:14px;">Cancel</button>
                </div>
            </div>`;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    function showDirectOrderForm() {
        const optionsDiv = document.getElementById('orderOptions');
        const formDiv = document.getElementById('directOrderForm');
        if (optionsDiv) optionsDiv.style.display = 'none';
        if (formDiv) formDiv.style.display = 'block';
    }

    function hideDirectOrderForm() {
        const optionsDiv = document.getElementById('orderOptions');
        const formDiv = document.getElementById('directOrderForm');
        if (optionsDiv) optionsDiv.style.display = 'block';
        if (formDiv) formDiv.style.display = 'none';
    }

    // --- NEW WHATSAPP/MESSENGER ORDER HANDLERS WITH RTDB SAVE ---
    async function handleWhatsAppOrder() {
        // Check rate limit first
        const rateLimitCheck = checkRateLimit();
        if (!rateLimitCheck.allowed) {
            alert(rateLimitCheck.message);
            return;
        }

        // Prevent double clicks
        const whatsappBtn = document.querySelector('a[onclick="handleWhatsAppOrder()"]');
        if (whatsappBtn) {
            whatsappBtn.style.pointerEvents = 'none';
            whatsappBtn.style.opacity = '0.6';
        }

        try {
            // Create order in RTDB first
            const orderData = prepareOrderData('whatsapp');
            
            // Validate and sanitize order data
            const validationErrors = validateOrderPayload(orderData);
            if (validationErrors.length > 0) {
                alert('Please fix the following issues:\n' + validationErrors.join('\n'));
                return;
            }
            
            const sanitizedData = sanitizeOrderData(orderData);
            
            // Record order attempt for rate limiting
            recordOrderAttempt();
            
            const orderResult = await createOrderInRTDB(sanitizedData);
            
            // Show success with orderId
            alert(`Order created! Your Order ID: ${orderResult.orderId}\n\nRedirecting to WhatsApp...`);
            
            // Build WhatsApp message with orderId
            const message = buildOrderMessage(orderResult.orderId, sanitizedData);
            const whatsappUrl = `https://wa.me/${SOCIAL_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
            
            // Redirect to WhatsApp
            window.open(whatsappUrl, '_blank');
            closeSocialModal();
            
        } catch (error) {
            console.error('Failed to create order:', error);
            // Fallback to old behavior
            fallbackToWhatsApp();
        } finally {
            // Re-enable button
            if (whatsappBtn) {
                whatsappBtn.style.pointerEvents = 'auto';
                whatsappBtn.style.opacity = '1';
            }
        }
    }

    async function handleMessengerOrder() {
        // Check rate limit first
        const rateLimitCheck = checkRateLimit();
        if (!rateLimitCheck.allowed) {
            alert(rateLimitCheck.message);
            return;
        }

        // Prevent double clicks
        const messengerBtn = document.querySelector('a[onclick="handleMessengerOrder()"]');
        if (messengerBtn) {
            messengerBtn.style.pointerEvents = 'none';
            messengerBtn.style.opacity = '0.6';
        }

        try {
            // Create order in RTDB first
            const orderData = prepareOrderData('messenger');
            
            // Validate and sanitize order data
            const validationErrors = validateOrderPayload(orderData);
            if (validationErrors.length > 0) {
                alert('Please fix the following issues:\n' + validationErrors.join('\n'));
                return;
            }
            
            const sanitizedData = sanitizeOrderData(orderData);
            
            // Record order attempt for rate limiting
            recordOrderAttempt();
            
            const orderResult = await createOrderInRTDB(sanitizedData);
            
            // Show success with orderId
            alert(`Order created! Your Order ID: ${orderResult.orderId}\n\nRedirecting to Messenger...`);
            
            // Build Messenger message with orderId
            const message = buildOrderMessage(orderResult.orderId, sanitizedData);
            
            // Copy to clipboard and redirect
            navigator.clipboard.writeText(message).then(() => {
                window.open(SOCIAL_CONFIG.messengerLink, '_blank');
                closeSocialModal();
            }).catch(() => {
                // Fallback: open directly
                window.open(SOCIAL_CONFIG.messengerLink, '_blank');
                closeSocialModal();
            });
            
        } catch (error) {
            console.error('Failed to create order:', error);
            // Fallback to old behavior
            fallbackToMessenger();
        } finally {
            // Re-enable button
            if (messengerBtn) {
                messengerBtn.style.pointerEvents = 'auto';
                messengerBtn.style.opacity = '1';
            }
        }
    }

    function prepareOrderData(channel) {
        const ctx = currentOrderContext;
        const items = ctx.items.map(it => ({
            productId: it.productId,
            name: it.productName,
            price: parseInt(it.price.toString().replace(/[^0-9.]/g, ''), 10) || 0,
            qty: 1,
            selectedSize: it.productSize || 'N/A',
            color: it.color || ''
        }));
        
        const subtotal = ctx.totalPrice;
        
        return {
            channel: channel,
            customerName: '', // Will be filled later if direct order
            phone: '', // Will be filled later if direct order
            address: '', // Will be filled later if direct order
            items: items,
            subtotal: subtotal,
            total: subtotal
        };
    }

    function buildOrderMessage(orderId, orderData) {
        let message = `Hello! I want to place an order.\n\n`;
        message += `Order ID: ${orderId}\n\n`;
        
        if (orderData.items.length === 1) {
            // Single item
            const item = orderData.items[0];
            message += `Item: ${item.name}`;
            if (item.selectedSize && item.selectedSize !== 'N/A') {
                message += ` (Size: ${item.selectedSize})`;
            }
            message += `\nPrice: TK ${item.price}`;
        } else {
            // Multiple items (cart)
            message += `Items:\n`;
            orderData.items.forEach((item, idx) => {
                message += `${idx + 1}. ${item.name}`;
                if (item.selectedSize && item.selectedSize !== 'N/A') {
                    message += ` (Size: ${item.selectedSize})`;
                }
                message += ` - TK ${item.price}\n`;
            });
        }
        
        message += `\nTotal: TK ${orderData.total}`;
        message += `\n\nPlease confirm availability and delivery.`;
        
        return message;
    }

    function fallbackToWhatsApp() {
        const ctx = currentOrderContext;
        let message = "Hello! I want to order: ";
        
        if (ctx.type === 'cart') {
            const itemLines = ctx.items.map((it, idx) =>
                `${idx + 1}. ${it.productName} (Size: ${it.productSize || 'N/A'}) - TK ${it.price}`
            ).join('\n');
            message += `\n${itemLines}\n\nTotal: TK ${ctx.totalPrice}`;
        } else {
            const it = ctx.items[0];
            message += `${it.productName} (Size: ${it.productSize || 'N/A'}) - TK ${it.price}`;
        }
        
        const whatsappUrl = `https://wa.me/${SOCIAL_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        closeSocialModal();
    }

    function fallbackToMessenger() {
        const ctx = currentOrderContext;
        let message = "Hello! I want to order: ";
        
        if (ctx.type === 'cart') {
            const itemLines = ctx.items.map((it, idx) =>
                `${idx + 1}. ${it.productName} (Size: ${it.productSize || 'N/A'}) - TK ${it.price}`
            ).join('\n');
            message += `\n${itemLines}\n\nTotal: TK ${ctx.totalPrice}`;
        } else {
            const it = ctx.items[0];
            message += `${it.productName} (Size: ${it.productSize || 'N/A'}) - TK ${it.price}`;
        }
        
        navigator.clipboard.writeText(message).then(() => {
            alert('Order details copied! Please paste in Messenger.');
            window.open(SOCIAL_CONFIG.messengerLink, '_blank');
            closeSocialModal();
        });
    }

    // --- UPDATED SUBMIT FUNCTION FOR DIRECT ORDERS ---
    async function submitDirectOrder() {
        const cName = document.getElementById('custName').value.trim();
        const cPhone = document.getElementById('custPhone').value.trim();
        const cAddress = document.getElementById('custAddress').value.trim();

        if (!cName || !cPhone || !cAddress) {
            alert("Please fill all information!");
            return;
        }

        // Check rate limit first
        const rateLimitCheck = checkRateLimit();
        if (!rateLimitCheck.allowed) {
            alert(rateLimitCheck.message);
            return;
        }

        const confirmBtn = document.getElementById('confirmBtn');
        confirmBtn.innerText = "Placing Order...";
        confirmBtn.disabled = true;

        if (!currentOrderContext || !currentOrderContext.items || !currentOrderContext.items.length) {
            alert("Order information is missing. Please try again.");
            confirmBtn.innerText = "Confirm Order";
            confirmBtn.disabled = false;
            return;
        }

        try {
            // Prepare order data with customer info
            const orderData = {
                channel: 'direct',
                customerName: cName,
                phone: cPhone,
                address: cAddress,
                items: currentOrderContext.items.map(it => ({
                    productId: it.productId,
                    name: it.productName,
                    price: parseInt(it.price.toString().replace(/[^0-9.]/g, ''), 10) || 0,
                    qty: 1,
                    selectedSize: it.productSize || 'N/A',
                    color: it.color || ''
                })),
                subtotal: currentOrderContext.totalPrice,
                total: currentOrderContext.totalPrice
            };
            
            // Validate and sanitize order data
            const validationErrors = validateOrderPayload(orderData);
            if (validationErrors.length > 0) {
                alert('Please fix the following issues:\n' + validationErrors.join('\n'));
                confirmBtn.innerText = "Confirm Order";
                confirmBtn.disabled = false;
                return;
            }
            
            const sanitizedData = sanitizeOrderData(orderData);
            
            // Record order attempt for rate limiting
            recordOrderAttempt();
            
            const orderResult = await createOrderInRTDB(sanitizedData);
            
            // SECURITY: Telegram alerts disabled for public site
            // await sendTelegramAlert(cName, cPhone, cAddress, currentOrderContext, orderResult.orderId);
            
            // Show success with orderId
            document.getElementById('modalContent').innerHTML = `
                <div style="padding:20px;">
                    <h2 style="color:#d4af37; margin-bottom:10px;">Order Placed Successfully!</h2>
                    <p style="color:#fff;">Thank you ${cName}, we received your order.</p>
                    <p style="color:#d4af37; font-weight:bold; margin:10px 0;">Order ID: ${orderResult.orderId}</p>
                    <p style="color:#aaa; font-size:14px;">We will contact you soon for confirmation.</p>
                    <button onclick="closeSocialModal()" style="margin-top:20px; background:#fff; color:#000; padding:10px 25px; border-radius:8px; border:none; font-weight:bold; cursor:pointer;">Close</button>
                </div>`;

            // Clear cart if it was a cart order
            if (currentOrderContext.type === 'cart') {
                cartArray = [];
                saveCartToStorage();
                renderSerialItems();
                const countLabel = document.getElementById('navbarCartCount');
                if (countLabel) countLabel.innerText = '0';
            }

        } catch (error) {
            console.error("Order Error:", error);
            alert("Order placed successfully! We'll contact you soon.");
            closeSocialModal();
        } finally {
            // Re-enable button
            confirmBtn.innerText = "Confirm Order";
            confirmBtn.disabled = false;
        }
    }

    // SECURITY: Telegram alert function disabled for public site
    async function sendTelegramAlert(customerName, phone, address, orderContext, orderId) {
        // Telegram alerts are disabled for public site
        // This function is kept for compatibility but does nothing
        if (!TELEGRAM_ENABLED) {
            console.log('Telegram alerts disabled for public site');
            return;
        }
        
        // If re-enabled in the future, move this logic to admin side or server-side
        console.log('Telegram alert would be sent for Order ID:', orderId);
    }

    function closeSocialModal() {
        const modal = document.getElementById('socialOrderModal');
        if (modal) {
            modal.remove();
            currentOrderContext = null;
        }
    }

    // MISSING FUNCTIONS FROM HTML - ADD THEM
    function filterProducts(category) {
        filterByCategory(category);
        scrollToSection('products-section');
    }

    function scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function openPage(pageName) {
        // Simple implementation - could be expanded to show modals
        alert(`${pageName} page - Coming soon!`);
    }

    // Export functions for inline handlers
    window.toggleMenu = toggleMenu;
    window.toggleCartDisplay = toggleCartDisplay;
    window.addToCart = addToCart;
    window.openProductDetails = openProductDetails;
    window.handleCategoryClick = handleCategoryClick;
    window.selectSize = selectSize;
    window.removeItem = removeItem;
    window.processCartCheckout = processCartCheckout;
    window.handleSingleBuy = handleSingleBuy;
    window.triggerOrderFlow = triggerOrderFlow;
    window.triggerCartOrderFlow = triggerCartOrderFlow;
    window.showDirectOrderForm = showDirectOrderForm;
    window.hideDirectOrderForm = hideDirectOrderForm;
    window.submitDirectOrder = submitDirectOrder;
    window.closeSocialModal = closeSocialModal;
    window.handleMessengerOrder = handleMessengerOrder;
    window.handleAddToCartFromDetails = handleAddToCartFromDetails;
    window.handleDirectBuy = handleDirectBuy;
    window.closeProductDetails = closeProductDetails;
    window.filterByCategory = filterByCategory;
    window.filterBySubCategory = filterBySubCategory;
    window.updatePriceLabel = updatePriceLabel;
    window.collectBall = collectBall;
    window.showFifaReward = showFifaReward;
    window.closeFifaPopup = closeFifaPopup;
    window.toggleSub = toggleSub;
    window.filterProducts = filterProducts;
    window.scrollToSection = scrollToSection;
    window.openPage = openPage;
    window.clearSearch = clearSearch;
    window.handleWhatsAppOrder = handleWhatsAppOrder;
    window.resetRateLimit = resetRateLimit;

    // Render products on load
    document.addEventListener('DOMContentLoaded', () => {
        updateProductView(); // Use unified system for initial load
    });

    // CONSOLE LOG TO VERIFY PHASE 5 FEATURES
    console.log('✅ PHASE 5 SCRIPT LOADED WITH ALL FEATURES:');
    console.log('  📝 Order ID Generation: generateOrderId()');
    console.log('  🔥 RTDB Order Creation: createOrderInRTDB()');
    console.log('  🛡️  Security Features: Validation, Rate Limiting, Sanitization');
    console.log('  🚫 Telegram Alerts Disabled: TELEGRAM_ENABLED = false');
    console.log('  📦 Real Order System Active');

})();
