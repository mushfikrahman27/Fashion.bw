// admin/js/dashboard-fixed-final.js - COMPLETE ADMIN PANEL WITH ALL METHODS
// Connected to website product system, mobile responsive, proper structure

console.log('🔍 ADMIN DEBUG: Admin dashboard script loaded successfully!');

import { auth, db, storage } from '../../firebase-config.js';
import { 
    ref as dbRef, 
    onValue, 
    update, 
    remove, 
    push, 
    set,
    get
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { 
    ref as storageRef, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Toast notification system
class ToastManager {
    static show(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Main Admin Dashboard Class
class AdminDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.products = [];
        this.orders = [];
        this.settings = {};
        this.categories = ['Women', 'Men', 'Collection'];
        this.selectedImageFile = null;
        this.currentImageUrl = null;
        this.editingProductId = null;
        
        // Mobile menu state
        this.mobileMenuOpen = false;
        
        // Initialize the dashboard
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Admin Dashboard...');
        
        // Check authentication
        onAuthStateChanged(auth, (user) => {
            if (!user) {
                console.log('❌ No authenticated user, redirecting to login');
                window.location.href = "index.html";
                return;
            }
            
            console.log('✅ User authenticated, initializing dashboard');
            this.setupNavigation();
            this.loadInitialData();
            this.initializeUXImprovements();
            
            // AUTO-MIGRATE FALLBACK PRODUCTS TO UNIFY SOURCES (HARDENED)
            this.initializeMigrationIfNeeded();
        });
    }

    setupEventListeners() {
        // Navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.id.replace('nav', '').toLowerCase();
                this.navigateToSection(section);
            });
        });

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    setupNavigation() {
        // Load initial dashboard content
        this.loadDashboardContent();
    }

    navigateToSection(section) {
        console.log('📍 Navigating to:', section);
        
        // Update active navigation
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const activeNavItem = document.getElementById(`nav${section.charAt(0).toUpperCase() + section.slice(1)}`);
        if (activeNavItem) activeNavItem.classList.add('active');
        
        this.currentSection = section;
        this.loadSectionContent(section);
    }

    loadSectionContent(section) {
        // Hide all sections first
        const allSections = document.querySelectorAll('.section-content');
        allSections.forEach(s => {
            s.style.display = 'none';
        });
        
        // Show the selected section
        const targetSection = document.getElementById(`${section}Section`);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
        
        switch(section) {
            case 'dashboard':
                this.loadDashboardContent();
                break;
            case 'products':
                this.loadProductManagement();
                break;
            case 'inventory':
                this.loadInventoryManagement();
                break;
            case 'orders':
                this.loadOrderManagement();
                break;
            case 'media':
                this.loadMediaManager();
                break;
            case 'settings':
                this.loadSettings();
                break;
            case 'messages':
                this.loadMessages();
                break;
            default:
                this.loadDashboardContent();
        }
    }

    async loadInitialData() {
        console.log('📊 Loading initial data...');
        
        try {
            // Use the same Firebase connection as website
            if (!window.firebaseDB) {
                console.log('❌ Firebase not available, using fallback products');
                this.products = this.getFallbackProducts();
                this.renderProducts();
                this.updateDashboardStats();
                return;
            }

            // Load products using the same method as website
            await this.loadProductsFromFirebase();
            
            // Load orders using the same Firebase connection as website
            if (window.firebaseDB) {
                const { ref, onValue } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                const ordersRef = ref(window.firebaseDB, 'orders');
                onValue(ordersRef, (snapshot) => {
                    const data = snapshot.val();
                    this.orders = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
                    console.log('✅ Orders loaded via website Firebase connection:', this.orders.length, 'orders');
                    this.updateDashboardStats();
                    this.renderOrderTable(); // Update orders table
                }, {
                    onlyOnce: false
                });
            } else {
                // Fallback to admin Firebase connection
                const ordersRef = dbRef(db, 'orders');
                onValue(ordersRef, (snapshot) => {
                    const data = snapshot.val();
                    this.orders = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
                    console.log('✅ Orders loaded via admin Firebase connection:', this.orders.length, 'orders');
                    this.updateDashboardStats();
                    this.renderOrderTable(); // Update orders table
                }, {
                    onlyOnce: false
                });
            }
            
            console.log('✅ Initial data loading complete');
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            ToastManager.show('Failed to load data', 'error');
        }
    }

    // Use the exact same product loading logic as website
    async loadProductsFromFirebase() {
        if (!window.firebaseDB) {
            console.log('Firebase not available, using fallback products');
            this.products = this.getFallbackProducts();
            this.renderProducts();
            this.updateDashboardStats();
            return false;
        }

        // Mobile-specific: Add timeout for Firebase loading (same as website)
        const isMobile = window.innerWidth <= 768;
        const timeoutMs = isMobile ? 3000 : 5000; // 3s for mobile, 5s for desktop

        try {
            console.log('🔍 ADMIN DEBUG: Importing Firebase modules...');
            const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const productsRef = ref(window.firebaseDB, 'products');
            
            console.log('🔍 ADMIN DEBUG: Attempting to load products from Firebase...');
            console.log('🔍 ADMIN DEBUG: Timeout set to', timeoutMs, 'ms');
            
            // Create timeout with proper logging (same as website)
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    console.log('⏰ ADMIN DEBUG: Timeout triggered after', timeoutMs, 'ms');
                    reject(new Error('Firebase timeout'));
                }, timeoutMs);
            });
            
            // Race between Firebase fetch and timeout with better error handling (same as website)
            let snapshot;
            try {
                snapshot = await Promise.race([
                    get(productsRef).catch(error => {
                        console.log('❌ ADMIN DEBUG: Firebase get() failed:', error);
                        throw error;
                    }),
                    timeoutPromise
                ]);
                console.log('✅ ADMIN DEBUG: Promise.race completed successfully');
            } catch (raceError) {
                console.log('❌ ADMIN DEBUG: Promise.race failed:', raceError.message);
                throw raceError;
            }
            
            if (snapshot && snapshot.exists()) {
                const firebaseProducts = snapshot.val();
                console.log('🔍 ADMIN DEBUG: Raw Firebase data received, keys:', Object.keys(firebaseProducts || {}));
                console.log('🔍 ADMIN DEBUG: Raw Firebase data:', firebaseProducts);
                console.log('🔍 ADMIN DEBUG: Firebase data type:', typeof firebaseProducts);
                console.log('🔍 ADMIN DEBUG: Firebase data is array:', Array.isArray(firebaseProducts));
                
                // Process products exactly like website
                if (firebaseProducts && typeof firebaseProducts === 'object') {
                    console.log('🔍 ADMIN DEBUG: Firebase structure analysis:');
                    Object.keys(firebaseProducts).forEach(key => {
                        const product = firebaseProducts[key];
                        console.log('🔍 ADMIN DEBUG: Key:', key, '→ Product:', {
                            name: product.name,
                            category: product.category,
                            subCategory: product.subCategory,
                            isActive: product.isActive
                        });
                    });
                }
                
                const activeProducts = Object.values(firebaseProducts)
                    .filter(product => {
                        console.log('🔍 ADMIN DEBUG: Filtering product:', product.name, 'isActive:', product.isActive);
                        return product.isActive !== false; // Only active products (same as website)
                    })
                    .map(product => ({
                        id: product.id || product.name.toLowerCase().replace(/\s+/g, '_'),
                        name: product.name,
                        price: product.price,
                        color: product.color || 'Default',
                        category: product.category,
                        subCategory: product.subCategory || '',
                        img: product.imgUrl || product.img, // Support both field names (same as website)
                        stock: product.stock || 0,
                        status: product.isActive !== false ? 'active' : 'inactive',
                        createdAt: product.createdAt,
                        updatedAt: product.updatedAt
                    }));
                
                console.log('🔍 ADMIN DEBUG: Processed products:', activeProducts.length, 'items');
                console.log('🔍 ADMIN DEBUG: Processed products:', activeProducts);
                
                if (activeProducts.length > 0) {
                    this.products = activeProducts;
                    console.log('✅ ADMIN: Using Firebase products');
                } else {
                    this.products = this.getFallbackProducts();
                    console.log('⚠️ ADMIN: No Firebase products, using fallback');
                }
            } else {
                this.products = this.getFallbackProducts();
                console.log('⚠️ ADMIN: No Firebase data, using fallback');
            }
            
            this.renderProducts();
            this.updateDashboardStats();
            this.renderInventoryTable();
            return true;
            
        } catch (error) {
            if (error.message === 'Firebase timeout') {
                console.warn('⏰ ADMIN: Firebase loading timed out after', timeoutMs, 'ms, using fallback products');
            } else {
                console.warn('❌ ADMIN: Failed to load products from Firebase:', error.message);
                console.warn('❌ ADMIN: Full error:', error);
            }
            
            this.products = this.getFallbackProducts();
            this.renderProducts();
            this.updateDashboardStats();
            return false;
        }
    }

    getFallbackProducts() {
        // Use the same fallback products as website
        return [
            { id: 1, name: "Luxury Tote Bag", price: "750", color: "Black", img: "bag1.jpg", category: "Women", subCategory: "Bags", img: "images/tote-bag.jpeg", stock: 15, status: "active" },
            { id: 2, name: "Premium Handbag", price: "950", color: "Brown", img: "bag2.jpg", category: "Women", subCategory: "Bags", img: "images/pic-2.jpg", stock: 12, status: "active" },
            { id: 3, name: "Urban Street Sneaker", price: "1800", color: "White/Grey", img: "sneaker1.jpg", category: "Men", subCategory: "Sneakers", img: "images/pic-9.webp", stock: 8, status: "active" },
            { id: 4, name: "Classic Sport Sneaker", price: "2200", color: "Blue", img: "sneaker2.jpg", category: "Men", subCategory: "Sneakers", img: "images/pic-10.jpg", stock: 6, status: "active" },
            { id: 5, name: "Dark Aviator", price: "1200", color: "Silver", img: "glass1.jpg", category: "Men", subCategory: "Sunglasses", img: "images/pic-16.webp", stock: 20, status: "active" },
            { id: 6, name: "Smart Analog Watch", price: "3200", color: "Silver", img: "watch1.jpg", category: "Collection", subCategory: "Watches", img: "images/pic-17.png", stock: 4, status: "active" },
            { id: 7, name: "Classic Leather Belt", price: "850", color: "Brown", img: "belt1.jpg", category: "Collection", subCategory: "Belts", img: "images/pic-18.jpg", stock: 25, status: "active" },
            { id: 8, name: "Women Fashion Sandal", price: "1450", color: "Beige", img: "sandal1.jpg", category: "Women", subCategory: "Shoes", img: "images/pic-20.jpg", stock: 10, status: "active" }
        ];
    }

    // INITIALIZE MIGRATION IF NEEDED - PRODUCTION HARDENING
    async initializeMigrationIfNeeded() {
        console.log('🔍 Checking if migration is needed...');
        
        try {
            // Check global migration status first
            const migrationStatus = await this.checkMigrationStatus();
            
            if (migrationStatus.completed) {
                console.log('✅ Migration already completed globally, skipping');
                return;
            }
            
            // Check if Firebase already has products
            if (!window.firebaseDB) {
                console.log('❌ Firebase not available for migration check');
                return;
            }
            
            const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const productsRef = ref(window.firebaseDB, 'products');
            const snapshot = await get(productsRef);
            
            if (snapshot.exists()) {
                const existingProducts = snapshot.val();
                const productCount = Object.keys(existingProducts).length;
                
                console.log(`📦 Firebase already has ${productCount} products`);
                
                // Check if fallback products are already represented
                const fallbackProducts = this.getFallbackProducts();
                let missingCount = 0;
                
                for (const fallbackProduct of fallbackProducts) {
                    const isRepresented = Object.values(existingProducts).some(existing => {
                        return existing.name.toLowerCase().trim() === fallbackProduct.name.toLowerCase().trim() &&
                               existing.category === fallbackProduct.category &&
                               Math.abs(parseFloat(existing.price) - parseFloat(fallbackProduct.price)) < 0.01;
                    });
                    
                    if (!isRepresented) {
                        missingCount++;
                    }
                }
                
                if (missingCount === 0) {
                    console.log('✅ All fallback products already represented in Firebase, no migration needed');
                    // Mark as completed to prevent future checks
                    await this.markMigrationCompleted(0, fallbackProducts.length);
                    return;
                } else {
                    console.log(`⚠️ ${missingCount} fallback products missing from Firebase, proceeding with migration`);
                }
            } else {
                console.log('📦 Firebase products empty, migration needed');
            }
            
            // Only run migration if actually needed
            await this.migrateFallbackProductsToFirebase();
            
        } catch (error) {
            console.error('❌ Error checking migration status:', error);
            // If check fails, assume migration might be needed
            await this.migrateFallbackProductsToFirebase();
        }
    }

    // CHECK MIGRATION STATUS - FIREBASE-BACKED GLOBAL STATUS
    async checkMigrationStatus() {
        // Primary check: Firebase-backed global status
        try {
            if (!window.firebaseDB) {
                // Fallback to localStorage if Firebase not available
                const localStatus = localStorage.getItem('admin_fallback_migration_completed');
                return {
                    completed: localStatus === 'completed',
                    source: 'localStorage_fallback'
                };
            }
            
            const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const migrationRef = ref(window.firebaseDB, 'system/productMigrationStatus');
            const snapshot = await get(migrationRef);
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                console.log('📋 Firebase migration status found:', data);
                return {
                    completed: data.completed === true,
                    source: 'firebase_global',
                    completedAt: data.completedAt,
                    migratedCount: data.migratedCount,
                    version: data.version || '1.0'
                };
            }
            
            // No Firebase status found, return not completed
            return {
                completed: false,
                source: 'firebase_none'
            };
            
        } catch (error) {
            console.warn('⚠️ Error checking migration status:', error);
            // Fallback to localStorage
            const localStatus = localStorage.getItem('admin_fallback_migration_completed');
            return {
                completed: localStatus === 'completed',
                source: 'localStorage_fallback'
            };
        }
    }

    // MARK MIGRATION COMPLETED - FIREBASE-BACKED GLOBAL STATUS
    async markMigrationCompleted(migratedCount, skippedCount) {
        try {
            if (!window.firebaseDB) {
                // Fallback to localStorage if Firebase not available
                localStorage.setItem('admin_fallback_migration_completed', 'completed');
                return;
            }
            
            const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const migrationRef = ref(window.firebaseDB, 'system/productMigrationStatus');
            
            const migrationData = {
                completed: true,
                completedAt: Date.now(),
                migratedCount: migratedCount,
                skippedCount: skippedCount,
                version: '1.0',
                updatedAt: Date.now()
            };
            
            await set(migrationRef, migrationData);
            console.log('📋 Migration status saved to Firebase:', migrationData);
            
            // Also save to localStorage as backup
            localStorage.setItem('admin_fallback_migration_completed', 'completed');
            
        } catch (error) {
            console.error('❌ Error marking migration completed:', error);
            // Fallback to localStorage
            localStorage.setItem('admin_fallback_migration_completed', 'completed');
        }
    }

    // MIGRATE FALLBACK PRODUCTS TO FIREBASE - UNIFICATION FIX
    async migrateFallbackProductsToFirebase() {
        console.log('🔄 Starting migration of fallback products to Firebase...');
        
        if (!window.firebaseDB) {
            console.log('❌ Firebase not available for migration');
            return false;
        }
        
        // SAFETY GUARD: Check if migration already completed (Firebase-backed + localStorage fallback)
        const migrationStatus = await this.checkMigrationStatus();
        
        if (migrationStatus.completed) {
            console.log('📋 Migration already completed globally, skipping...');
            return false;
        }
        
        try {
            const fallbackProducts = this.getFallbackProducts();
            console.log('📦 Found', fallbackProducts.length, 'fallback products to migrate');
            
            const { ref, get, set } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const productsRef = ref(window.firebaseDB, 'products');
            
            // First, check if products already exist in Firebase
            const existingProductsSnapshot = await get(productsRef);
            const existingProducts = existingProductsSnapshot.exists() ? existingProductsSnapshot.val() : {};
            
            console.log('🔍 Existing Firebase products:', Object.keys(existingProducts).length, 'products');
            
            let migratedCount = 0;
            let skippedCount = 0;
            
            for (const fallbackProduct of fallbackProducts) {
                // Check for duplicates using enhanced criteria
                const isDuplicate = Object.values(existingProducts).some(existing => {
                    const fallbackName = fallbackProduct.name.toLowerCase().trim();
                    const fallbackCategory = fallbackProduct.category;
                    const fallbackSubCategory = (fallbackProduct.subCategory || '').toLowerCase().trim();
                    const fallbackPrice = parseFloat(fallbackProduct.price);
                    
                    const existingName = (existing.name || '').toLowerCase().trim();
                    const existingCategory = existing.category;
                    const existingSubCategory = (existing.subCategory || '').toLowerCase().trim();
                    const existingPrice = parseFloat(existing.price);
                    
                    return existingName === fallbackName &&
                           existingCategory === fallbackCategory &&
                           existingSubCategory === fallbackSubCategory &&
                           Math.abs(existingPrice - fallbackPrice) < 0.01; // Same price within 1 cent
                });
                
                if (isDuplicate) {
                    console.log('⚠️ Skipping duplicate product:', fallbackProduct.name);
                    skippedCount++;
                    continue;
                }
                
                // Generate a proper Firebase-style ID
                const productId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
                
                // Create product object with required fields for website compatibility
                const productData = {
                    id: productId,
                    name: fallbackProduct.name,
                    price: fallbackProduct.price,
                    color: fallbackProduct.color,
                    img: fallbackProduct.img,
                    category: fallbackProduct.category,
                    subCategory: fallbackProduct.subCategory || '',
                    stock: fallbackProduct.stock || 0,
                    status: fallbackProduct.status || 'active',
                    isActive: fallbackProduct.status !== 'inactive',
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                
                // Add description if exists
                if (fallbackProduct.description) {
                    productData.description = fallbackProduct.description;
                }
                
                // Save to Firebase
                const productRef = ref(window.firebaseDB, `products/${productId}`);
                await set(productRef, productData);
                
                console.log('✅ Migrated product:', fallbackProduct.name, '→ Firebase ID:', productId);
                migratedCount++;
            }
            
            console.log(`🎉 Migration complete: ${migratedCount} products migrated, ${skippedCount} duplicates skipped`);
            
            // Mark migration as completed globally (Firebase-backed + localStorage backup)
            await this.markMigrationCompleted(migratedCount, skippedCount);
            console.log('📋 Migration status marked globally as completed');
            
            // Reload products from Firebase to get the new unified dataset
            await this.loadProductsFromFirebase();
            
            ToastManager.show(`Successfully migrated ${migratedCount} products to Firebase`, 'success');
            return true;
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            ToastManager.show('Failed to migrate products', 'error');
            return false;
        }
    }

    // DASHBOARD METHODS
    loadDashboardContent() {
        console.log('📈 Loading dashboard content...');
        
        let dashboardSection = document.getElementById('dashboardSection');
        if (dashboardSection) {
            // Section exists, fill it with content
            dashboardSection.innerHTML = this.createDashboardContent();
            dashboardSection.style.display = 'block';
        } else {
            // Section doesn't exist, create it (fallback)
            dashboardSection = this.createDashboardSection();
            document.querySelector('.main-content').appendChild(dashboardSection);
        }
        
        this.updateDashboardStats();
    }

    createDashboardContent() {
        return `
            <div class="dashboard-header">
                <h1>Dashboard Overview</h1>
                <div class="dashboard-actions">
                    <button class="btn btn-primary" onclick="window.dashboard.openAddProductModal()">
                        <i class="icon">➕</i> Add Product
                    </button>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">📦</div>
                    <div class="stat-content">
                        <h3 id="totalProducts">0</h3>
                        <p>Total Products</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🛒</div>
                    <div class="stat-content">
                        <h3 id="totalOrders">0</h3>
                        <p>Total Orders</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-content">
                        <h3 id="lowStock">0</h3>
                        <p>Low Stock</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <h3 id="totalRevenue">$0</h3>
                        <p>Total Revenue</p>
                    </div>
                </div>
            </div>
            
            <div class="dashboard-content">
                <div class="recent-activity">
                    <h2>Recent Activity</h2>
                    <div id="recentActivity" class="activity-list">
                        <p>Loading activity...</p>
                    </div>
                </div>
            </div>
        `;
    }

    createDashboardSection() {
        const section = document.createElement('div');
        section.id = 'dashboardSection';
        section.className = 'section-content';
        section.innerHTML = `
            <div class="dashboard-header">
                <h1>Dashboard Overview</h1>
                <div class="dashboard-actions">
                    <button class="btn btn-primary" onclick="window.dashboard.openAddProductModal()">
                        <i class="icon">➕</i> Add Product
                    </button>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">📦</div>
                    <div class="stat-content">
                        <h3 id="totalProducts">0</h3>
                        <p>Total Products</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🛒</div>
                    <div class="stat-content">
                        <h3 id="totalOrders">0</h3>
                        <p>Total Orders</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-content">
                        <h3 id="lowStock">0</h3>
                        <p>Low Stock</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <h3 id="totalRevenue">$0</h3>
                        <p>Total Revenue</p>
                    </div>
                </div>
            </div>
            
            <div class="dashboard-content">
                <div class="recent-activity">
                    <h2>Recent Activity</h2>
                    <div id="recentActivity" class="activity-list">
                        <p>Loading activity...</p>
                    </div>
                </div>
            </div>
        `;
        return section;
    }

    updateDashboardStats() {
        const totalProducts = this.products.length;
        const totalOrders = this.orders.length;
        const lowStock = this.products.filter(p => (p.stock || 0) <= 10).length;
        const totalRevenue = this.orders.reduce((sum, order) => sum + (order.total || 0), 0);

        const totalProductsEl = document.getElementById('totalProducts');
        const totalOrdersEl = document.getElementById('totalOrders');
        const lowStockEl = document.getElementById('lowStock');
        const totalRevenueEl = document.getElementById('totalRevenue');

        if (totalProductsEl) totalProductsEl.textContent = totalProducts;
        if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
        if (lowStockEl) lowStockEl.textContent = lowStock;
        if (totalRevenueEl) totalRevenueEl.textContent = `$${totalRevenue.toFixed(2)}`;
    }

    // PRODUCT MANAGEMENT METHODS
    loadProductManagement() {
        console.log('🛍️ Loading product management...');
        
        let productSection = document.getElementById('productSection');
        if (productSection) {
            // Section exists, fill it with content
            productSection.innerHTML = this.createProductManagementContent();
            productSection.style.display = 'block';
        } else {
            // Section doesn't exist, create it (fallback)
            productSection = this.createProductManagementSection();
            document.querySelector('.main-content').appendChild(productSection);
        }
        
        // Bind events after content is rendered
        this.bindProductEvents();
        this.renderProducts();
    }

    createProductManagementContent() {
        return `
            <div class="section-header">
                <h1>Product Management</h1>
                <button class="btn btn-primary" onclick="window.dashboard.openAddProductModal()">
                    <i class="icon">➕</i> Add Product
                </button>
            </div>
            
            <div class="product-controls">
                <div class="search-filter-container">
                    <input type="text" id="productSearch" placeholder="Search by name, category, or sub-category..." class="search-input">
                    <select id="categoryFilter" class="filter-select">
                        <option value="">All Categories</option>
                        <option value="Women">Women</option>
                        <option value="Men">Men</option>
                        <option value="Collection">Collection</option>
                    </select>
                    <select id="subCategoryFilter" class="filter-select">
                        <option value="">All Sub Categories</option>
                        <option value="Bags">Bags</option>
                        <option value="Sneakers">Sneakers</option>
                        <option value="Shoes">Shoes</option>
                        <option value="Shirt">Shirt</option>
                        <option value="Sunglasses">Sunglasses</option>
                        <option value="Watches">Watches</option>
                        <option value="Belts">Belts</option>
                        <option value="Caps">Caps</option>
                        <option value="Hoodie">Hoodie</option>
                        <option value="Dress">Dress</option>
                    </select>
                    <select id="statusFilter" class="filter-select">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>
            
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Sub Category</th>
                            <th>Color</th>
                            <th>Price (TK)</th>
                            <th>Stock</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="productTableBody">
                        <tr>
                            <td colspan="9" style="text-align: center; padding: 40px;">
                                <div class="loading-spinner"></div>
                                <p>Loading products...</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    bindProductEvents() {
        // Bind search and filter events
        const searchInput = document.getElementById('productSearch');
        const categoryFilter = document.getElementById('categoryFilter');
        const subCategoryFilter = document.getElementById('subCategoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        
        if (searchInput) {
            // Remove existing listeners to prevent duplicates
            searchInput.removeEventListener('input', this.handleProductSearch.bind(this));
            searchInput.addEventListener('input', (e) => this.handleProductSearch(e.target.value));
            
            // Add real-time search feedback
            searchInput.addEventListener('focus', () => {
                searchInput.style.borderColor = 'var(--accent-color)';
            });
            
            searchInput.addEventListener('blur', () => {
                searchInput.style.borderColor = '';
            });
        }
        
        if (categoryFilter) {
            categoryFilter.removeEventListener('change', this.filterProducts.bind(this));
            categoryFilter.addEventListener('change', () => this.filterProducts());
        }
        
        if (subCategoryFilter) {
            subCategoryFilter.removeEventListener('change', this.filterProducts.bind(this));
            subCategoryFilter.addEventListener('change', () => this.filterProducts());
        }
        
        if (statusFilter) {
            statusFilter.removeEventListener('change', this.filterProducts.bind(this));
            statusFilter.addEventListener('change', () => this.filterProducts());
        }
    }

    handleProductSearch(searchTerm) {
        console.log('🔍 Searching products:', searchTerm);
        
        // Clear any previous search timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Add a small delay for better UX (debounce)
        this.searchTimeout = setTimeout(() => {
            this.filterProducts();
        }, 300);
    }

    filterProducts() {
        const searchTerm = document.getElementById('productSearch')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const subCategoryFilter = document.getElementById('subCategoryFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        
        console.log('🔍 Filtering products:', { searchTerm, categoryFilter, subCategoryFilter, statusFilter });
        
        const filteredProducts = this.products.filter(product => {
            // Enhanced search logic - same as website
            const matchesSearch = !searchTerm || 
                (product.name && product.name.toLowerCase().includes(searchTerm)) ||
                (product.category && product.category.toLowerCase().includes(searchTerm)) ||
                (product.subCategory && product.subCategory.toLowerCase().includes(searchTerm)) ||
                (product.color && product.color.toLowerCase().includes(searchTerm));
            
            const matchesCategory = !categoryFilter || product.category === categoryFilter;
            const matchesSubCategory = !subCategoryFilter || product.subCategory === subCategoryFilter;
            const matchesStatus = !statusFilter || product.status === statusFilter;
            
            return matchesSearch && matchesCategory && matchesSubCategory && matchesStatus;
        });
        
        console.log('🔍 Filtered products:', filteredProducts.length, 'out of', this.products.length);
        
        this.renderFilteredProducts(filteredProducts);
        
        // Show search feedback
        if (searchTerm && filteredProducts.length === 0) {
            this.showSearchFeedback('No products found matching "' + searchTerm + '"');
        } else if (searchTerm && filteredProducts.length > 0) {
            this.showSearchFeedback('Found ' + filteredProducts.length + ' product' + (filteredProducts.length > 1 ? 's' : '') + ' matching "' + searchTerm + '"');
        } else {
            this.hideSearchFeedback();
        }
    }

    showSearchFeedback(message) {
        // Create or update search feedback
        let feedback = document.getElementById('searchFeedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.id = 'searchFeedback';
            feedback.style.cssText = `
                padding: 8px 12px;
                background: var(--accent-color);
                color: white;
                border-radius: 4px;
                margin-bottom: 12px;
                font-size: 14px;
                animation: slideIn 0.3s ease;
            `;
            
            const productControls = document.querySelector('.product-controls');
            if (productControls) {
                productControls.appendChild(feedback);
            }
        }
        
        feedback.textContent = message;
        feedback.style.display = 'block';
    }

    hideSearchFeedback() {
        const feedback = document.getElementById('searchFeedback');
        if (feedback) {
            feedback.style.display = 'none';
        }
    }

    createProductManagementSection() {
        const section = document.createElement('div');
        section.id = 'productSection';
        section.className = 'section-content';
        section.innerHTML = `
            <div class="section-header">
                <h1>Product Management</h1>
                <button class="btn btn-primary" onclick="window.dashboard.openAddProductModal()">
                    <i class="icon">➕</i> Add Product
                </button>
            </div>
            
            <div class="product-controls">
                <div class="search-filter-container">
                    <input type="text" id="productSearch" placeholder="Search by name, category, or sub-category..." class="search-input">
                    <select id="categoryFilter" class="filter-select">
                        <option value="">All Categories</option>
                        <option value="Women">Women</option>
                        <option value="Men">Men</option>
                        <option value="Collection">Collection</option>
                    </select>
                    <select id="subCategoryFilter" class="filter-select">
                        <option value="">All Sub Categories</option>
                        <option value="Bags">Bags</option>
                        <option value="Sneakers">Sneakers</option>
                        <option value="Shoes">Shoes</option>
                        <option value="Shirt">Shirt</option>
                        <option value="Sunglasses">Sunglasses</option>
                        <option value="Watches">Watches</option>
                        <option value="Belts">Belts</option>
                        <option value="Caps">Caps</option>
                        <option value="Hoodie">Hoodie</option>
                        <option value="Dress">Dress</option>
                    </select>
                    <select id="statusFilter" class="filter-select">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>
            
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Sub Category</th>
                            <th>Color</th>
                            <th>Price (TK)</th>
                            <th>Stock</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="productTableBody">
                        <tr>
                            <td colspan="9" style="text-align: center; padding: 40px;">
                                <div class="loading-spinner"></div>
                                <p>Loading products...</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        
        // Add event listeners
        const searchInput = section.querySelector('#productSearch');
        const categoryFilter = section.querySelector('#categoryFilter');
        const subCategoryFilter = section.querySelector('#subCategoryFilter');
        const statusFilter = section.querySelector('#statusFilter');
        
        if (searchInput) searchInput.addEventListener('input', () => this.filterProducts());
        if (categoryFilter) categoryFilter.addEventListener('change', () => this.filterProducts());
        if (subCategoryFilter) subCategoryFilter.addEventListener('change', () => this.filterProducts());
        if (statusFilter) statusFilter.addEventListener('change', () => this.filterProducts());
        
        return section;
    }

    renderProducts() {
        const tbody = document.getElementById('productTableBody');
        if (!tbody) return;
        
        if (this.products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <div style="margin-bottom: 16px;">📦</div>
                        <div>No products found</div>
                        <div style="font-size: 0.9rem; margin-top: 8px;">Add your first product to get started</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        this.products.forEach(product => {
            const row = document.createElement('tr');
            const stockClass = this.getStockClass(product.stock || 0);
            const statusClass = product.status === 'active' ? 'active' : 'inactive';
            
            // Create image thumbnail with fallback
            const imageUrl = product.img || product.imgUrl || 'https://via.placeholder.com/50';
            const imageAlt = product.name || 'Product Image';
            
            row.innerHTML = `
                <td>
                    <div class="product-image-container">
                        <img src="${imageUrl}" 
                             alt="${imageAlt}" 
                             style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;"
                             onerror="this.src='https://via.placeholder.com/50'">
                    </div>
                </td>
                <td>
                    <div class="product-info">
                        <strong>${product.name || 'Unnamed Product'}</strong>
                        <small style="display: block; color: var(--text-muted); font-size: 12px;">
                            ID: ${product.id || 'N/A'}
                        </small>
                    </div>
                </td>
                <td>
                    <span class="category-badge" style="background: ${this.getCategoryColor(product.category)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                        ${product.category || 'Uncategorized'}
                    </span>
                </td>
                <td>
                    <span class="subcategory-badge" style="background: #f0f0f0; color: #333; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                        ${product.subCategory || 'Not specified'}
                    </span>
                </td>
                <td>
                    <span class="color-badge" style="background: ${product.color ? '#e9ecef' : '#f8f9fa'}; color: ${product.color ? '#495057' : '#6c757d'}; padding: 2px 8px; border-radius: 12px; font-size: 11px; border: 1px solid #dee2e6;">
                        ${product.color || 'N/A'}
                    </span>
                </td>
                <td>
                    <strong style="color: #28a745;">TK-${product.price || '0'}</strong>
                </td>
                <td>
                    <span class="stock-badge ${stockClass}" style="padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                        ${product.stock || 0}
                    </span>
                    ${product.stock <= 5 ? '<small style="display: block; color: #dc3545; font-size: 10px;">Low stock!</small>' : ''}
                </td>
                <td>
                    <span class="status-badge ${statusClass}" style="padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                        ${product.status || 'active'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons" style="display: flex; gap: 4px;">
                        <button class="btn btn-sm btn-primary" 
                                onclick="window.dashboard.editProduct('${product.id}')" 
                                style="padding: 4px 8px; font-size: 11px;"
                                title="Edit Product">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" 
                                onclick="window.dashboard.deleteProduct('${product.id}')" 
                                style="padding: 4px 8px; font-size: 11px;"
                                title="Delete Product">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            // Add hover effect to rows
            row.addEventListener('mouseenter', () => {
                row.style.backgroundColor = '#f8f9fa';
            });
            
            row.addEventListener('mouseleave', () => {
                row.style.backgroundColor = '';
            });
            
            tbody.appendChild(row);
        });
    }

    getCategoryColor(category) {
        const colors = {
            'Women': '#e91e63',
            'Men': '#2196f3',
            'Collection': '#ff9800'
        };
        return colors[category] || '#6c757d';
    }

    filterProducts() {
        const searchTerm = document.getElementById('productSearch')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const subCategoryFilter = document.getElementById('subCategoryFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        
        const filteredProducts = this.products.filter(product => {
            // Search logic matching website: name, category, subCategory
            const matchesSearch = !searchTerm || 
                (product.name && product.name.toLowerCase().includes(searchTerm)) ||
                (product.category && product.category.toLowerCase().includes(searchTerm)) ||
                (product.subCategory && product.subCategory.toLowerCase().includes(searchTerm));
            
            const matchesCategory = !categoryFilter || product.category === categoryFilter;
            const matchesSubCategory = !subCategoryFilter || product.subCategory === subCategoryFilter;
            const matchesStatus = !statusFilter || product.status === statusFilter;
            
            return matchesSearch && matchesCategory && matchesSubCategory && matchesStatus;
        });
        
        this.renderFilteredProducts(filteredProducts);
    }

    renderFilteredProducts(products) {
        const tbody = document.getElementById('productTableBody');
        if (!tbody) return;
        
        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <div>No products match your filters</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        products.forEach(product => {
            const row = document.createElement('tr');
            const stockClass = this.getStockClass(product.stock || 0);
            
            row.innerHTML = `
                <td>
                    <img src="${product.img || product.image || 'https://via.placeholder.com/50'}" 
                         alt="${product.name}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                </td>
                <td>
                    <div class="product-info">
                        <strong>${product.name || 'Unnamed Product'}</strong>
                    </div>
                </td>
                <td>${product.category || 'Uncategorized'}</td>
                <td>${product.subCategory || 'Not specified'}</td>
                <td>
                    <span class="color-badge">${product.color || 'N/A'}</span>
                </td>
                <td>
                    <strong>TK-${product.price || '0'}</strong>
                </td>
                <td>
                    <span class="stock-badge ${stockClass}">${product.stock || 0}</span>
                </td>
                <td>
                    <span class="status-badge ${product.status === 'active' ? 'active' : 'inactive'}">
                        ${product.status || 'active'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="window.dashboard.editProduct('${product.id}')">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.dashboard.deleteProduct('${product.id}')">
                            Delete
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getStockClass(stock) {
        if (stock === 0) return 'out-of-stock';
        if (stock <= 10) return 'low-stock';
        return 'in-stock';
    }

    // PRODUCT MODAL METHODS
    openAddProductModal() {
        console.log('Opening add product modal...');
        this.createProductModal();
    }

    createProductModal(product = null) {
        // Remove existing modal
        const existingModal = document.getElementById('productModal');
        if (existingModal) existingModal.remove();
        
        const isEdit = product !== null;
        
        const modal = document.createElement('div');
        modal.id = 'productModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h2>${isEdit ? 'Edit Product' : 'Add New Product'}</h2>
                    <button class="modal-close" onclick="window.dashboard.closeProductModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="productForm" class="product-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="productName">Product Name *</label>
                                <input type="text" id="productName" name="name" value="${product?.name || ''}" required class="form-control">
                            </div>
                            <div class="form-group">
                                <label for="productCategory">Main Category *</label>
                                <select id="productCategory" name="category" required class="form-control">
                                    <option value="">Select Category</option>
                                    <option value="Women" ${product?.category === 'Women' ? 'selected' : ''}>Women</option>
                                    <option value="Men" ${product?.category === 'Men' ? 'selected' : ''}>Men</option>
                                    <option value="Collection" ${product?.category === 'Collection' ? 'selected' : ''}>Collection</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="productSubCategory">Sub Category *</label>
                                <select id="productSubCategory" name="subCategory" required class="form-control">
                                    <option value="">Select Sub Category</option>
                                    <option value="Bags" ${product?.subCategory === 'Bags' ? 'selected' : ''}>Bags</option>
                                    <option value="Sneakers" ${product?.subCategory === 'Sneakers' ? 'selected' : ''}>Sneakers</option>
                                    <option value="Shoes" ${product?.subCategory === 'Shoes' ? 'selected' : ''}>Shoes</option>
                                    <option value="Shirt" ${product?.subCategory === 'Shirt' ? 'selected' : ''}>Shirt</option>
                                    <option value="Sunglasses" ${product?.subCategory === 'Sunglasses' ? 'selected' : ''}>Sunglasses</option>
                                    <option value="Watches" ${product?.subCategory === 'Watches' ? 'selected' : ''}>Watches</option>
                                    <option value="Belts" ${product?.subCategory === 'Belts' ? 'selected' : ''}>Belts</option>
                                    <option value="Caps" ${product?.subCategory === 'Caps' ? 'selected' : ''}>Caps</option>
                                    <option value="Hoodie" ${product?.subCategory === 'Hoodie' ? 'selected' : ''}>Hoodie</option>
                                    <option value="Dress" ${product?.subCategory === 'Dress' ? 'selected' : ''}>Dress</option>
                                    <option value="Most Viewed" ${product?.subCategory === 'Most Viewed' ? 'selected' : ''}>Most Viewed</option>
                                    <option value="Trending" ${product?.subCategory === 'Trending' ? 'selected' : ''}>Trending</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="productColor">Color *</label>
                                <input type="text" id="productColor" name="color" value="${product?.color || ''}" required class="form-control">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="productPrice">Price (TK) *</label>
                                <input type="text" id="productPrice" name="price" value="${product?.price || ''}" required class="form-control" placeholder="e.g., 750">
                            </div>
                            <div class="form-group">
                                <label for="productStock">Stock *</label>
                                <input type="number" id="productStock" name="stock" min="0" value="${product?.stock || ''}" required class="form-control">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="productImage">Product Image</label>
                            <input type="file" id="productImage" accept="image/*" class="form-control">
                            <input type="text" id="productImageName" name="imageName" value="${product?.img || ''}" class="form-control" placeholder="Image filename (e.g., bag1.jpg)">
                            <div id="imagePreview" class="image-preview">
                                ${product?.img ? `<img src="${product.img}" alt="Current" style="max-width: 200px; max-height: 200px; object-fit: cover; border-radius: 4px;">` : ''}
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="productStatus" name="status" ${product?.status !== 'inactive' ? 'checked' : ''}>
                                Active
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <p><strong>Size Options:</strong> Will be auto-generated based on sub-category</p>
                            <p><small>Clothing: M, L, XL, XXL | Footwear: 40-45 | Accessories: No size</small></p>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="window.dashboard.closeProductModal()">
                        Cancel
                    </button>
                    <button type="button" class="btn btn-primary" onclick="window.dashboard.saveProduct('${product?.id || ''}')">
                        ${isEdit ? 'Update Product' : 'Save Product'}
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add image preview functionality
        const imageInput = document.getElementById('productImage');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.previewImage(e.target.files[0]));
        }
        
        // Store editing product ID
        this.editingProductId = product?.id || null;
    }

    previewImage(file) {
        const preview = document.getElementById('imagePreview');
        if (!preview) return;
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `
                    <img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px; object-fit: cover; border-radius: 4px;">
                `;
                this.selectedImageFile = file;
            };
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = '';
            this.selectedImageFile = null;
        }
    }

    closeProductModal() {
        const modal = document.getElementById('productModal');
        if (modal) modal.remove();
        this.selectedImageFile = null;
        this.currentImageUrl = null;
        this.editingProductId = null;
    }

    async saveProduct(productId = '') {
        console.log('💾 Saving product:', productId || 'New product');
        
        const form = document.getElementById('productForm');
        if (!form) return;
        
        const formData = new FormData(form);
        const imageName = formData.get('imageName') || formData.get('image')?.name || 'default.jpg';
        
        // Create product data matching website structure
        const productData = {
            name: formData.get('name'),
            category: formData.get('category'),
            subCategory: formData.get('subCategory'),
            color: formData.get('color'),
            price: formData.get('price'), // Keep as string like website
            img: imageName, // Image filename
            stock: parseInt(formData.get('stock')),
            isActive: formData.get('status') ? true : false, // Use same field as website
            updatedAt: Date.now()
        };
        
        // Add description if exists
        const description = formData.get('description');
        if (description) {
            productData.description = description;
        }
        
        console.log('💾 Product data to save:', productData);
        
        try {
            // Handle image upload if provided
            if (this.selectedImageFile) {
                const imageUrl = await this.uploadImage(this.selectedImageFile);
                productData.img = imageUrl;
                // Also add the full path field like website
                if (imageUrl.includes('images/')) {
                    productData.imgUrl = imageUrl;
                }
            }
            
            if (productId) {
                // Update existing product - use the same Firebase connection as website
                console.log('💾 Updating existing product:', productId);
                
                if (window.firebaseDB) {
                    // Use website Firebase connection
                    const { ref, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                    const productRef = ref(window.firebaseDB, `products/${productId}`);
                    await update(productRef, productData);
                    console.log('✅ Product updated via website Firebase connection');
                } else {
                    // Fallback to admin Firebase connection
                    const productRef = dbRef(db, `products/${productId}`);
                    await update(productRef, productData);
                    console.log('✅ Product updated via admin Firebase connection');
                }
                
                ToastManager.show('Product updated successfully!', 'success');
                
                // Update local products array
                const localIndex = this.products.findIndex(p => p.id === productId);
                if (localIndex !== -1) {
                    this.products[localIndex] = { ...this.products[localIndex], ...productData };
                }
                
            } else {
                // Add new product
                console.log('💾 Adding new product');
                
                productData.createdAt = Date.now();
                productData.id = Date.now(); // Add ID like website
                
                if (window.firebaseDB) {
                    // Use website Firebase connection
                    const { ref, push } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                    const productsRef = ref(window.firebaseDB, 'products');
                    const newProductRef = push(productsRef);
                    await set(newProductRef, productData);
                    console.log('✅ Product added via website Firebase connection');
                } else {
                    // Fallback to admin Firebase connection
                    const productsRef = dbRef(db, 'products');
                    const newProductRef = push(productsRef);
                    await set(newProductRef, productData);
                    console.log('✅ Product added via admin Firebase connection');
                }
                
                ToastManager.show('Product saved successfully!', 'success');
                
                // Add to local products array
                this.products.push({ id: productData.id.toString(), ...productData });
            }
            
            this.closeProductModal();
            
            // Refresh products list
            this.renderProducts();
            this.updateDashboardStats();
            
            // Reload products from Firebase to ensure consistency
            await this.loadProductsFromFirebase();
            
        } catch (error) {
            console.error('❌ Error saving product:', error);
            ToastManager.show('Failed to save product: ' + error.message, 'error');
        }
    }

    async uploadImage(file) {
        if (!file) return null;
        
        try {
            const storageReference = storageRef(storage, `products/${Date.now()}_${file.name}`);
            await uploadBytes(storageReference, file);
            const downloadURL = await getDownloadURL(storageReference);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    async editProduct(productId) {
        console.log('🔧 Editing product:', productId);
        
        // Find the product in our current products array
        let product = this.products.find(p => p.id === productId);
        
        // If not found in current array, try to fetch from Firebase directly
        if (!product) {
            console.log('🔍 Product not found in current array, fetching from Firebase...');
            product = await this.fetchProductFromFirebase(productId);
        }
        
        if (!product) {
            ToastManager.show('Product not found', 'error');
            return;
        }
        
        console.log('🔧 Found product:', product);
        
        // Create edit modal with complete product data
        this.createProductModal(product);
        
        // Store editing product ID
        this.editingProductId = productId;
    }

    async fetchProductFromFirebase(productId) {
        try {
            if (!window.firebaseDB) return null;
            
            const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const productRef = ref(window.firebaseDB, `products/${productId}`);
            const snapshot = await get(productRef);
            
            if (snapshot.exists()) {
                const productData = snapshot.val();
                return {
                    id: productId,
                    ...productData,
                    status: productData.isActive !== false ? 'active' : 'inactive'
                };
            }
        } catch (error) {
            console.error('Error fetching product from Firebase:', error);
        }
        
        return null;
    }

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;
        
        try {
            const productRef = dbRef(db, `products/${productId}`);
            await remove(productRef);
            
            ToastManager.show('Product deleted successfully', 'success');
            this.loadProductManagement();
            
        } catch (error) {
            console.error('Error deleting product:', error);
            ToastManager.show('Failed to delete product', 'error');
        }
    }

    // INVENTORY MANAGEMENT METHODS
    loadInventoryManagement() {
        console.log('📦 Loading inventory management...');
        
        let inventorySection = document.getElementById('inventorySection');
        if (inventorySection) {
            // Section exists, fill it with content
            inventorySection.innerHTML = this.createInventoryManagementContent();
            inventorySection.style.display = 'block';
        } else {
            // Section doesn't exist, create it (fallback)
            inventorySection = this.createInventoryManagementSection();
            document.querySelector('.main-content').appendChild(inventorySection);
        }
        
        // Bind events after content is rendered
        this.bindInventoryEvents();
        this.renderInventoryTable();
    }

    bindInventoryEvents() {
        // Bind inventory filter events
        const stockFilter = document.getElementById('stockFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        
        if (stockFilter) {
            stockFilter.removeEventListener('change', this.filterInventory.bind(this));
            stockFilter.addEventListener('change', () => this.filterInventory());
        }
        
        if (categoryFilter) {
            categoryFilter.removeEventListener('change', this.filterInventory.bind(this));
            categoryFilter.addEventListener('change', () => this.filterInventory());
        }
    }

    filterInventory() {
        const stockFilter = document.getElementById('stockFilter')?.value || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        
        console.log('🔍 Filtering inventory:', { stockFilter, categoryFilter });
        
        const filteredProducts = this.products.filter(product => {
            // Stock filter
            let matchesStock = true;
            const stock = product.stock || 0;
            
            switch(stockFilter) {
                case 'instock':
                    matchesStock = stock > 10;
                    break;
                case 'lowstock':
                    matchesStock = stock > 0 && stock <= 10;
                    break;
                case 'outofstock':
                    matchesStock = stock === 0;
                    break;
                default:
                    matchesStock = true;
            }
            
            const matchesCategory = !categoryFilter || product.category === categoryFilter;
            
            return matchesStock && matchesCategory;
        });
        
        console.log('🔍 Filtered inventory products:', filteredProducts.length, 'out of', this.products.length);
        
        this.renderFilteredInventory(filteredProducts);
    }

    createInventoryManagementContent() {
        return `
            <div class="section-header">
                <h1>Inventory Management</h1>
                <div class="inventory-controls">
                    <select id="stockFilter" class="filter-select">
                        <option value="">All Stock Levels</option>
                        <option value="instock">In Stock</option>
                        <option value="lowstock">Low Stock (≤10)</option>
                        <option value="outofstock">Out of Stock</option>
                    </select>
                    <select id="categoryFilter" class="filter-select">
                        <option value="">All Categories</option>
                        <option value="Women">Women</option>
                        <option value="Men">Men</option>
                        <option value="Collection">Collection</option>
                    </select>
                    <button class="btn btn-primary" onclick="window.dashboard.updateAllStock()">
                        <i class="icon">🔄</i> Update All Stock
                    </button>
                </div>
            </div>
            
            <div class="inventory-stats">
                <div class="stat-card">
                    <div class="stat-icon">📦</div>
                    <div class="stat-content">
                        <h3 id="totalProductsCount">0</h3>
                        <p>Total Products</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-content">
                        <h3 id="lowStockCount">0</h3>
                        <p>Low Stock</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">❌</div>
                    <div class="stat-content">
                        <h3 id="outOfStockCount">0</h3>
                        <p>Out of Stock</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                        <h3 id="totalStockValue">0</h3>
                        <p>Total Stock Value</p>
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Sub Category</th>
                            <th>Current Stock</th>
                            <th>Stock Status</th>
                            <th>Unit Price</th>
                            <th>Stock Value</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="inventoryTableBody">
                        <tr>
                            <td colspan="9" style="text-align: center; padding: 40px;">
                                <div class="loading-spinner"></div>
                                <p>Loading inventory...</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    createInventoryManagementSection() {
        const section = document.createElement('div');
        section.id = 'inventorySection';
        section.className = 'section-content';
        section.innerHTML = `
            <div class="section-header">
                <h1>Inventory Management</h1>
                <button class="btn btn-primary" onclick="window.dashboard.updateAllStock()">
                    <i class="icon">🔄</i> Update All Stock
                </button>
            </div>
            
            <div class="inventory-stats">
                <div class="stat-card">
                    <div class="stat-icon">📦</div>
                    <div class="stat-content">
                        <h3 id="totalProductsCount">0</h3>
                        <p>Total Products</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-content">
                        <h3 id="lowStockCount">0</h3>
                        <p>Low Stock</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">❌</div>
                    <div class="stat-content">
                        <h3 id="outOfStockCount">0</h3>
                        <p>Out of Stock</p>
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Current Stock</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="inventoryTableBody">
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 40px;">
                                <div class="loading-spinner"></div>
                                <p>Loading inventory...</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        return section;
    }

    renderInventoryTable() {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;
        
        // Update inventory stats
        this.updateInventoryStats();
        
        if (this.products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <div style="margin-bottom: 16px;">📦</div>
                        <div>No inventory data found</div>
                        <div style="font-size: 0.9rem; margin-top: 8px;">Add products to see inventory here</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        this.products.forEach(product => {
            const row = document.createElement('tr');
            const stock = product.stock || 0;
            const stockClass = this.getStockClass(stock);
            const stockStatus = this.getStockStatus(stock);
            const stockValue = this.calculateStockValue(product);
            
            // Create image thumbnail with fallback
            const imageUrl = product.img || product.imgUrl || 'https://via.placeholder.com/50';
            const imageAlt = product.name || 'Product Image';
            
            row.innerHTML = `
                <td>
                    <div class="product-image-container">
                        <img src="${imageUrl}" 
                             alt="${imageAlt}" 
                             style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;"
                             onerror="this.src='https://via.placeholder.com/50'">
                    </div>
                </td>
                <td>
                    <div class="inventory-product-info">
                        <div class="inventory-product-name" style="font-weight: 600; color: #333;">
                            ${product.name || 'Unnamed Product'}
                        </div>
                        <small style="display: block; color: var(--text-muted); font-size: 12px;">
                            ID: ${product.id || 'N/A'}
                        </small>
                    </div>
                </td>
                <td>
                    <span class="category-badge" style="background: ${this.getCategoryColor(product.category)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                        ${product.category || 'Uncategorized'}
                    </span>
                </td>
                <td>
                    <span class="subcategory-badge" style="background: #f0f0f0; color: #333; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                        ${product.subCategory || 'Not specified'}
                    </span>
                </td>
                <td>
                    <div class="stock-display">
                        <span class="stock-badge ${stockClass}" style="padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                            ${stock}
                        </span>
                        ${stock <= 10 && stock > 0 ? '<small style="display: block; color: #ff9800; font-size: 10px;">Low stock!</small>' : ''}
                        ${stock === 0 ? '<small style="display: block; color: #dc3545; font-size: 10px;">Out of stock</small>' : ''}
                    </div>
                </td>
                <td>
                    <span class="status-badge ${stockClass}" style="padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                        ${stockStatus}
                    </span>
                </td>
                <td>
                    <strong style="color: #28a745;">TK-${product.price || '0'}</strong>
                </td>
                <td>
                    <strong style="color: #007bff;">TK-${stockValue}</strong>
                </td>
                <td>
                    <div class="inventory-actions" style="display: flex; gap: 4px;">
                        <button class="btn btn-sm btn-primary" 
                                onclick="window.dashboard.updateStock('${product.id}')" 
                                style="padding: 4px 8px; font-size: 11px;"
                                title="Update Stock">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm ${stock <= 10 ? 'btn-warning' : 'btn-success'}" 
                                onclick="window.dashboard.quickStockUpdate('${product.id}', ${stock + 10})" 
                                style="padding: 4px 8px; font-size: 11px;"
                                title="Add 10 Stock">
                            +10
                        </button>
                    </div>
                </td>
            `;
            
            // Add hover effect to rows
            row.addEventListener('mouseenter', () => {
                row.style.backgroundColor = '#f8f9fa';
            });
            
            row.addEventListener('mouseleave', () => {
                row.style.backgroundColor = '';
            });
            
            tbody.appendChild(row);
        });
    }

    renderFilteredInventory(products) {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;
        
        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <div>No inventory items match your filters</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        products.forEach(product => {
            const row = document.createElement('tr');
            const stock = product.stock || 0;
            const stockClass = this.getStockClass(stock);
            const stockStatus = this.getStockStatus(stock);
            const stockValue = this.calculateStockValue(product);
            
            const imageUrl = product.img || product.imgUrl || 'https://via.placeholder.com/50';
            
            row.innerHTML = `
                <td>
                    <div class="product-image-container">
                        <img src="${imageUrl}" 
                             alt="${product.name}" 
                             style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;"
                             onerror="this.src='https://via.placeholder.com/50'">
                    </div>
                </td>
                <td>
                    <div class="inventory-product-info">
                        <div class="inventory-product-name" style="font-weight: 600; color: #333;">
                            ${product.name || 'Unnamed Product'}
                        </div>
                        <small style="display: block; color: var(--text-muted); font-size: 12px;">
                            ID: ${product.id || 'N/A'}
                        </small>
                    </div>
                </td>
                <td>
                    <span class="category-badge" style="background: ${this.getCategoryColor(product.category)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                        ${product.category || 'Uncategorized'}
                    </span>
                </td>
                <td>
                    <span class="subcategory-badge" style="background: #f0f0f0; color: #333; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                        ${product.subCategory || 'Not specified'}
                    </span>
                </td>
                <td>
                    <div class="stock-display">
                        <span class="stock-badge ${stockClass}" style="padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                            ${stock}
                        </span>
                        ${stock <= 10 && stock > 0 ? '<small style="display: block; color: #ff9800; font-size: 10px;">Low stock!</small>' : ''}
                        ${stock === 0 ? '<small style="display: block; color: #dc3545; font-size: 10px;">Out of stock</small>' : ''}
                    </div>
                </td>
                <td>
                    <span class="status-badge ${stockClass}" style="padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                        ${stockStatus}
                    </span>
                </td>
                <td>
                    <strong style="color: #28a745;">TK-${product.price || '0'}</strong>
                </td>
                <td>
                    <strong style="color: #007bff;">TK-${stockValue}</strong>
                </td>
                <td>
                    <div class="inventory-actions" style="display: flex; gap: 4px;">
                        <button class="btn btn-sm btn-primary" 
                                onclick="window.dashboard.updateStock('${product.id}')" 
                                style="padding: 4px 8px; font-size: 11px;"
                                title="Update Stock">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm ${stock <= 10 ? 'btn-warning' : 'btn-success'}" 
                                onclick="window.dashboard.quickStockUpdate('${product.id}', ${stock + 10})" 
                                style="padding: 4px 8px; font-size: 11px;"
                                title="Add 10 Stock">
                            +10
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    getStockStatus(stock) {
        if (stock === 0) return 'Out of Stock';
        if (stock <= 10) return 'Low Stock';
        return 'In Stock';
    }

    calculateStockValue(product) {
        const stock = product.stock || 0;
        const price = parseFloat(product.price) || 0;
        return (stock * price).toFixed(0);
    }

    updateInventoryStats() {
        const totalProductsEl = document.getElementById('totalProductsCount');
        const lowStockEl = document.getElementById('lowStockCount');
        const outOfStockEl = document.getElementById('outOfStockCount');
        const totalStockValueEl = document.getElementById('totalStockValue');
        
        if (totalProductsEl) totalProductsEl.textContent = this.products.length;
        
        const lowStock = this.products.filter(p => (p.stock || 0) <= 10 && (p.stock || 0) > 0).length;
        if (lowStockEl) lowStockEl.textContent = lowStock;
        
        const outOfStock = this.products.filter(p => (p.stock || 0) === 0).length;
        if (outOfStockEl) outOfStockEl.textContent = outOfStock;
        
        // Calculate total stock value
        const totalStockValue = this.products.reduce((total, product) => {
            const stock = product.stock || 0;
            const price = parseFloat(product.price) || 0;
            return total + (stock * price);
        }, 0);
        
        if (totalStockValueEl) totalStockValueEl.textContent = `TK-${totalStockValue.toFixed(0)}`;
    }

    // Stock Update Methods
    async updateStock(productId) {
        console.log('🔄 Updating stock for product:', productId);
        
        const product = this.products.find(p => p.id === productId);
        if (!product) {
            ToastManager.show('Product not found', 'error');
            return;
        }
        
        // Create stock update modal
        this.createStockUpdateModal(product);
    }

    createStockUpdateModal(product) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>Update Stock</h3>
                    <button class="modal-close" onclick="window.dashboard.closeStockUpdateModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="product-info" style="background: #f8f9fa; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${product.img || product.imgUrl || 'https://via.placeholder.com/60'}" 
                                 alt="${product.name}" 
                                 style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                            <div>
                                <div style="font-weight: 600;">${product.name}</div>
                                <div style="color: #6c757d; font-size: 14px;">${product.category} - ${product.subCategory}</div>
                                <div style="color: #28a745; font-weight: 600;">Current Stock: ${product.stock || 0}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="newStockQuantity">New Stock Quantity</label>
                        <input type="number" 
                               id="newStockQuantity" 
                               class="form-control" 
                               value="${product.stock || 0}" 
                               min="0" 
                               max="9999"
                               placeholder="Enter new stock quantity">
                    </div>
                    
                    <div class="stock-actions" style="display: flex; gap: 8px; margin-bottom: 16px;">
                        <button type="button" class="btn btn-sm btn-success" onclick="window.dashboard.setStockValue(${(product.stock || 0) + 10})">
                            +10
                        </button>
                        <button type="button" class="btn btn-sm btn-success" onclick="window.dashboard.setStockValue(${(product.stock || 0) + 25})">
                            +25
                        </button>
                        <button type="button" class="btn btn-sm btn-success" onclick="window.dashboard.setStockValue(${(product.stock || 0) + 50})">
                            +50
                        </button>
                        <button type="button" class="btn btn-sm btn-warning" onclick="window.dashboard.setStockValue(${Math.max(0, (product.stock || 0) - 10)})">
                            -10
                        </button>
                    </div>
                    
                    <div class="form-group">
                        <label for="stockUpdateReason">Update Reason (Optional)</label>
                        <textarea id="stockUpdateReason" 
                                  class="form-control" 
                                  rows="2" 
                                  placeholder="e.g., Restocked, Sold, Damaged, etc."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="window.dashboard.closeStockUpdateModal()">
                        Cancel
                    </button>
                    <button type="button" class="btn btn-primary" onclick="window.dashboard.saveStockUpdate('${product.id}')">
                        Update Stock
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modalContainer').appendChild(modal);
        modal.style.display = 'flex';
        
        // Focus on input
        setTimeout(() => {
            const input = document.getElementById('newStockQuantity');
            if (input) input.focus();
        }, 100);
    }

    setStockValue(value) {
        const input = document.getElementById('newStockQuantity');
        if (input) {
            input.value = Math.max(0, value);
        }
    }

    async saveStockUpdate(productId) {
        const newStock = parseInt(document.getElementById('newStockQuantity')?.value) || 0;
        const reason = document.getElementById('stockUpdateReason')?.value || '';
        
        if (isNaN(newStock) || newStock < 0) {
            ToastManager.show('Please enter a valid stock quantity', 'error');
            return;
        }
        
        const product = this.products.find(p => p.id === productId);
        if (!product) {
            ToastManager.show('Product not found', 'error');
            return;
        }
        
        const oldStock = product.stock || 0;
        const stockChange = newStock - oldStock;
        
        try {
            console.log('💾 Updating stock:', productId, 'from', oldStock, 'to', newStock);
            
            // Update in Firebase using same connection as website
            if (window.firebaseDB) {
                const { ref, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                const productRef = ref(window.firebaseDB, `products/${productId}`);
                await update(productRef, {
                    stock: newStock,
                    updatedAt: Date.now(),
                    stockUpdateReason: reason,
                    lastStockUpdate: {
                        from: oldStock,
                        to: newStock,
                        change: stockChange,
                        reason: reason,
                        timestamp: Date.now()
                    }
                });
                console.log('✅ Stock updated via website Firebase connection');
            } else {
                // Fallback to admin Firebase connection
                const productRef = dbRef(db, `products/${productId}`);
                await update(productRef, {
                    stock: newStock,
                    updatedAt: Date.now(),
                    stockUpdateReason: reason,
                    lastStockUpdate: {
                        from: oldStock,
                        to: newStock,
                        change: stockChange,
                        reason: reason,
                        timestamp: Date.now()
                    }
                });
                console.log('✅ Stock updated via admin Firebase connection');
            }
            
            // Update local product data
            product.stock = newStock;
            product.updatedAt = Date.now();
            
            // Refresh inventory table
            this.renderInventoryTable();
            this.updateInventoryStats();
            
            // Update product section if visible
            this.renderProducts();
            
            this.closeStockUpdateModal();
            
            ToastManager.show(`Stock updated successfully: ${oldStock} → ${newStock} (${stockChange > 0 ? '+' : ''}${stockChange})`, 'success');
            
        } catch (error) {
            console.error('❌ Error updating stock:', error);
            ToastManager.show('Failed to update stock: ' + error.message, 'error');
        }
    }

    async quickStockUpdate(productId, newStock) {
        const product = this.products.find(p => p.id === productId);
        if (!product) {
            ToastManager.show('Product not found', 'error');
            return;
        }
        
        const oldStock = product.stock || 0;
        
        try {
            console.log('⚡ Quick stock update:', productId, 'from', oldStock, 'to', newStock);
            
            // Update in Firebase
            if (window.firebaseDB) {
                const { ref, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                const productRef = ref(window.firebaseDB, `products/${productId}`);
                await update(productRef, {
                    stock: newStock,
                    updatedAt: Date.now(),
                    lastStockUpdate: {
                        from: oldStock,
                        to: newStock,
                        change: newStock - oldStock,
                        reason: 'Quick update',
                        timestamp: Date.now()
                    }
                });
            } else {
                const productRef = dbRef(db, `products/${productId}`);
                await update(productRef, {
                    stock: newStock,
                    updatedAt: Date.now(),
                    lastStockUpdate: {
                        from: oldStock,
                        to: newStock,
                        change: newStock - oldStock,
                        reason: 'Quick update',
                        timestamp: Date.now()
                    }
                });
            }
            
            // Update local product data
            product.stock = newStock;
            product.updatedAt = Date.now();
            
            // Refresh inventory table
            this.renderInventoryTable();
            this.updateInventoryStats();
            
            // Update product section if visible
            this.renderProducts();
            
            ToastManager.show(`Stock updated: ${oldStock} → ${newStock}`, 'success');
            
        } catch (error) {
            console.error('❌ Error in quick stock update:', error);
            ToastManager.show('Failed to update stock', 'error');
        }
    }

    closeStockUpdateModal() {
        const modal = document.getElementById('modalContainer');
        if (modal) {
            modal.innerHTML = '';
        }
    }

    updateAllStock() {
        ToastManager.show('Bulk stock update feature coming soon', 'info');
    }

    // ORDER MANAGEMENT METHODS
    loadOrderManagement() {
        console.log('🛒 Loading order management...');
        
        let orderSection = document.getElementById('orderSection');
        if (orderSection) {
            // Section exists, fill it with content
            orderSection.innerHTML = this.createOrderManagementContent();
            orderSection.style.display = 'block';
        } else {
            // Section doesn't exist, create it (fallback)
            orderSection = this.createOrderManagementSection();
            document.querySelector('.main-content').appendChild(orderSection);
        }
        
        // Bind events after content is rendered
        this.bindOrderEvents();
        this.renderOrderTable();
    }

    createOrderManagementContent() {
        return `
            <div class="section-header">
                <h1>Order Management</h1>
                <div class="order-controls">
                    <select id="orderStatusFilter" class="filter-select">
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <input type="text" id="orderSearch" placeholder="Search by Order ID or Customer..." class="search-input">
                    <button class="btn btn-primary" onclick="window.dashboard.refreshOrders()">
                        <i class="fas fa-sync"></i> Refresh
                    </button>
                </div>
            </div>
            
            <div class="order-stats">
                <div class="stat-card">
                    <div class="stat-icon">🛒</div>
                    <div class="stat-content">
                        <h3 id="totalOrdersCount">0</h3>
                        <p>Total Orders</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-content">
                        <h3 id="pendingOrdersCount">0</h3>
                        <p>Pending Orders</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✅</div>
                    <div class="stat-content">
                        <h3 id="completedOrdersCount">0</h3>
                        <p>Completed Orders</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <h3 id="totalRevenue">TK-0</h3>
                        <p>Total Revenue</p>
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer Info</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="orderTableBody">
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 40px;">
                                <div class="loading-spinner"></div>
                                <p>Loading orders...</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    bindOrderEvents() {
        // Bind order search and filter events
        const statusFilter = document.getElementById('orderStatusFilter');
        const searchInput = document.getElementById('orderSearch');
        
        if (statusFilter) {
            statusFilter.removeEventListener('change', this.filterOrders.bind(this));
            statusFilter.addEventListener('change', () => this.filterOrders());
        }
        
        if (searchInput) {
            searchInput.removeEventListener('input', this.filterOrders.bind(this));
            searchInput.addEventListener('input', () => this.filterOrders());
        }
    }

    createOrderManagementSection() {
        const section = document.createElement('div');
        section.id = 'orderSection';
        section.className = 'section-content';
        section.innerHTML = `
            <div class="section-header">
                <h1>Order Management</h1>
                <div class="order-controls">
                    <select id="orderStatusFilter" class="filter-select">
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <input type="text" id="orderSearch" placeholder="Search orders..." class="search-input">
                </div>
            </div>
            
            <div class="order-stats">
                <div class="stat-card">
                    <div class="stat-icon">🛒</div>
                    <div class="stat-content">
                        <h3 id="totalOrdersCount">0</h3>
                        <p>Total Orders</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-content">
                        <h3 id="pendingOrdersCount">0</h3>
                        <p>Pending Orders</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✅</div>
                    <div class="stat-content">
                        <h3 id="completedOrdersCount">0</h3>
                        <p>Completed Orders</p>
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="orderTableBody">
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 40px;">
                                <div class="loading-spinner"></div>
                                <p>Loading orders...</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        
        // Add event listeners
        const statusFilter = section.querySelector('#orderStatusFilter');
        const searchInput = section.querySelector('#orderSearch');
        
        if (statusFilter) statusFilter.addEventListener('change', () => this.filterOrders());
        if (searchInput) searchInput.addEventListener('input', () => this.filterOrders());
        
        return section;
    }

    renderOrderTable() {
        const tbody = document.getElementById('orderTableBody');
        if (!tbody) return;
        
        // Update order stats
        this.updateOrderStats();
        
        if (this.orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <div style="margin-bottom: 16px;">📦</div>
                        <div>No orders found</div>
                        <div style="font-size: 0.9rem; margin-top: 8px;">Orders will appear here when customers make purchases</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        // Sort orders by date (newest first)
        const sortedOrders = [...this.orders].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        sortedOrders.forEach(order => {
            const row = document.createElement('tr');
            
            // Extract order information
            const orderId = order.id || 'Unknown';
            const customerName = order.customerName || order.customer?.name || 'Unknown Customer';
            const customerEmail = order.customerEmail || order.customer?.email || '';
            const customerPhone = order.customerPhone || order.customer?.phone || '';
            const itemCount = order.items ? order.items.length : (order.itemCount || 1);
            const total = order.total || order.amount || 0;
            const status = order.status || 'pending';
            const createdDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Unknown';
            
            // Status styling
            const statusClass = this.getOrderStatusClass(status);
            const statusText = this.getOrderStatusText(status);
            
            row.innerHTML = `
                <td>
                    <div class="order-id">
                        <strong>#${orderId}</strong>
                        <small style="display: block; color: var(--text-muted); font-size: 12px;">
                            ID: ${orderId}
                        </small>
                    </div>
                </td>
                <td>
                    <div class="customer-info">
                        <div class="customer-name" style="font-weight: 600; color: #333;">
                            ${customerName}
                        </div>
                        ${customerEmail ? `<small style="display: block; color: var(--text-muted); font-size: 12px;">${customerEmail}</small>` : ''}
                        ${customerPhone ? `<small style="display: block; color: var(--text-muted); font-size: 12px;">${customerPhone}</small>` : ''}
                    </div>
                </td>
                <td>
                    <div class="item-count">
                        <span style="font-weight: 600;">${itemCount}</span>
                        <small style="display: block; color: var(--text-muted); font-size: 12px;">
                            ${itemCount === 1 ? 'item' : 'items'}
                        </small>
                    </div>
                </td>
                <td>
                    <div class="order-total">
                        <strong style="color: #28a745;">TK-${total}</strong>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}" style="padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                        ${statusText}
                    </span>
                </td>
                <td>
                    <div class="order-date">
                        <div>${createdDate}</div>
                        ${order.createdAt ? `<small style="color: var(--text-muted); font-size: 12px;">${this.getRelativeTime(order.createdAt)}</small>` : ''}
                    </div>
                </td>
                <td>
                    <div class="order-actions" style="display: flex; gap: 4px;">
                        <button class="btn btn-sm btn-primary" 
                                onclick="window.dashboard.viewOrderDetails('${orderId}')" 
                                style="padding: 4px 8px; font-size: 11px;"
                                title="View Order Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" 
                                onclick="window.dashboard.updateOrderStatus('${orderId}')" 
                                style="padding: 4px 8px; font-size: 11px;"
                                title="Update Status">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            `;
            
            // Add hover effect to rows
            row.addEventListener('mouseenter', () => {
                row.style.backgroundColor = '#f8f9fa';
            });
            
            row.addEventListener('mouseleave', () => {
                row.style.backgroundColor = '';
            });
            
            tbody.appendChild(row);
        });
    }

    renderFilteredOrders(orders) {
        const tbody = document.getElementById('orderTableBody');
        if (!tbody) return;
        
        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <div>No orders match your filters</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        // Sort filtered orders by date (newest first)
        const sortedOrders = [...orders].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        sortedOrders.forEach(order => {
            const row = document.createElement('tr');
            
            const orderId = order.id || 'Unknown';
            const customerName = order.customerName || order.customer?.name || 'Unknown Customer';
            const customerEmail = order.customerEmail || order.customer?.email || '';
            const itemCount = order.items ? order.items.length : (order.itemCount || 1);
            const total = order.total || order.amount || 0;
            const status = order.status || 'pending';
            const createdDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Unknown';
            
            const statusClass = this.getOrderStatusClass(status);
            const statusText = this.getOrderStatusText(status);
            
            row.innerHTML = `
                <td>
                    <div class="order-id">
                        <strong>#${orderId}</strong>
                    </div>
                </td>
                <td>
                    <div class="customer-info">
                        <div class="customer-name" style="font-weight: 600; color: #333;">
                            ${customerName}
                        </div>
                        ${customerEmail ? `<small style="display: block; color: var(--text-muted); font-size: 12px;">${customerEmail}</small>` : ''}
                    </div>
                </td>
                <td>
                    <div class="item-count">
                        <span style="font-weight: 600;">${itemCount}</span>
                    </div>
                </td>
                <td>
                    <div class="order-total">
                        <strong style="color: #28a745;">TK-${total}</strong>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}" style="padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                        ${statusText}
                    </span>
                </td>
                <td>
                    <div class="order-date">
                        <div>${createdDate}</div>
                    </div>
                </td>
                <td>
                    <div class="order-actions" style="display: flex; gap: 4px;">
                        <button class="btn btn-sm btn-primary" 
                                onclick="window.dashboard.viewOrderDetails('${orderId}')" 
                                style="padding: 4px 8px; font-size: 11px;"
                                title="View Order Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" 
                                onclick="window.dashboard.updateOrderStatus('${orderId}')" 
                                style="padding: 4px 8px; font-size: 11px;"
                                title="Update Status">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    getOrderStatusClass(status) {
        switch(status.toLowerCase()) {
            case 'pending': return 'pending';
            case 'processing': return 'processing';
            case 'shipped': return 'shipped';
            case 'delivered': return 'delivered';
            case 'cancelled': return 'cancelled';
            default: return 'pending';
        }
    }

    getOrderStatusText(status) {
        switch(status.toLowerCase()) {
            case 'pending': return 'Pending';
            case 'processing': return 'Processing';
            case 'shipped': return 'Shipped';
            case 'delivered': return 'Delivered';
            case 'cancelled': return 'Cancelled';
            default: return 'Pending';
        }
    }

    getRelativeTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    updateOrderStats() {
        const totalOrdersEl = document.getElementById('totalOrdersCount');
        const pendingOrdersEl = document.getElementById('pendingOrdersCount');
        const completedOrdersEl = document.getElementById('completedOrdersCount');
        const totalRevenueEl = document.getElementById('totalRevenue');
        
        if (totalOrdersEl) totalOrdersEl.textContent = this.orders.length;
        
        const pendingOrders = this.orders.filter(o => (o.status || 'pending') === 'pending').length;
        if (pendingOrdersEl) pendingOrdersEl.textContent = pendingOrders;
        
        const completedOrders = this.orders.filter(o => (o.status || 'pending') === 'delivered').length;
        if (completedOrdersEl) completedOrdersEl.textContent = completedOrders;
        
        // Calculate total revenue from completed orders
        const totalRevenue = this.orders
            .filter(o => (o.status || 'pending') === 'delivered')
            .reduce((sum, order) => sum + (parseFloat(order.total || order.amount || 0)), 0);
        
        if (totalRevenueEl) totalRevenueEl.textContent = `TK-${totalRevenue.toFixed(0)}`;
    }

    filterOrders() {
        const statusFilter = document.getElementById('orderStatusFilter')?.value || '';
        const searchTerm = document.getElementById('orderSearch')?.value.toLowerCase() || '';
        
        console.log('🔍 Filtering orders:', { statusFilter, searchTerm });
        
        let filteredOrders = this.orders;
        
        // Apply status filter
        if (statusFilter) {
            filteredOrders = filteredOrders.filter(order => 
                (order.status || 'pending') === statusFilter
            );
        }
        
        // Apply search filter
        if (searchTerm) {
            filteredOrders = filteredOrders.filter(order => {
                // Search by order ID
                const orderIdMatch = order.id && order.id.toLowerCase().includes(searchTerm);
                
                // Search by customer name
                const customerNameMatch = (order.customerName || order.customer?.name || '') 
                    .toLowerCase().includes(searchTerm);
                
                // Search by customer email
                const customerEmailMatch = (order.customerEmail || order.customer?.email || '') 
                    .toLowerCase().includes(searchTerm);
                
                // Search by customer phone
                const customerPhoneMatch = (order.customerPhone || order.customer?.phone || '') 
                    .toLowerCase().includes(searchTerm);
                
                return orderIdMatch || customerNameMatch || customerEmailMatch || customerPhoneMatch;
            });
        }
        
        console.log('🔍 Filtered orders:', filteredOrders.length, 'out of', this.orders.length);
        
        this.renderFilteredOrders(filteredOrders);
        
        // Show search feedback
        if (searchTerm && filteredOrders.length === 0) {
            this.showOrderSearchFeedback('No orders found matching "' + searchTerm + '"');
        } else if (searchTerm && filteredOrders.length > 0) {
            this.showOrderSearchFeedback('Found ' + filteredOrders.length + ' order' + (filteredOrders.length > 1 ? 's' : '') + ' matching "' + searchTerm + '"');
        } else if (statusFilter && filteredOrders.length === 0) {
            this.showOrderSearchFeedback('No orders with status "' + this.getOrderStatusText(statusFilter) + '"');
        } else {
            this.hideOrderSearchFeedback();
        }
    }

    showOrderSearchFeedback(message) {
        // Create or update search feedback
        let feedback = document.getElementById('orderSearchFeedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.id = 'orderSearchFeedback';
            feedback.style.cssText = `
                padding: 8px 12px;
                background: var(--accent-color);
                color: white;
                border-radius: 4px;
                margin-bottom: 12px;
                font-size: 14px;
                animation: slideIn 0.3s ease;
            `;
            
            const orderControls = document.querySelector('.order-controls');
            if (orderControls) {
                orderControls.appendChild(feedback);
            }
        }
        
        feedback.textContent = message;
        feedback.style.display = 'block';
    }

    hideOrderSearchFeedback() {
        const feedback = document.getElementById('orderSearchFeedback');
        if (feedback) {
            feedback.style.display = 'none';
        }
    }

    renderFilteredOrders(orders) {
        const tbody = document.getElementById('orderTableBody');
        if (!tbody) return;
        
        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <div>No orders match your filters</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        orders.forEach(order => {
            const row = document.createElement('tr');
            const orderDate = new Date(order.createdAt || order.timestamp || Date.now());
            
            row.innerHTML = `
                <td>
                    <strong>#${order.id || 'Unknown'}</strong>
                </td>
                <td>
                    <div class="customer-info">
                        <div>${order.customerName || order.name || 'Unknown Customer'}</div>
                        <small>${order.customerEmail || order.email || 'No email'}</small>
                    </div>
                </td>
                <td>${orderDate.toLocaleDateString()}</td>
                <td>TK-${order.total || order.amount || 0}</td>
                <td>
                    <span class="status-badge ${order.status || 'pending'}">
                        ${order.status || 'pending'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="window.dashboard.viewOrderDetails('${order.id}')">
                            View
                        </button>
                        <button class="btn btn-sm btn-success" onclick="window.dashboard.updateOrderStatus('${order.id}', 'shipped')">
                            Ship
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async updateOrderStatus(orderId, newStatus) {
        try {
            const orderRef = dbRef(db, `orders/${orderId}`);
            await update(orderRef, {
                status: newStatus,
                updatedAt: Date.now()
            });
            
            ToastManager.show('Order status updated', 'success');
            
        } catch (error) {
            console.error('Error updating order status:', error);
            ToastManager.show('Failed to update order status', 'error');
        }
    }

    viewOrderDetails(orderId) {
        console.log('👁️ Viewing order details:', orderId);
        
        const order = this.orders.find(o => o.id === orderId);
        if (!order) {
            ToastManager.show('Order not found', 'error');
            return;
        }
        
        this.createOrderDetailsModal(order);
    }

    createOrderDetailsModal(order) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        // Calculate order totals
        const subtotal = order.items ? order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : (order.total || 0);
        const shipping = order.shipping || 0;
        const tax = order.tax || 0;
        const total = order.total || order.amount || subtotal + shipping + tax;
        
        // Format customer info
        const customerName = order.customerName || order.customer?.name || 'Unknown Customer';
        const customerEmail = order.customerEmail || order.customer?.email || 'No email';
        const customerPhone = order.customerPhone || order.customer?.phone || 'No phone';
        const customerAddress = order.customerAddress || order.customer?.address || 'No address provided';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>Order Details - #${order.id}</h3>
                    <button class="modal-close" onclick="window.dashboard.closeOrderDetailsModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="order-details-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <!-- Customer Information -->
                        <div class="customer-details" style="background: #f8f9fa; padding: 16px; border-radius: 8px;">
                            <h4 style="margin-bottom: 12px; color: #333;">Customer Information</h4>
                            <div style="display: grid; gap: 8px;">
                                <div><strong>Name:</strong> ${customerName}</div>
                                <div><strong>Email:</strong> ${customerEmail}</div>
                                <div><strong>Phone:</strong> ${customerPhone}</div>
                                <div><strong>Address:</strong> ${customerAddress}</div>
                            </div>
                        </div>
                        
                        <!-- Order Information -->
                        <div class="order-info" style="background: #f8f9fa; padding: 16px; border-radius: 8px;">
                            <h4 style="margin-bottom: 12px; color: #333;">Order Information</h4>
                            <div style="display: grid; gap: 8px;">
                                <div><strong>Order ID:</strong> #${order.id}</div>
                                <div><strong>Date:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Unknown'}</div>
                                <div><strong>Status:</strong> <span class="status-badge ${this.getOrderStatusClass(order.status)}">${this.getOrderStatusText(order.status)}</span></div>
                                <div><strong>Payment:</strong> ${order.paymentMethod || 'Cash on Delivery'}</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Order Items -->
                    <div class="order-items" style="margin-bottom: 20px;">
                        <h4 style="margin-bottom: 12px; color: #333;">Order Items</h4>
                        <div class="items-table" style="background: #fff; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                            ${this.renderOrderItemsTable(order)}
                        </div>
                    </div>
                    
                    <!-- Order Summary -->
                    <div class="order-summary" style="background: #f8f9fa; padding: 16px; border-radius: 8px;">
                        <h4 style="margin-bottom: 12px; color: #333;">Order Summary</h4>
                        <div style="display: grid; gap: 8px;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>Subtotal:</span>
                                <strong>TK-${subtotal}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Shipping:</span>
                                <strong>TK-${shipping}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Tax:</span>
                                <strong>TK-${tax}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; border-top: 2px solid #333; padding-top: 8px; margin-top: 8px;">
                                <span><strong>Total:</strong></span>
                                <strong style="color: #28a745;">TK-${total}</strong>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="window.dashboard.closeOrderDetailsModal()">
                        Close
                    </button>
                    <button type="button" class="btn btn-warning" onclick="window.dashboard.updateOrderStatus('${order.id}')">
                        Update Status
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modalContainer').appendChild(modal);
        modal.style.display = 'flex';
    }

    renderOrderItemsTable(order) {
        if (!order.items || order.items.length === 0) {
            return '<div style="padding: 20px; text-align: center;">No items found</div>';
        }
        
        return `
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: #f8f9fa;">
                    <tr>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Product</th>
                        <th style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd;">Quantity</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd;">Price</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => `
                        <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                                <div>
                                    <strong>${item.name || 'Unknown Product'}</strong>
                                    ${item.color ? `<small style="display: block; color: #666;">Color: ${item.color}</small>` : ''}
                                    ${item.size ? `<small style="display: block; color: #666;">Size: ${item.size}</small>` : ''}
                                </div>
                            </td>
                            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity || 1}</td>
                            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">TK-${item.price || 0}</td>
                            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">TK-${(item.price || 0) * (item.quantity || 1)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    closeOrderDetailsModal() {
        const modal = document.getElementById('modalContainer');
        if (modal) {
            modal.innerHTML = '';
        }
    }

    async updateOrderStatus(orderId) {
        console.log('🔄 Updating order status:', orderId);
        
        const order = this.orders.find(o => o.id === orderId);
        if (!order) {
            ToastManager.show('Order not found', 'error');
            return;
        }
        
        this.createStatusUpdateModal(order);
    }

    createStatusUpdateModal(order) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        const currentStatus = order.status || 'pending';
        const statusOptions = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>Update Order Status - #${order.id}</h3>
                    <button class="modal-close" onclick="window.dashboard.closeStatusUpdateModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="order-summary" style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="display: grid; gap: 8px;">
                            <div><strong>Customer:</strong> ${order.customerName || order.customer?.name || 'Unknown'}</div>
                            <div><strong>Total:</strong> TK-${order.total || order.amount || 0}</div>
                            <div><strong>Current Status:</strong> <span class="status-badge ${this.getOrderStatusClass(currentStatus)}">${this.getOrderStatusText(currentStatus)}</span></div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="newOrderStatus">New Status</label>
                        <select id="newOrderStatus" class="form-control">
                            ${statusOptions.map(status => `
                                <option value="${status}" ${status === currentStatus ? 'selected' : ''}>
                                    ${this.getOrderStatusText(status)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="statusUpdateReason">Update Reason (Optional)</label>
                        <textarea id="statusUpdateReason" 
                                  class="form-control" 
                                  rows="3" 
                                  placeholder="e.g., Payment confirmed, Order processed, Shipped via courier, etc."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="window.dashboard.closeStatusUpdateModal()">
                        Cancel
                    </button>
                    <button type="button" class="btn btn-primary" onclick="window.dashboard.saveOrderStatusUpdate('${order.id}')">
                        Update Status
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modalContainer').appendChild(modal);
        modal.style.display = 'flex';
    }

    async saveOrderStatusUpdate(orderId) {
        const newStatus = document.getElementById('newOrderStatus')?.value;
        const reason = document.getElementById('statusUpdateReason')?.value || '';
        
        if (!newStatus) {
            ToastManager.show('Please select a status', 'error');
            return;
        }
        
        const order = this.orders.find(o => o.id === orderId);
        if (!order) {
            ToastManager.show('Order not found', 'error');
            return;
        }
        
        const oldStatus = order.status || 'pending';
        
        try {
            console.log('💾 Updating order status:', orderId, 'from', oldStatus, 'to', newStatus);
            
            // Update in Firebase using same connection as website
            if (window.firebaseDB) {
                const { ref, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                const orderRef = ref(window.firebaseDB, `orders/${orderId}`);
                await update(orderRef, {
                    status: newStatus,
                    updatedAt: Date.now(),
                    statusUpdateReason: reason,
                    lastStatusUpdate: {
                        from: oldStatus,
                        to: newStatus,
                        reason: reason,
                        timestamp: Date.now()
                    }
                });
                console.log('✅ Order status updated via website Firebase connection');
            } else {
                // Fallback to admin Firebase connection
                const orderRef = dbRef(db, `orders/${orderId}`);
                await update(orderRef, {
                    status: newStatus,
                    updatedAt: Date.now(),
                    statusUpdateReason: reason,
                    lastStatusUpdate: {
                        from: oldStatus,
                        to: newStatus,
                        reason: reason,
                        timestamp: Date.now()
                    }
                });
                console.log('✅ Order status updated via admin Firebase connection');
            }
            
            // Update local order data
            order.status = newStatus;
            order.updatedAt = Date.now();
            
            // Refresh order table
            this.renderOrderTable();
            this.updateOrderStats();
            
            this.closeStatusUpdateModal();
            this.closeOrderDetailsModal(); // Close details modal if open
            
            ToastManager.show(`Order status updated: ${this.getOrderStatusText(oldStatus)} → ${this.getOrderStatusText(newStatus)}`, 'success');
            
        } catch (error) {
            console.error('❌ Error updating order status:', error);
            ToastManager.show('Failed to update order status: ' + error.message, 'error');
        }
    }

    closeStatusUpdateModal() {
        const modal = document.getElementById('modalContainer');
        if (modal) {
            modal.innerHTML = '';
        }
    }

    refreshOrders() {
        console.log('🔄 Refreshing orders...');
        ToastManager.show('Orders refreshed', 'success');
        this.renderOrderTable();
        this.updateOrderStats();
    }

    viewOrderDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;
        
        this.createOrderDetailsModal(order);
        alert(`Order Details:\n\nID: ${order.id}\nCustomer: ${order.customerName}\nEmail: ${order.customerEmail}\nTotal: TK-${order.total}\nStatus: ${order.status}`);
    }

    // MEDIA MANAGEMENT METHODS
    loadMediaManager() {
        console.log('🖼️ Loading media manager...');
        
        let mediaSection = document.getElementById('mediaSection');
        if (mediaSection) {
            // Section exists, fill it with content
            mediaSection.innerHTML = this.createMediaManagerContent();
            mediaSection.style.display = 'block';
        } else {
            // Section doesn't exist, create it (fallback)
            mediaSection = this.createMediaManagerSection();
            document.querySelector('.main-content').appendChild(mediaSection);
        }
        
        // Bind events after content is rendered
        this.bindMediaEvents();
        this.renderMediaGrid();
    }

    createMediaManagerContent() {
        return `
            <div class="section-header">
                <h1>Media Manager</h1>
                <button class="btn btn-primary" onclick="window.dashboard.openUploadModal()">
                    <i class="icon">📤</i> Upload Media
                </button>
            </div>
            
            <div class="media-controls">
                <div class="upload-area" id="uploadArea">
                    <div class="upload-content">
                        <div class="upload-icon">📤</div>
                        <h3>Drag & Drop Media Files</h3>
                        <p>or click to browse</p>
                        <input type="file" id="mediaInput" accept="image/*" multiple style="display: none;">
                    </div>
                </div>
            </div>
            
            <div class="media-grid" id="mediaGrid">
                <div class="media-placeholder">
                    <div class="placeholder-icon">🖼️</div>
                    <p>No media files uploaded yet</p>
                    <p style="font-size: 0.9rem; color: var(--text-muted);">
                        Upload product images and other media files
                    </p>
                </div>
            </div>
        `;
    }

    bindMediaEvents() {
        // Bind media upload events
        const uploadArea = document.getElementById('uploadArea');
        const mediaInput = document.getElementById('mediaInput');
        
        if (uploadArea) {
            uploadArea.addEventListener('click', () => mediaInput?.click());
        }
        
        if (mediaInput) {
            mediaInput.removeEventListener('change', this.handleMediaUpload.bind(this));
            mediaInput.addEventListener('change', (e) => this.handleMediaUpload(e.target.files));
        }
    }

    renderMediaGrid() {
        const mediaGrid = document.getElementById('mediaGrid');
        if (!mediaGrid) return;
        
        // Show loading state
        mediaGrid.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="loading-spinner"></div>
                <p>Loading media files...</p>
            </div>
        `;
        
        // Load media from Firebase Storage
        this.loadMediaFromStorage();
    }

    async loadMediaFromStorage() {
        try {
            console.log('🖼️ Loading media from Firebase Storage...');
            
            // Check if Firebase Storage is available
            if (!storage) {
                console.log('⚠️ Firebase Storage not available, showing empty state');
                this.showEmptyMediaState();
                return;
            }
            
            const { listAll, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js");
            const storageRef = storageRef(storage, 'products/');
            
            try {
                const result = await listAll(storageRef);
                console.log('🖼️ Found', result.items.length, 'media files');
                
                if (result.items.length === 0) {
                    this.showEmptyMediaState();
                    return;
                }
                
                // Get download URLs for all items
                const mediaItems = await Promise.all(
                    result.items.map(async (itemRef) => {
                        try {
                            const downloadURL = await getDownloadURL(itemRef);
                            return {
                                name: itemRef.name,
                                path: itemRef.fullPath,
                                url: downloadURL,
                                size: await this.getFileSize(itemRef),
                                createdAt: await this.getFileCreatedDate(itemRef)
                            };
                        } catch (error) {
                            console.warn('❌ Failed to get download URL for:', itemRef.name, error);
                            return null;
                        }
                    })
                );
                
                // Filter out null items and sort by newest first
                const validMediaItems = mediaItems
                    .filter(item => item !== null)
                    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                
                console.log('✅ Loaded', validMediaItems.length, 'media files');
                this.displayMediaGrid(validMediaItems);
                
            } catch (error) {
                console.warn('❌ No media files found in Storage:', error);
                this.showEmptyMediaState();
            }
            
        } catch (error) {
            console.error('❌ Error loading media from Storage:', error);
            this.showEmptyMediaState();
        }
    }

    async getFileSize(fileRef) {
        try {
            // Note: Firebase Storage doesn't provide file size without downloading
            // For now, we'll return a default size
            return 'Unknown';
        } catch (error) {
            return 'Unknown';
        }
    }

    async getFileCreatedDate(fileRef) {
        try {
            // Extract timestamp from filename if possible
            const name = fileRef.name;
            const timestampMatch = name.match(/(\d{13})/); // Match 13-digit timestamp
            if (timestampMatch) {
                return parseInt(timestampMatch[1]);
            }
            // Fallback to current time
            return Date.now();
        } catch (error) {
            return Date.now();
        }
    }

    displayMediaGrid(mediaItems) {
        const mediaGrid = document.getElementById('mediaGrid');
        if (!mediaGrid) return;
        
        if (mediaItems.length === 0) {
            this.showEmptyMediaState();
            return;
        }
        
        mediaGrid.innerHTML = '';
        
        // Create grid layout
        const gridContainer = document.createElement('div');
        gridContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
            padding: 20px;
        `;
        
        mediaItems.forEach(mediaItem => {
            const mediaCard = this.createMediaCard(mediaItem);
            gridContainer.appendChild(mediaCard);
        });
        
        mediaGrid.appendChild(gridContainer);
    }

    createMediaCard(mediaItem) {
        const card = document.createElement('div');
        card.className = 'media-card';
        card.style.cssText = `
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        `;
        
        // Format file size and date
        const fileSize = mediaItem.size !== 'Unknown' ? this.formatFileSize(mediaItem.size) : 'Unknown size';
        const createdDate = mediaItem.createdAt ? new Date(mediaItem.createdAt).toLocaleDateString() : 'Unknown date';
        
        card.innerHTML = `
            <div class="media-thumbnail" style="position: relative; padding-bottom: 75%; background: #f8f9fa;">
                <img src="${mediaItem.url}" 
                     alt="${mediaItem.name}" 
                     style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"
                     onerror="this.src='https://via.placeholder.com/200x150?text=Error'">
                <div class="media-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s ease;">
                    <button class="btn btn-sm btn-primary" style="margin: 0 5px;" onclick="window.dashboard.previewMedia('${mediaItem.url}', '${mediaItem.name}')">
                        <i class="fas fa-eye"></i> Preview
                    </button>
                    <button class="btn btn-sm btn-danger" style="margin: 0 5px;" onclick="window.dashboard.deleteMedia('${mediaItem.path}', '${mediaItem.name}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
            <div class="media-info" style="padding: 12px;">
                <div class="media-name" style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${mediaItem.name}">
                    ${mediaItem.name}
                </div>
                <div class="media-meta" style="font-size: 12px; color: #666;">
                    <div>${fileSize}</div>
                    <div>${createdDate}</div>
                </div>
            </div>
        `;
        
        // Add hover effects
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            const overlay = card.querySelector('.media-overlay');
            if (overlay) overlay.style.opacity = '1';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.boxShadow = '';
            const overlay = card.querySelector('.media-overlay');
            if (overlay) overlay.style.opacity = '0';
        });
        
        return card;
    }

    formatFileSize(bytes) {
        if (bytes === 'Unknown') return 'Unknown size';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    showEmptyMediaState() {
        const mediaGrid = document.getElementById('mediaGrid');
        if (!mediaGrid) return;
        
        mediaGrid.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🖼️</div>
                    <h3 style="margin-bottom: 8px;">No Media Files</h3>
                    <p style="margin-bottom: 16px;">Upload images to manage your media library</p>
                    <button class="btn btn-primary" onclick="window.dashboard.openUploadModal()">
                        <i class="icon">📤</i> Upload Your First Media File
                    </button>
                </div>
            </div>
        `;
    }

    // Media Upload and Management Methods
    async handleMediaUpload(files) {
        if (!files || files.length === 0) return;
        
        console.log('📤 Uploading', files.length, 'media files...');
        
        const uploadPromises = Array.from(files).map(async (file) => {
            try {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    console.warn('❌ Skipping non-image file:', file.name);
                    return null;
                }
                
                // Upload to Firebase Storage
                const timestamp = Date.now();
                const fileName = `${timestamp}_${file.name}`;
                const storageReference = storageRef(storage, `products/${fileName}`);
                
                const { uploadBytes, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js");
                
                await uploadBytes(storageReference, file);
                const downloadURL = await getDownloadURL(storageReference);
                
                console.log('✅ Uploaded:', file.name);
                return {
                    name: fileName,
                    originalName: file.name,
                    url: downloadURL,
                    path: storageReference.fullPath,
                    size: file.size,
                    createdAt: timestamp
                };
                
            } catch (error) {
                console.error('❌ Failed to upload:', file.name, error);
                return null;
            }
        });
        
        try {
            const results = await Promise.all(uploadPromises);
            const successfulUploads = results.filter(result => result !== null);
            
            if (successfulUploads.length > 0) {
                ToastManager.show(`Successfully uploaded ${successfulUploads.length} file(s)`, 'success');
                // Refresh the media grid
                this.renderMediaGrid();
            } else {
                ToastManager.show('No files were uploaded successfully', 'error');
            }
            
        } catch (error) {
            console.error('❌ Error during upload:', error);
            ToastManager.show('Failed to upload files', 'error');
        }
    }

    openUploadModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>Upload Media Files</h3>
                    <button class="modal-close" onclick="window.dashboard.closeUploadModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="upload-area" style="border: 2px dashed #ddd; border-radius: 8px; padding: 40px; text-align: center; cursor: pointer; transition: border-color 0.2s ease;" 
                         onmouseover="this.style.borderColor='#007bff'" 
                         onmouseout="this.style.borderColor='#ddd'"
                         onclick="document.getElementById('modalMediaInput').click()">
                        <div style="font-size: 48px; margin-bottom: 16px;">📤</div>
                        <h3 style="margin-bottom: 8px;">Click to Upload or Drag & Drop</h3>
                        <p style="color: #666;">Select image files to upload to your media library</p>
                        <input type="file" id="modalMediaInput" accept="image/*" multiple style="display: none;" onchange="window.dashboard.handleModalMediaUpload(this.files)">
                    </div>
                    <div id="uploadPreview" style="margin-top: 20px;"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="window.dashboard.closeUploadModal()">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modalContainer').appendChild(modal);
        modal.style.display = 'flex';
        
        // Add drag and drop functionality
        this.setupDragAndDrop(modal.querySelector('.upload-area'));
    }

    setupDragAndDrop(uploadArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.style.borderColor = '#007bff';
                uploadArea.style.backgroundColor = '#f8f9ff';
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.style.borderColor = '#ddd';
                uploadArea.style.backgroundColor = '';
            });
        });
        
        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleModalMediaUpload(files);
        });
    }

    async handleModalMediaUpload(files) {
        if (!files || files.length === 0) return;
        
        const preview = document.getElementById('uploadPreview');
        if (preview) {
            preview.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div class="loading-spinner"></div>
                    <p>Uploading ${files.length} file(s)...</p>
                </div>
            `;
        }
        
        await this.handleMediaUpload(files);
        this.closeUploadModal();
    }

    closeUploadModal() {
        const modal = document.getElementById('modalContainer');
        if (modal) {
            modal.innerHTML = '';
        }
    }

    previewMedia(url, name) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>Media Preview - ${name}</h3>
                    <button class="modal-close" onclick="window.dashboard.closePreviewModal()">×</button>
                </div>
                <div class="modal-body" style="text-align: center;">
                    <img src="${url}" 
                         alt="${name}" 
                         style="max-width: 100%; max-height: 500px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
                         onerror="this.src='https://via.placeholder.com/400x300?text=Preview+Error'">
                    <div style="margin-top: 16px;">
                        <p style="font-weight: 600; margin-bottom: 8px;">${name}</p>
                        <button class="btn btn-primary" onclick="window.dashboard.copyMediaUrl('${url}')">
                            <i class="fas fa-copy"></i> Copy URL
                        </button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="window.dashboard.closePreviewModal()">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modalContainer').appendChild(modal);
        modal.style.display = 'flex';
    }

    copyMediaUrl(url) {
        navigator.clipboard.writeText(url).then(() => {
            ToastManager.show('URL copied to clipboard', 'success');
        }).catch(() => {
            ToastManager.show('Failed to copy URL', 'error');
        });
    }

    closePreviewModal() {
        const modal = document.getElementById('modalContainer');
        if (modal) {
            modal.innerHTML = '';
        }
    }

    async deleteMedia(path, name) {
        if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            console.log('🗑️ Deleting media:', path);
            
            const { ref: storageRef, deleteObject } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js");
            const mediaRef = storageRef(storage, path);
            
            await deleteObject(mediaRef);
            
            ToastManager.show(`"${name}" deleted successfully`, 'success');
            
            // Refresh the media grid
            this.renderMediaGrid();
            
        } catch (error) {
            console.error('❌ Error deleting media:', error);
            ToastManager.show('Failed to delete media file', 'error');
        }
    }

    // SETTINGS METHODS
    loadSettings() {
        console.log('⚙️ Loading settings...');
        
        let settingsSection = document.getElementById('settingsSection');
        if (settingsSection) {
            // Section exists, fill it with content
            settingsSection.innerHTML = this.createSettingsContent();
            settingsSection.style.display = 'block';
        } else {
            // Section doesn't exist, create it (fallback)
            settingsSection = this.createSettingsSection();
            document.querySelector('.main-content').appendChild(settingsSection);
        }
        
        // Load actual settings data
        this.loadSettingsData();
        
        // Bind events after content is rendered
        this.bindSettingsEvents();
    }

    async loadSettingsData() {
        try {
            console.log('🔍 Loading settings from Firebase...');
            
            // Load settings from Firebase
            if (window.firebaseDB) {
                const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                const settingsRef = ref(window.firebaseDB, 'settings');
                
                try {
                    const snapshot = await get(settingsRef);
                    
                    if (snapshot.exists()) {
                        this.settings = snapshot.val();
                        console.log('✅ Settings loaded from Firebase:', this.settings);
                    } else {
                        console.log('⚠️ No settings found in Firebase, using defaults');
                        this.settings = this.getDefaultSettings();
                        // Save defaults to Firebase
                        await this.saveSettingsToFirebase(this.settings);
                    }
                } catch (error) {
                    console.warn('❌ Error loading settings from Firebase:', error);
                    this.settings = this.getDefaultSettings();
                }
            } else {
                console.log('⚠️ Firebase not available, using default settings');
                this.settings = this.getDefaultSettings();
            }
            
            // Populate form fields
            this.populateSettingsFields();
            
        } catch (error) {
            console.error('❌ Error loading settings:', error);
            this.settings = this.getDefaultSettings();
            this.populateSettingsFields();
        }
    }

    getDefaultSettings() {
        return {
            store: {
                name: 'FashionForAll',
                email: 'store@example.com',
                phone: '+1234567890',
                address: '123 Fashion Street, Dhaka, Bangladesh',
                description: 'Your favorite fashion destination'
            },
            notifications: {
                emailNotifications: true,
                lowStockAlerts: true,
                newOrderAlerts: true,
                customerInquiries: false
            },
            operations: {
                autoConfirmOrders: false,
                enableGuestCheckout: true,
                requireEmailVerification: false,
                allowCashOnDelivery: true
            },
            admin: {
                itemsPerPage: 12,
                enableDebugMode: false,
                autoSaveDrafts: true
            }
        };
    }

    populateSettingsFields() {
        if (!this.settings) return;
        
        // Store Information
        this.setFieldValue('storeName', this.settings.store?.name || '');
        this.setFieldValue('storeEmail', this.settings.store?.email || '');
        this.setFieldValue('storePhone', this.settings.store?.phone || '');
        this.setFieldValue('storeAddress', this.settings.store?.address || '');
        this.setFieldValue('storeDescription', this.settings.store?.description || '');
        
        // Notification Settings
        this.setCheckboxValue('emailNotifications', this.settings.notifications?.emailNotifications || false);
        this.setCheckboxValue('lowStockAlerts', this.settings.notifications?.lowStockAlerts || false);
        this.setCheckboxValue('newOrderAlerts', this.settings.notifications?.newOrderAlerts || false);
        this.setCheckboxValue('customerInquiries', this.settings.notifications?.customerInquiries || false);
        
        // Operational Settings
        this.setCheckboxValue('autoConfirmOrders', this.settings.operations?.autoConfirmOrders || false);
        this.setCheckboxValue('enableGuestCheckout', this.settings.operations?.enableGuestCheckout || false);
        this.setCheckboxValue('requireEmailVerification', this.settings.operations?.requireEmailVerification || false);
        this.setCheckboxValue('allowCashOnDelivery', this.settings.operations?.allowCashOnDelivery || false);
        
        // Admin Preferences
        this.setFieldValue('itemsPerPage', this.settings.admin?.itemsPerPage || 12);
        this.setCheckboxValue('enableDebugMode', this.settings.admin?.enableDebugMode || false);
        this.setCheckboxValue('autoSaveDrafts', this.settings.admin?.autoSaveDrafts || false);
    }

    setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value;
        }
    }

    setCheckboxValue(fieldId, checked) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.checked = checked;
        }
    }

    createSettingsContent() {
        return `
            <div class="section-header">
                <h1>Settings</h1>
                <button class="btn btn-primary" onclick="window.dashboard.saveSettings()">
                    <i class="icon">💾</i> Save Settings
                </button>
            </div>
            
            <div class="settings-container">
                <div class="settings-section">
                    <h2>🏪 Store Information</h2>
                    <div class="form-group">
                        <label for="storeName">Store Name</label>
                        <input type="text" id="storeName" class="form-control" placeholder="Enter store name">
                    </div>
                    <div class="form-group">
                        <label for="storeEmail">Store Email</label>
                        <input type="email" id="storeEmail" class="form-control" placeholder="store@example.com">
                    </div>
                    <div class="form-group">
                        <label for="storePhone">Store Phone</label>
                        <input type="tel" id="storePhone" class="form-control" placeholder="+1234567890">
                    </div>
                    <div class="form-group">
                        <label for="storeAddress">Store Address</label>
                        <textarea id="storeAddress" class="form-control" rows="2" placeholder="Enter store address"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="storeDescription">Store Description</label>
                        <textarea id="storeDescription" class="form-control" rows="3" placeholder="Brief description of your store"></textarea>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h2>🔔 Notification Settings</h2>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="emailNotifications">
                            Email Notifications for New Orders
                        </label>
                        <small style="color: #666; margin-left: 24px;">Receive email alerts when customers place orders</small>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="lowStockAlerts">
                            Low Stock Alerts
                        </label>
                        <small style="color: #666; margin-left: 24px;">Get notified when products run low on stock</small>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="newOrderAlerts">
                            New Order Alerts
                        </label>
                        <small style="color: #666; margin-left: 24px;">Alert for new order placements</small>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="customerInquiries">
                            Customer Inquiry Notifications
                        </label>
                        <small style="color: #666; margin-left: 24px;">Notify when customers send messages</small>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h2>⚙️ Operational Settings</h2>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="autoConfirmOrders">
                            Auto-Confirm Orders
                        </label>
                        <small style="color: #666; margin-left: 24px;">Automatically confirm new orders</small>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="enableGuestCheckout">
                            Enable Guest Checkout
                        </label>
                        <small style="color: #666; margin-left: 24px;">Allow customers to checkout without account</small>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="requireEmailVerification">
                            Require Email Verification
                        </label>
                        <small style="color: #666; margin-left: 24px;">Require email verification for new accounts</small>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="allowCashOnDelivery">
                            Allow Cash on Delivery
                        </label>
                        <small style="color: #666; margin-left: 24px;">Enable COD payment option</small>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h2>👤 Admin Preferences</h2>
                    <div class="form-group">
                        <label for="itemsPerPage">Items Per Page</label>
                        <select id="itemsPerPage" class="form-control">
                            <option value="6">6 items</option>
                            <option value="12">12 items</option>
                            <option value="24">24 items</option>
                            <option value="48">48 items</option>
                        </select>
                        <small style="color: #666;">Number of items to display per page in admin</small>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="enableDebugMode">
                            Enable Debug Mode
                        </label>
                        <small style="color: #666; margin-left: 24px;">Show detailed error messages and logs</small>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="autoSaveDrafts">
                            Auto-save Drafts
                        </label>
                        <small style="color: #666; margin-left: 24px;">Automatically save form drafts</small>
                    </div>
                </div>
            </div>
        `;
    }

    bindSettingsEvents() {
        // Add input change listeners for auto-save if enabled
        const autoSaveCheckbox = document.getElementById('autoSaveDrafts');
        if (autoSaveCheckbox) {
            autoSaveCheckbox.addEventListener('change', () => {
                if (autoSaveCheckbox.checked) {
                    this.setupAutoSave();
                }
            });
        }
        
        // Add validation listeners
        const emailField = document.getElementById('storeEmail');
        if (emailField) {
            emailField.addEventListener('blur', () => {
                this.validateEmail(emailField);
            });
        }
        
        console.log('✅ Settings events bound');
    }

    setupAutoSave() {
        // Auto-save functionality could be implemented here
        console.log('🔄 Auto-save enabled');
    }

    validateEmail(emailField) {
        const email = emailField.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email && !emailRegex.test(email)) {
            emailField.style.borderColor = '#dc3545';
            ToastManager.show('Please enter a valid email address', 'error');
            return false;
        } else {
            emailField.style.borderColor = '';
            return true;
        }
    }

    async saveSettings() {
        console.log('💾 Saving settings...');
        
        try {
            // Collect form data
            const settingsData = {
                store: {
                    name: document.getElementById('storeName')?.value || '',
                    email: document.getElementById('storeEmail')?.value || '',
                    phone: document.getElementById('storePhone')?.value || '',
                    address: document.getElementById('storeAddress')?.value || '',
                    description: document.getElementById('storeDescription')?.value || ''
                },
                notifications: {
                    emailNotifications: document.getElementById('emailNotifications')?.checked || false,
                    lowStockAlerts: document.getElementById('lowStockAlerts')?.checked || false,
                    newOrderAlerts: document.getElementById('newOrderAlerts')?.checked || false,
                    customerInquiries: document.getElementById('customerInquiries')?.checked || false
                },
                operations: {
                    autoConfirmOrders: document.getElementById('autoConfirmOrders')?.checked || false,
                    enableGuestCheckout: document.getElementById('enableGuestCheckout')?.checked || false,
                    requireEmailVerification: document.getElementById('requireEmailVerification')?.checked || false,
                    allowCashOnDelivery: document.getElementById('allowCashOnDelivery')?.checked || false
                },
                admin: {
                    itemsPerPage: parseInt(document.getElementById('itemsPerPage')?.value) || 12,
                    enableDebugMode: document.getElementById('enableDebugMode')?.checked || false,
                    autoSaveDrafts: document.getElementById('autoSaveDrafts')?.checked || false
                },
                updatedAt: Date.now(),
                updatedBy: 'admin' // Could be enhanced with actual user info
            };
            
            // Validate required fields
            if (!settingsData.store.name) {
                ToastManager.show('Store name is required', 'error');
                return;
            }
            
            if (!settingsData.store.email) {
                ToastManager.show('Store email is required', 'error');
                return;
            }
            
            // Validate email format
            const emailField = document.getElementById('storeEmail');
            if (!this.validateEmail(emailField)) {
                return;
            }
            
            // Save to Firebase
            await this.saveSettingsToFirebase(settingsData);
            
            // Update local settings
            this.settings = settingsData;
            
            ToastManager.show('Settings saved successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Error saving settings:', error);
            ToastManager.show('Failed to save settings: ' + error.message, 'error');
        }
    }

    async saveSettingsToFirebase(settingsData) {
        try {
            if (window.firebaseDB) {
                // Use website Firebase connection
                const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                const settingsRef = ref(window.firebaseDB, 'settings');
                await set(settingsRef, settingsData);
                console.log('✅ Settings saved via website Firebase connection');
            } else {
                // Fallback to admin Firebase connection
                const settingsRef = dbRef(db, 'settings');
                await set(settingsRef, settingsData);
                console.log('✅ Settings saved via admin Firebase connection');
            }
        } catch (error) {
            console.error('❌ Error saving settings to Firebase:', error);
            throw error;
        }
    }

    // AUTHENTICATION METHOD
    async logout() {
        try {
            await signOut(auth);
            ToastManager.show('Logged out successfully', 'success');
            window.location.href = "index.html";
        } catch (error) {
            console.error('Logout error:', error);
            ToastManager.show('Logout failed', 'error');
        }
    }

    // MESSAGES SECTION - SAFE IMPLEMENTATION
    loadMessages() {
        console.log('💬 Loading messages section...');
        
        let messagesSection = document.getElementById('messagesSection');
        if (messagesSection) {
            // Section exists, fill it with content
            messagesSection.innerHTML = this.createMessagesContent();
            messagesSection.style.display = 'block';
        } else {
            // Section doesn't exist, create it (fallback)
            messagesSection = this.createMessagesSection();
            document.querySelector('.main-content').appendChild(messagesSection);
        }
        
        // Check for real messages data source
        this.checkMessagesDataSource();
    }

    createMessagesContent() {
        return `
            <div class="section-header">
                <h1>Messages</h1>
                <div class="messages-controls">
                    <button class="btn btn-secondary" onclick="window.dashboard.refreshMessages()">
                        <i class="fas fa-sync"></i> Refresh
                    </button>
                </div>
            </div>
            
            <div class="messages-container" id="messagesContainer">
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Checking for messages...</p>
                </div>
            </div>
        `;
    }

    async checkMessagesDataSource() {
        try {
            console.log('🔍 Checking for messages data source...');
            
            // Check if there's a messages/contacts/inquiries node in Firebase
            let hasMessagesData = false;
            
            if (window.firebaseDB) {
                const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                
                // Check for common message data nodes
                const possiblePaths = ['messages', 'contacts', 'inquiries', 'customerMessages'];
                
                for (const path of possiblePaths) {
                    try {
                        const nodeRef = ref(window.firebaseDB, path);
                        const snapshot = await get(nodeRef);
                        
                        if (snapshot.exists() && snapshot.val()) {
                            const data = snapshot.val();
                            const messageCount = typeof data === 'object' ? Object.keys(data).length : 1;
                            
                            if (messageCount > 0) {
                                console.log(`✅ Found ${messageCount} messages in /${path}`);
                                hasMessagesData = true;
                                this.messagesPath = path;
                                this.loadRealMessages(path, data);
                                return;
                            }
                        }
                    } catch (error) {
                        console.log(`No messages found in /${path}`);
                    }
                }
            }
            
            // No messages data found - show placeholder state
            if (!hasMessagesData) {
                console.log('⚠️ No messages data source found');
                this.showMessagesPlaceholderState();
            }
            
        } catch (error) {
            console.error('❌ Error checking messages data source:', error);
            this.showMessagesPlaceholderState();
        }
    }

    async loadRealMessages(path, data) {
        const container = document.getElementById('messagesContainer');
        if (!container) return;
        
        try {
            // Convert messages data to array
            const messages = typeof data === 'object' 
                ? Object.keys(data).map(key => ({ id: key, ...data[key] }))
                : [{ id: '1', ...data }];
            
            // Sort by date (newest first) if timestamp available
            const sortedMessages = messages.sort((a, b) => {
                const aTime = a.createdAt || a.timestamp || 0;
                const bTime = b.createdAt || b.timestamp || 0;
                return bTime - aTime;
            });
            
            container.innerHTML = `
                <div class="messages-header">
                    <h3>Customer Messages (${sortedMessages.length})</h3>
                    <p style="color: #666; margin: 0;">Messages from /${path}</p>
                </div>
                <div class="messages-list">
                    ${sortedMessages.map(message => this.renderMessageItem(message)).join('')}
                </div>
            `;
            
            ToastManager.show(`Loaded ${sortedMessages.length} messages`, 'success');
            
        } catch (error) {
            console.error('❌ Error loading messages:', error);
            this.showMessagesPlaceholderState();
        }
    }

    renderMessageItem(message) {
        const name = message.name || message.customerName || 'Unknown Customer';
        const email = message.email || message.customerEmail || 'No email';
        const subject = message.subject || message.title || 'No subject';
        const content = message.message || message.content || message.text || 'No message content';
        const date = message.createdAt || message.timestamp || message.date;
        const formattedDate = date ? new Date(date).toLocaleDateString() : 'Unknown date';
        
        return `
            <div class="message-item" style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <div class="message-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <h4 style="margin: 0 0 4px 0; color: #333;">${name}</h4>
                        <p style="margin: 0; color: #666; font-size: 14px;">${email}</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 12px; color: #666;">${formattedDate}</div>
                        <span class="status-badge" style="background: #28a745; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                            New
                        </span>
                    </div>
                </div>
                <div class="message-subject" style="margin-bottom: 8px;">
                    <strong style="color: #333;">${subject}</strong>
                </div>
                <div class="message-content" style="color: #666; line-height: 1.5;">
                    ${content.length > 200 ? content.substring(0, 200) + '...' : content}
                </div>
                <div class="message-actions" style="margin-top: 12px;">
                    <button class="btn btn-sm btn-primary" onclick="window.dashboard.viewMessageDetails('${message.id}')">
                        View Details
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="window.dashboard.markMessageAsRead('${message.id}')">
                        Mark as Read
                    </button>
                </div>
            </div>
        `;
    }

    showMessagesPlaceholderState() {
        const container = document.getElementById('messagesContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="messages-placeholder" style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">💬</div>
                    <h3 style="margin-bottom: 8px;">Messages System Not Connected Yet</h3>
                    <p style="margin-bottom: 16px; max-width: 400px; margin-left: auto; margin-right: auto;">
                        The messaging system is not yet connected to a data source. 
                        This section will display customer messages, inquiries, and contact form submissions 
                        when a messages database is configured.
                    </p>
                </div>
                
                <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px auto; max-width: 500px; text-align: left;">
                    <h4 style="margin-bottom: 12px; color: #333;">📋 Expected Features:</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #666;">
                        <li>Customer contact form messages</li>
                        <li>Product inquiry responses</li>
                        <li>Order-related communications</li>
                        <li>Customer support requests</li>
                    </ul>
                </div>
                
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 16px; margin: 20px auto; max-width: 500px;">
                    <h4 style="margin-bottom: 8px; color: #856404;">🔧 To Enable Messages:</h4>
                    <p style="margin: 0; color: #856404; font-size: 14px;">
                        Configure a Firebase database node (messages, contacts, or inquiries) 
                        and this section will automatically detect and display the data.
                    </p>
                </div>
                
                <button class="btn btn-secondary" onclick="window.dashboard.refreshMessages()">
                    <i class="fas fa-sync"></i> Check Again
                </button>
            </div>
        `;
    }

    viewMessageDetails(messageId) {
        // Placeholder for message details functionality
        ToastManager.show('Message details feature coming soon', 'info');
    }

    markMessageAsRead(messageId) {
        // Placeholder for marking messages as read
        ToastManager.show('Mark as read feature coming soon', 'info');
    }

    refreshMessages() {
        console.log('🔄 Refreshing messages...');
        const container = document.getElementById('messagesContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Checking for messages...</p>
                </div>
            `;
        }
        this.checkMessagesDataSource();
    }

    createMessagesSection() {
        const section = document.createElement('div');
        section.id = 'messagesSection';
        section.className = 'section-content';
        section.innerHTML = this.createMessagesContent();
        return section;
    }

    // Mobile Responsiveness Methods
    toggleMobileMenu() {
        this.mobileMenuOpen = !this.mobileMenuOpen;
        const sidebar = document.getElementById('sidebar');
        const overlay = document.querySelector('.mobile-menu-overlay');
        
        if (sidebar) {
            sidebar.classList.toggle('mobile-active', this.mobileMenuOpen);
        }
        
        if (overlay) {
            overlay.classList.toggle('active', this.mobileMenuOpen);
        }
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = this.mobileMenuOpen ? 'hidden' : '';
        
        console.log('📱 Mobile menu toggled:', this.mobileMenuOpen);
    }

    closeMobileMenu() {
        if (this.mobileMenuOpen) {
            this.mobileMenuOpen = false;
            const sidebar = document.getElementById('sidebar');
            const overlay = document.querySelector('.mobile-menu-overlay');
            
            if (sidebar) {
                sidebar.classList.remove('mobile-active');
            }
            
            if (overlay) {
                overlay.classList.remove('active');
            }
            
            document.body.style.overflow = '';
        }
    }

    setupMobileMenuHandlers() {
        // Add mobile menu toggle handler
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMobileMenu();
            });
        }

        // Add mobile menu overlay handler
        const overlay = document.querySelector('.mobile-menu-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        }

        // Close mobile menu when navigating to a section
        const navItems = document.querySelectorAll('.nav-item a');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.mobileMenuOpen) {
                this.closeMobileMenu();
            }
        });
    }

    // Enhanced Loading States
    showLoadingState(containerId, message = 'Loading...') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading-state" style="text-align: center; padding: 40px;">
                    <div class="loading-spinner" style="
                        width: 40px;
                        height: 40px;
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid var(--primary, #007bff);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 16px;
                    "></div>
                    <p style="color: var(--text-muted, #666); margin: 0;">${message}</p>
                </div>
            `;
        }
    }

    // Enhanced Empty States
    showEmptyState(containerId, icon, title, description, actionText = null, actionCallback = null) {
        const container = document.getElementById(containerId);
        if (container) {
            const actionButton = actionText ? `
                <button class="btn btn-primary" onclick="${actionCallback}">
                    ${actionText}
                </button>
            ` : '';
            
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--text-muted, #666);">
                    <div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>
                    <h3 style="margin-bottom: 8px; color: var(--text-primary, #333);">${title}</h3>
                    <p style="margin-bottom: 20px; max-width: 400px; margin-left: auto; margin-right: auto;">
                        ${description}
                    </p>
                    ${actionButton}
                </div>
            `;
        }
    }

    // Enhanced Toast Notifications
    showToast(message, type = 'info', duration = 3000) {
        // Remove existing toast if present
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <div class="toast-content" style="
                display: flex;
                align-items: center;
                padding: 12px 16px;
                background: ${this.getToastColor(type)};
                color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                margin: 16px;
                z-index: 10000;
                animation: slideIn 0.3s ease;
            ">
                <span style="margin-right: 8px; font-size: 16px;">${icons[type]}</span>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }

    getToastColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        return colors[type] || colors.info;
    }

    // Enhanced Button Interactions
    setupButtonInteractions() {
        // Add ripple effect to buttons
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}px;
                    top: ${y}px;
                    background: rgba(255, 255, 255, 0.5);
                    border-radius: 50%;
                    transform: scale(0);
                    animation: ripple 0.6s ease-out;
                    pointer-events: none;
                `;
                
                this.style.position = 'relative';
                this.style.overflow = 'hidden';
                this.appendChild(ripple);
                
                setTimeout(() => ripple.remove(), 600);
            });
        });
    }

    // Enhanced Form Interactions
    setupFormInteractions() {
        // Add floating labels
        const formGroups = document.querySelectorAll('.form-group');
        formGroups.forEach(group => {
            const input = group.querySelector('input, textarea, select');
            const label = group.querySelector('label');
            
            if (input && label) {
                input.addEventListener('focus', () => {
                    label.classList.add('focused');
                });
                
                input.addEventListener('blur', () => {
                    if (!input.value) {
                        label.classList.remove('focused');
                    }
                });
                
                // Check initial state
                if (input.value) {
                    label.classList.add('focused');
                }
            }
        });
    }

    // Enhanced Table Responsiveness
    setupTableResponsiveness() {
        const tables = document.querySelectorAll('.data-table');
        tables.forEach(table => {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-wrapper';
            wrapper.style.cssText = `
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                margin: 16px 0;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            `;
            
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });
    }

    // Initialize all mobile and UX improvements
    initializeUXImprovements() {
        this.setupMobileMenuHandlers();
        this.setupButtonInteractions();
        this.setupFormInteractions();
        this.setupTableResponsiveness();
        
        // Add CSS animations if not already present
        this.addUXAnimations();
    }

    addUXAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            .focused {
                color: var(--primary, #007bff) !important;
                transform: translateY(-2px);
                transition: all 0.3s ease;
            }
            
            .btn {
                min-height: 44px;
                min-width: 44px;
                padding: 8px 16px;
                transition: all 0.2s ease;
            }
            
            .btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }
            
            .btn:focus {
                outline: 2px solid var(--primary, #007bff);
                outline-offset: 2px;
            }
            
            .form-control {
                min-height: 44px;
                padding: 8px 12px;
                border-radius: 6px;
                transition: all 0.2s ease;
            }
            
            .form-control:focus {
                border-color: var(--primary, #007bff);
                box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
                outline: none;
            }
            
            .table-wrapper {
                border: 1px solid var(--border-light, #dee2e6);
            }
            
            @media (max-width: 768px) {
                .table-wrapper {
                    margin: 8px -16px;
                    border-radius: 0;
                    border-left: none;
                    border-right: none;
                }
                
                .data-table {
                    font-size: 14px;
                }
                
                .data-table th,
                .data-table td {
                    padding: 8px;
                    white-space: nowrap;
                }
            }
        `;
        
        if (!document.querySelector('style[data-ux-animations]')) {
            style.setAttribute('data-ux-animations', 'true');
            document.head.appendChild(style);
        }
    }
}

// Initialize dashboard
const dashboard = new AdminDashboard();
window.dashboard = dashboard;

// Make functions globally available for onclick handlers
window.closePendingOrdersPanel = function() {
    const overlay = document.getElementById('pendingOrdersOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
};

// Global mobile menu toggle function for HTML onclick handlers
window.toggleMobileMenu = function() {
    if (window.dashboard) {
        window.dashboard.toggleMobileMenu();
    }
};
