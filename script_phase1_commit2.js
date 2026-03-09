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

    /* --- CART PERSISTENCE (COMMIT G) --- */
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

    /* --- BACKGROUND PRODUCT INTERACTION ANALYTICS (Firebase Realtime DB) --- */
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
                // console.debug('product_analytics error', e);
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

    /* --- SEARCH INDEXING OPTIMIZATION (COMMIT H) --- */
    const searchIndex = window.allProducts.map(product => ({
        id: product.id,
        name: product.name.toLowerCase(),
        category: product.category.toLowerCase(),
        subCategory: product.subCategory ? product.subCategory.toLowerCase() : '',
        img: product.img
    }));

    // Optimized search function
    function optimizedSearch(term) {
        if (!term) return [];
        
        const results = searchIndex.filter(item => 
            item.name.includes(term) || 
            item.category.includes(term) || 
            item.subCategory.includes(term)
        );
        
        return results.slice(0, 10); // Limit to 10 results
    }

    /* --- FIREBASE PRODUCT LOADER (COMMIT 1) --- */
    async function loadProductsFromFirebase() {
        if (!window.firebaseDB) {
            console.log('Firebase not available, using fallback products');
        // ... rest of the code remains the same ...
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
                    // Update search index
                    searchIndex.length = 0;
                    searchIndex.push(...window.allProducts.map(product => ({
                        id: product.id,
                        name: product.name.toLowerCase(),
                        category: product.category.toLowerCase(),
                        subCategory: product.subCategory ? product.subCategory.toLowerCase() : '',
                        img: product.img
                    })));
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

    /* --- 2. ENHANCED SEARCH FUNCTIONALITY (COMMIT C) --- */
    function initSearch() {
        const searchInput = document.querySelector('.stylish-search input');
        const suggestBox = document.getElementById('searchSuggestions');
        const clearBtn = document.getElementById('clearSearchBtn');

        if (!searchInput) return;

        let searchTimeout;

        // Enhanced search with debounce
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleSearch(e.target.value.toLowerCase().trim());
            }, 250); // Debounce
        });

        // ESC to close
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                suggestBox.style.display = 'none';
            }
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = "";
                suggestBox.style.display = 'none';
                searchInput.dispatchEvent(new Event('input'));
                searchInput.focus();
            });
        }

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.stylish-search')) {
                suggestBox.style.display = 'none';
            }
        });
    }

    function handleSearch(term) {
        const suggestBox = document.getElementById('searchSuggestions');
        
        if (!term) {
            suggestBox.style.display = 'none';
            return;
        }

        const results = optimizedSearch(term);

        if (results.length > 0) {
            suggestBox.innerHTML = results.map(item => `
                <div class="suggestion-item" onclick="openProductDetails(${item.id})">
                    <img src="${item.img}" class="suggestion-thumbnail" onerror="this.src='https://via.placeholder.com/40x40'">
                    <div class="suggestion-content">
                        <div class="suggestion-name">${item.name}</div>
                        <div class="suggestion-category">${item.category} ${item.subCategory ? '/ ' + item.subCategory : ''}</div>
                    </div>
                </div>
            `).join('');
            suggestBox.style.display = 'block';
        } else {
            suggestBox.style.display = 'none';
        }
    }

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
        // CSS e jodi .active use kora thake, tobe active use koro
        parent.classList.toggle('active');
        parent.classList.toggle('open');

        const icon = btn.querySelector('.plus-icon');
        if (icon) {
            // Luxury look er jonno minus sign (−) use kora hoyeche
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

    /* --- 5. HERO PARALLAX SMOOTHING (COMMIT F) --- */
    // Smooth Parallax with Throttling
    let parallaxTicking = false;

    function updateParallax() {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.hero-bg-image');
        
        parallaxElements.forEach(element => {
            const speed = 0.3; // Reduced sensitivity
            const yPos = -(scrolled * speed);
            const maxTranslate = -100; // Cap the movement
            const finalY = Math.max(yPos, maxTranslate);
            
            element.style.transform = `translate3d(0, ${finalY}px, 0)`;
        });
        
        parallaxTicking = false;
    }

    function requestTick() {
        if (!parallaxTicking) {
            requestAnimationFrame(updateParallax);
            parallaxTicking = true;
        }
    }

    // Disable on mobile
    if (window.innerWidth > 768) {
        window.addEventListener('scroll', requestTick, { passive: true });
    }

    // Glassmorphism effect for navbar
    window.addEventListener('scroll', function () {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });

    function showToast(productName) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        // ...
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
    /* --- ORDER LOGIC WITH FB TRACKING & MESSENGER COPY --- */

    function openOrderOptions(fullMessage) {
        // 1. FB Pixel Tracking: InitiateCheckout
        if (typeof fbq === 'function') {
            fbq('track', 'InitiateCheckout', {
                content_name: 'Order Modal Open',
                currency: 'BDT'
            });
        }

        const encodedMsg = encodeURIComponent(fullMessage);

        // Message-e single quote (') handle korar jonno escape logic
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
        // Clipboard-e text copy kora
        navigator.clipboard.writeText(message).then(() => {
            // Notification dekhano
            if (typeof showToast === "function") {
                showToast("Order details copied! Please paste it in Messenger.");
            } else {
                alert("Order details copied! Please paste it in our Messenger inbox.");
            }

            // 1.2 second delay jate user toast-ta dekhte pay, tarpore redirect
            setTimeout(() => {
                window.open(SOCIAL_CONFIG.messengerLink, '_blank');
                closeOrderModal();
            }, 1200);
        }).catch(err => {
            console.error('Could not copy text: ', err);
            // Fallback: Jodi clipboard access na thake, direct redirect hobe
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
        // Use the new universal 3-option checkout modal for cart orders
        if (typeof triggerCartOrderFlow === 'function') {
            triggerCartOrderFlow();
        }
    }

    // (Removed global click listener for .ready as we use direct onclick now)

    /* --- 8. PRODUCT RENDERING & PAGINATION (UPDATED WITH DETAILS TRIGGER) --- */

    function renderSingleCard(container, p) {
        // Related products / small cards - PERFORMANCE OPTIMIZED
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
        // Stop propagation jate size select korle details page na khule jay
        const options = document.querySelectorAll(`#sizes-prod-${prodId} span`);
        options.forEach(opt => opt.classList.remove('active'));
        element.classList.add('active');
    }

    function captureRecentView(element) {
        // 1. Pura card-er HTML copy kora
        const cardHTML = element.outerHTML;
        
        // 2. Name diye duplicate check kora
        const productName = element.querySelector('.p-name').innerText;
        let recentCards = JSON.parse(localStorage.getItem('recentCards')) || [];

        // Duplicate thakle ager-ta remove
        recentCards = recentCards.filter(html => !html.includes(`>${productName}<`));

        // Shuru-te add kora
        recentCards.unshift(cardHTML);

        // Max 4 items rakha
        if (recentCards.length > 4) recentCards.pop();

        localStorage.setItem('recentCards', JSON.stringify(recentCards));
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
                // Eikhane amra element-ta toiri korchi
                const card = document.createElement('div');
                card.className = 'product-card';
                
                // --- MAIN CHANGE EIKHANE ---
                card.onclick = function() { 
                    captureRecentView(this); // Ei line-ta pura HTML card-ke clone korbe
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
    function updatePagination() {
        const pBar = document.getElementById('paginationBar');
        if (!pBar) return;

        const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
        pBar.innerHTML = "";

        // Jodio 1tar beshi page thake tobei pagination dekhabe
        if (totalPages > 1) {
            for (let i = 1; i <= totalPages; i++) {
                const btn = document.createElement('button');
                btn.innerText = i;
                btn.className = `page-num ${i === currentPage ? 'active' : ''}`;
                btn.onclick = () => {
                    currentPage = i;
                    displayProducts(i);
                    window.scrollTo({ top: document.getElementById('productGrid').offsetTop - 100, behavior: 'smooth' });
                };
                pBar.appendChild(btn);
            }
        }
    }

    // Page load hoye gele loading screen hide korar jonno
    window.addEventListener('load', () => {
        const loader = document.getElementById('loadingScreen');
        if (loader) {
            loader.style.display = 'none';
        }

        // New Elegant Splash Screen Logic
        const splash = document.getElementById('splashScreen');
        if (splash) {
            // Minimum display time for the luxury animation to play out (2 seconds total)
            setTimeout(() => {
                splash.classList.add('hidden');
                // Remove from DOM after fade transition completes (1.2s CSS transition)
                setTimeout(() => {
                    splash.remove();
                }, 1200);
            }, 2200);
        }
    });

    // Extra precaution: Jodi load hote deri hoy, 3 second por auto hide hobe
    setTimeout(() => {
        const loader = document.getElementById('loadingScreen');
        if (loader && loader.style.display !== 'none') {
            loader.style.display = 'none';
        }
    }, 3000);

    /* --- FINAL MENU & FILTER BRIDGE --- */

    // 1. Menu item click handler
    function handleCategoryClick(event, mainCat, subCat) {
        event.preventDefault(); // Page jump stop korbe
        filterByCategory(mainCat, subCat); // Filter logic call korbe

        // Mobile-e menu auto bondho hobe
        const menu = document.getElementById('menuOverlay');
        if (menu) {
            if (history.state && history.state.overlay) {
                history.back();
            } else {
                menu.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        }
    }

    // 2. Updated Filter Logic (Pill active color change shoho)
    function filterByCategory(mainCat, subCat = 'All', element) {
        // 0. Smart Parameter Fix: Jodi 2nd parameter-e bhul kore 'element' chole ashe
        if (subCat && typeof subCat !== 'string') {
            element = subCat;
            subCat = 'All';
        }

        // 1. Current page reset
        if (typeof currentPage !== 'undefined') currentPage = 1;

        // 2. Active class logic (Button color highlight)
        if (element && element.classList) {
            const allPills = document.querySelectorAll('.pill');
            allPills.forEach(pill => pill.classList.remove('active'));
            element.classList.add('active');
        }

        // 3. Filtering logic (Main Category + Sub Category check)
        if (mainCat === 'All') {
            filteredProducts = [...window.allProducts];
        } else {
            // "Our Products" section er button click korle (subCat='All') sob sub-category dekhabe
            // Ar Menu theke specific kichu dile sudhu shetai dekhabe
            filteredProducts = window.allProducts.filter(p => {
                const matchCategory = p.category === mainCat;
                const matchSubCategory = (subCat === 'All' || p.subCategory === subCat);
                return matchCategory && matchSubCategory;
            });
        }

        // 4. Grid update kora (Pagination logic shoho)
        displayProducts(currentPage);

        // 5. Scroll to grid
        const gridDiv = document.getElementById('productGrid');
        if (gridDiv && filteredProducts.length > 0) {
            gridDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
                // Eikhane click korle shudhu visual change hobe, button block hobe na
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
                // Eikhane amra puraton modal code muche direct triggerOrderFlow call korchi
                triggerOrderFlow(p.id); 
            };
        }

        // 6. Show the Page
        history.pushState({ overlay: true }, "");
        dPage.classList.add('active');
        document.body.style.overflow = 'hidden';
        dPage.scrollTop = 0;
    } // <-- openProductDetails function eikhane shesh

    // 7. Action Button Handlers (Eigulo nouton add kora hoyeche)
    function handleAddToCartFromDetails() {
        const productName = document.getElementById('detName').innerText;
        const p = window.allProducts.find(item => item.name === productName);
        if (p) {
            // Tumi tomar existing addToCart function ta eikhane call korbe
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
                // Buy Now logic: Cart open kora ba Checkout e niye jawa
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


    /* --- ADVANCED FILTER LOGIC (TK & S/M/L/XL CONNECTED) --- */

    // Global states for filters
    let currentCategory = 'All'; // Eta age thekei thakar kotha
    let currentMaxPrice = 5000;

    // Price Slider update function
    function updatePriceLabel(val) {
        // UI-te Taka symbol show kora
        const label = document.getElementById('priceLabel'); // HTML-e id="priceLabel" thakle
        if (label) label.innerText = `৳${val}`;

        currentMaxPrice = parseInt(val);
        applyAdvancedFilters();
    }

    // Main Filter Function
    function applyAdvancedFilters() {
        const searchInput = document.getElementById('searchInput');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";

        window.filteredProducts = window.allProducts.filter(product => {
            // 1. Price Connection: String (TK) hole number-e convert korbe
            const productPriceNum = typeof product.price === 'string'
                ? parseInt(product.price.replace(/[^0-9]/g, ''))
                : product.price;

            // 2. Filter Conditions
            const matchesCategory = currentCategory === 'All' || product.category === currentCategory;
            const matchesSearch = product.name.toLowerCase().includes(searchTerm);
            const matchesPrice = productPriceNum <= currentMaxPrice;

            return matchesCategory && matchesSearch && matchesPrice;
        });

        // Pagination reset kora bhalo jate filter korle 1st page theke dekhay
        currentPage = 1;
        displayProducts(currentPage);
    }

    // Navbar search bar connectivity
    const searchBar = document.getElementById('searchInput');
    if (searchBar) {
        searchBar.addEventListener('input', applyAdvancedFilters);
    }

    // Category filter button gulo ke update kora (Existing function-er sathe sync)
    // Tomar existing filterByCategory function-er bhetore 'applyAdvancedFilters()' call kore dio

    //  trending and viewed section//
    // DEPRECATED: kept for reference; do not call.
    function filterBySubCategory_deprecated1(subCatName) {

        const filtered = window.allProducts.filter(p => p.subCategory === subCatName);

        const grid = document.getElementById('productGrid');

        if (!grid) return;

        // Optional: Product section-er title change kora (jodi title-er id 'sectionTitle' hoy)

        const title = document.getElementById('sectionTitle');

        if (title) title.innerText = subCatName + " Selection";

        grid.innerHTML = '';

        if (filtered.length > 0) {

            // PERFORMANCE OPTIMIZED: Use string builder instead of innerHTML +=
            let html = '';
            filtered.forEach(p => {
                html += `
                    <div class="product-card" onclick="openProductDetails(${p.id})">
                        <div class="product-img-holder">
                            <img src="${p.img}">
                        </div>
                        <div class="p-info">
                            <h3 class="p-name">${p.name}</h3>
                            <p class="p-price">TK-${p.price}</p>
                        </div>
                        ${buildSizeOptionsHTML(p)}
                        <div class="button-group" style="display:flex; gap:8px; margin-top:8px;">
                            <button class="action-btn buy-btn" onclick="event.stopPropagation(); triggerOrderFlow(${p.id})">Buy Now</button>
                            <button class="cart-btn action-btn" onclick="event.stopPropagation(); addToCart(${p.id})">Add to Cart</button>
                        </div>
                    </div>`;
            });
            grid.innerHTML = html;

            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } else {

            grid.innerHTML = `<p style="color:white; text-align:center; width:100%; padding: 50px 0;">No products found in ${subCatName}!</p>`;

        }

    }

    /* --- NEW HIGHLIGHT FILTER LOGIC (SAFE VERSION) --- */
    function filterBySubCategory(subCatName) {
        // 1. Current page reset kora jate 1st page theke shuru hoy
        if (typeof currentPage !== 'undefined') currentPage = 1;

        // 2. Pill button gulo theke active class shore fela
        const allPills = document.querySelectorAll('.pill');
        allPills.forEach(pill => pill.classList.remove('active'));

        // 3. Filter logic: global filteredProducts update kora
        if (typeof window.allProducts !== 'undefined') {
            window.filteredProducts = window.allProducts.filter(p => p.subCategory === subCatName);
        }

        // 4. Products display kora (Eita pagination logic shoho grid update korbe)
        displayProducts(currentPage);

        // 5. Scroll to grid
        const gridDiv = document.getElementById('productGrid');
        if (gridDiv && window.filteredProducts.length > 0) {
            gridDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function setupPagination(totalItems, itemsPerPage) {
        const paginationContainer = document.getElementById('paginationBar');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = '';
        const pageCount = Math.ceil(totalItems / itemsPerPage);

        if (pageCount <= 1) return;

        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '‹';
        prevBtn.className = 'page-btn nav-btn prev-btn';
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                currentPage -= 1;
                displayProducts(currentPage);
                window.scrollTo({ top: document.getElementById('productGrid').offsetTop - 100, behavior: 'smooth' });
            }
        };
        paginationContainer.appendChild(prevBtn);

        // Numbered buttons
        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button');
            btn.innerText = i;
            btn.className = (i === currentPage) ? 'page-btn page-num active' : 'page-btn page-num';

            btn.onclick = () => {
                currentPage = i;
                displayProducts(currentPage);
                window.scrollTo({ top: document.getElementById('productGrid').offsetTop - 100, behavior: 'smooth' });
            };
            paginationContainer.appendChild(btn);
        }

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '›';
        nextBtn.className = 'page-btn nav-btn next-btn';
        nextBtn.disabled = currentPage === pageCount;
        nextBtn.onclick = () => {
            if (currentPage < pageCount) {
                currentPage += 1;
                displayProducts(currentPage);
                window.scrollTo({ top: document.getElementById('productGrid').offsetTop - 100, behavior: 'smooth' });
            }
        };
        paginationContainer.appendChild(nextBtn);
    }

    /* --- HARDWARE BACK BUTTON FIX --- */

    // 1. Jokhon kono overlay open hobe, tokhon ei function-ta call korbe
    function pushNewState() {
        history.pushState({ overlayOpen: true }, "");
    }

    // 2. Browser-er back button click event listen kora
    window.onpopstate = function (event) {
        const menu = document.getElementById('menuOverlay');
        const detailsPage = document.getElementById('productDetailsPage');
        const cartOverlay = document.getElementById('cartSerialOverlay');
        const orderModal = document.getElementById('orderModal') || document.getElementById('socialOrderModal');

        // Jodi kono overlay open thake, tobe sheta bondho korbe (site theke ber hobe na)
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

    // 3. Tomar existing function-gulo te state push kora
    // Eigulo shudhu niche add koro, main function edit korar dorkar nai
    const originalOpenDetails = openProductDetails;
    openProductDetails = function (id) {
        pushNewState();
        originalOpenDetails(id);
    };

    const originalToggleMenu = toggleMenu;
    toggleMenu = function () {
        if (!document.getElementById('menuOverlay').classList.contains('active')) {
            pushNewState();
        }
        originalToggleMenu();
    };

    const originalToggleCart = toggleCartDisplay;
    toggleCartDisplay = function () {
        if (!document.getElementById('cartSerialOverlay').classList.contains('active')) {
            pushNewState();
        }
        originalToggleCart();
    };

    /* --- I DON'T KNOW WHAT I WANT (ROULETTE FEATURE) --- */
    function spinForRandomProduct() {
        const menu = document.getElementById('menuOverlay');
        if (menu) {
            menu.classList.remove('active');
            document.body.classList.remove('menu-open');
        }

        const overlay = document.getElementById('rouletteOverlay');
        const spinner = document.getElementById('rouletteSpinner');
        const resultText = document.getElementById('rouletteResultText');

        if (!overlay || !spinner || !resultText) return;

        // Reset UI
        resultText.classList.remove('show');
        resultText.innerText = '';

        // Generate an array of random product images to act as the "tape"
        const spinItems = [];
        const numSpins = 15; // Number of items it spins past before stopping

        for (let i = 0; i < numSpins; i++) {
            const randomP = window.allProducts[Math.floor(Math.random() * window.allProducts.length)];
            spinItems.push(randomP);
        }

        // The final winning product ensures it exists
        const winningProduct = spinItems[spinItems.length - 1];

        // Inject HTML into spinner
        spinner.innerHTML = spinItems.map(p => `<img src="${p.img}" alt="${p.name}">`).join('');

        // Reset spin position
        spinner.style.transition = 'none';
        spinner.style.transform = 'translateY(0)';

        // Show overlay
        overlay.classList.add('active');

        // Force reflow
        void spinner.offsetWidth;

        // Trigger spin animation
        const imageHeights = 300; // Expected from CSS

        spinner.style.transition = 'transform 2.5s cubic-bezier(0.15, 0.85, 0.3, 1)'; // Decelerating spin
        spinner.classList.add('spinning-blur');

        // Stop at the very last image
        const finalOffset = -1 * imageHeights * (numSpins - 1);
        spinner.style.transform = `translateY(${finalOffset}px)`;

        // Wait for spin to finish
        setTimeout(() => {
            spinner.classList.remove('spinning-blur');
            resultText.innerText = `You Discovered: ${winningProduct.name}`;
            resultText.classList.add('show');

            // Wait 1 second to let them read it, then open product
            setTimeout(() => {
                overlay.classList.remove('active');
                openProductDetails(winningProduct.id);
            }, 1200);

        }, 2500); // Must match transition time
    }


    // State management with LocalStorage
    let foundBalls = JSON.parse(localStorage.getItem('fifaBallsCollected')) || [];

    function initEasterEgg() {
        // Agey jeta paise oita hide kore dibe
        foundBalls.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });
    }

    function collectBall(id) {
        if (!foundBalls.includes(id)) {
            foundBalls.push(id);
            localStorage.setItem('fifaBallsCollected', JSON.stringify(foundBalls));
            
            // Visual feedback
            const ball = document.getElementById(id);
            ball.style.transform = "scale(2) rotate(360deg)";
            ball.style.opacity = "0";
            
            setTimeout(() => {
                ball.style.display = 'none';
            }, 400);

            // Toast message
            if(foundBalls.length < 3) {
                alert(`⚽ You found a World Cup Ball! (${foundBalls.length}/3)`);
            } else {
                showFifaReward();
            }
        }
    }

    function showFifaReward() {
        document.getElementById('fifa-popup').style.display = 'flex';
    }

    function closeFifaPopup() {
        document.getElementById('fifa-popup').style.display = 'none';
    }

    // Start the check on load
    initEasterEgg();


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

        // Context for single-product direct buy (Firebase + Telegram)
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
                            <a href="https://wa.me/8801601982509?text=${encodeURIComponent(rawMsg)}" target="_blank" style="background:#25D366; color:#fff; padding:14px; border-radius:10px; text-decoration:none; font-weight:bold; display:block;">Order on WhatsApp</a>
                            <a href="javascript:void(0)" onclick="handleMessengerOrder('${rawMsg.replace(/'/g, "\\'")}')" style="background:#0084FF; color:#fff; padding:14px; border-radius:10px; text-decoration:none; font-weight:bold; display:block;">Order on Messenger</a>
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
                            <a href="https://wa.me/8801601982509?text=${encodeURIComponent(rawMsg)}" target="_blank" style="background:#25D366; color:#fff; padding:14px; border-radius:10px; text-decoration:none; font-weight:bold; display:block;">Order on WhatsApp</a>
                            <a href="javascript:void(0)" onclick="handleMessengerOrder('${rawMsg.replace(/'/g, "\\'")}')" style="background:#0084FF; color:#fff; padding:14px; border-radius:10px; text-decoration:none; font-weight:bold; display:block;">Order on Messenger</a>
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

    function submitDirectOrder() {
        const name = document.getElementById('custName').value.trim();
        const phone = document.getElementById('custPhone').value.trim();
        const address = document.getElementById('custAddress').value.trim();

        if (!name || !phone || !address) {
            alert('Please fill in all fields');
            return;
        }

        // Build order summary
        let orderSummary = `New Order Received!\n\n`;
        orderSummary += `Customer Details:\n`;
        orderSummary += `Name: ${name}\n`;
        orderSummary += `Phone: ${phone}\n`;
        orderSummary += `Address: ${address}\n\n`;
        orderSummary += `Order Items:\n`;

        if (currentOrderContext.type === 'single') {
            const item = currentOrderContext.items[0];
            orderSummary += `- ${item.productName} (Size: ${item.productSize}, Color: ${item.color}) - TK ${item.price}\n`;
        } else {
            currentOrderContext.items.forEach((item, idx) => {
                orderSummary += `${idx + 1}. ${item.productName} (Size: ${item.productSize}, Color: ${item.color}) - TK ${item.price}\n`;
            });
        }

        orderSummary += `\nTotal Price: TK-${currentOrderContext.totalPrice}`;

        // Send to Firebase (optional)
        if (window.firebaseDB) {
            const orderRef = ref(window.firebaseDB, 'orders/' + Date.now());
            set(orderRef, {
                customer: { name, phone, address },
                items: currentOrderContext.items,
                totalPrice: currentOrderContext.totalPrice,
                timestamp: serverTimestamp(),
                status: 'pending'
            }).catch(err => console.error('Failed to save order:', err));
        }

        // Show confirmation
        alert('Order submitted successfully! We will contact you soon.');
        closeSocialModal();

        // Clear cart if it was a cart order
        if (currentOrderContext.type === 'cart') {
            cartArray = [];
            saveCartToStorage();
            renderSerialItems();
            const countLabel = document.getElementById('navbarCartCount');
            if (countLabel) countLabel.innerText = '0';
        }
    }

    function closeSocialModal() {
        const modal = document.getElementById('socialOrderModal');
        if (modal) {
            modal.remove();
            currentOrderContext = null;
        }
    }

    function handleMessengerOrder(message) {
        // Copy to clipboard then open Messenger
        navigator.clipboard.writeText(message).then(() => {
            alert('Order details copied! Please paste it in our Messenger inbox.');
            window.open('https://m.me/mushfikurrm0927', '_blank');
            closeSocialModal();
        }).catch(err => {
            console.error('Failed to copy:', err);
            // Fallback: open directly
            window.open('https://m.me/mushfikurrm0927', '_blank');
            closeSocialModal();
        });
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
    window.spinForRandomProduct = spinForRandomProduct;
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

    // Initialize search
    initSearch();

    // Render products on load
    document.addEventListener('DOMContentLoaded', () => {
        displayProducts(1);
    });

})();
