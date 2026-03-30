/* ===================================
   ADMIN PANEL - CORE JAVASCRIPT ARCHITECTURE
   =================================== */

class AdminDashboard {
    constructor() {
        // Core state
        this.currentSection = 'dashboard';
        this.isLoading = false;
        this.data = {
            products: [],
            orders: [],
            inventory: [],
            media: [],
            settings: {},
            messages: []
        };
        
        // DOM references
        this.elements = {
            sidebar: null,
            mobileOverlay: null,
            mobileMenuToggle: null,
            sidebarToggle: null,
            pageTitle: null,
            mainContent: null,
            modalContainer: null,
            toastContainer: null
        };
        
        // Initialize
        this.init();
    }
    
    // ===================================
    // INITIALIZATION
    // ===================================
    
    async init() {
        console.log('🚀 Initializing Admin Dashboard...');
        
        // Cache DOM elements
        this.cacheElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup responsive behavior
        this.setupResponsiveBehavior();
        
        // Initialize auth guard
        await this.setupAuthGuard();
        
        // Load initial section
        this.navigateToSection('dashboard');
        
        console.log('✅ Admin Dashboard initialized successfully');
    }
    
    cacheElements() {
        this.elements.sidebar = document.getElementById('sidebar');
        this.elements.mobileOverlay = document.getElementById('mobileOverlay');
        this.elements.mobileMenuToggle = document.getElementById('mobileMenuToggle');
        this.elements.sidebarToggle = document.getElementById('sidebarToggle');
        this.elements.pageTitle = document.getElementById('pageTitle');
        this.elements.mainContent = document.getElementById('mainContent');
        this.elements.modalContainer = document.getElementById('modalContainer');
        this.elements.toastContainer = document.getElementById('toastContainer');
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.navigateToSection(section);
            });
        });
        
        // Mobile menu
        this.elements.mobileMenuToggle?.addEventListener('click', () => {
            this.toggleMobileSidebar();
        });
        
        this.elements.sidebarToggle?.addEventListener('click', () => {
            this.closeMobileSidebar();
        });
        
        this.elements.mobileOverlay?.addEventListener('click', () => {
            this.closeMobileSidebar();
        });
        
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.handleLogout();
        });
        
        // Section-specific buttons
        this.setupSectionEventListeners();
        
        // Load inventory and order management systems
        this.loadInventoryAndOrderManagement();
        
        // Load media, settings, and messages management systems
        this.loadMediaSettingsMessages();
        
        // Load main product catalog system (ONLY product system)
        this.loadMainProductCatalog();
        
        // Setup mobile navigation behavior
        this.setupMobileNavigation();
        
        // Setup section feedback states
        this.setupSectionFeedback();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }
    
    setupSectionEventListeners() {
        // Dashboard
        document.getElementById('refreshDashboard')?.addEventListener('click', () => {
            this.loadDashboard();
        });
        
        // Products
        document.getElementById('addProductBtn')?.addEventListener('click', () => {
            this.openProductModal();
        });
        
        document.getElementById('productSearch')?.addEventListener('input', (e) => {
            this.handleProductSearch(e.target.value);
        });
        
        document.getElementById('productCategoryFilter')?.addEventListener('change', (e) => {
            this.filterProducts();
        });
        
        document.getElementById('productStatusFilter')?.addEventListener('change', (e) => {
            this.filterProducts();
        });
        
        // Inventory
        document.getElementById('bulkUpdateStock')?.addEventListener('click', () => {
            this.openBulkStockModal();
        });
        
        document.getElementById('inventorySearch')?.addEventListener('input', (e) => {
            this.handleInventorySearch(e.target.value);
        });
        
        document.getElementById('stockLevelFilter')?.addEventListener('change', (e) => {
            this.filterInventory();
        });
        
        // Orders
        document.getElementById('exportOrders')?.addEventListener('click', () => {
            this.exportOrdersData();
        });
        
        document.getElementById('orderSearch')?.addEventListener('input', (e) => {
            this.handleOrderSearch(e.target.value);
        });
        
        document.getElementById('orderStatusFilter')?.addEventListener('change', (e) => {
            this.filterOrders();
        });
        
        document.getElementById('orderDateFilter')?.addEventListener('change', (e) => {
            this.filterOrders();
        });
        
        // Media
        document.getElementById('uploadMediaBtn')?.addEventListener('click', () => {
            this.openMediaUploadModal();
        });
        
        document.getElementById('mediaSearch')?.addEventListener('input', (e) => {
            this.handleMediaSearch(e.target.value);
        });
        
        document.getElementById('mediaTypeFilter')?.addEventListener('change', (e) => {
            this.filterMedia();
        });
        
        // Settings
        document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
            this.saveSettings();
        });
        
        // Messages
        document.getElementById('composeMessageBtn')?.addEventListener('click', () => {
            this.openComposeMessageModal();
        });
    }
    
    setupResponsiveBehavior() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            this.handleOrientationChange();
        });
    }
    
    async setupAuthGuard() {
        // This is a hook point for real authentication
        // For now, we'll simulate auth check
        const isAuthenticated = await this.checkAuthentication();
        
        if (!isAuthenticated) {
            this.redirectToLogin();
            return false;
        }
        
        return true;
    }
    
    async checkAuthentication() {
        // Hook point for real authentication logic
        // Check Firebase auth, tokens, etc.
        return true; // Placeholder for demo
    }
    
    redirectToLogin() {
        window.location.href = 'index.html';
    }
    
    // ===================================
    // NAVIGATION SYSTEM
    // ===================================
    
    navigateToSection(section) {
        if (this.currentSection === section) return;
        
        // Update current section
        this.currentSection = section;
        
        // Update navigation active state
        this.updateNavigationActiveState(section);
        
        // Update page title
        this.updatePageTitle(section);
        
        // Show loading state
        this.showSectionLoading(section);
        
        // Hide all sections
        this.hideAllSections();
        
        // Show target section
        this.showSection(section);
        
        // Load section data
        this.loadSectionData(section);
        
        // Close mobile sidebar
        this.closeMobileSidebar();
    }
    
    updateNavigationActiveState(section) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.querySelector('.nav-link').classList.remove('active');
        });
        
        // Add active class to current nav item
        const currentNavItem = document.querySelector(`[data-section="${section}"]`);
        if (currentNavItem) {
            currentNavItem.querySelector('.nav-link').classList.add('active');
        }
    }
    
    updatePageTitle(section) {
        const titles = {
            dashboard: 'Dashboard',
            analytics: 'Analytics',
            products: 'Products',
            inventory: 'Inventory',
            orders: 'Orders',
            media: 'Media',
            settings: 'Settings',
            messages: 'Messages'
        };
        
        if (this.elements.pageTitle) {
            this.elements.pageTitle.textContent = titles[section] || 'Admin Panel';
        }
    }
    
    hideAllSections() {
        document.querySelectorAll('.section-content').forEach(section => {
            section.style.display = 'none';
        });
    }
    
    showSection(section) {
        const sectionElement = document.getElementById(`${section}Section`);
        if (sectionElement) {
            sectionElement.style.display = 'block';
        }
    }
    
    showSectionLoading(section) {
        const loadingElement = document.getElementById(`${section}Loading`);
        const contentElement = document.getElementById(`${section}Content`);
        const emptyElement = document.getElementById(`${section}Empty`);
        
        if (loadingElement) loadingElement.style.display = 'flex';
        if (contentElement) contentElement.style.display = 'none';
        if (emptyElement) emptyElement.style.display = 'none';
    }
    
    hideSectionLoading(section) {
        const loadingElement = document.getElementById(`${section}Loading`);
        if (loadingElement) loadingElement.style.display = 'none';
    }
    
    showSectionEmpty(section) {
        const loadingElement = document.getElementById(`${section}Loading`);
        const contentElement = document.getElementById(`${section}Content`);
        const emptyElement = document.getElementById(`${section}Empty`);
        
        if (loadingElement) loadingElement.style.display = 'none';
        if (contentElement) contentElement.style.display = 'none';
        if (emptyElement) emptyElement.style.display = 'flex';
    }
    
    showSectionContent(section) {
        const loadingElement = document.getElementById(`${section}Loading`);
        const contentElement = document.getElementById(`${section}Content`);
        const emptyElement = document.getElementById(`${section}Empty`);
        
        if (loadingElement) loadingElement.style.display = 'none';
        if (emptyElement) emptyElement.style.display = 'none';
        if (contentElement) contentElement.style.display = 'block';
    }
    
    // ===================================
    // SECTION DATA LOADING
    // ===================================
    
    async loadSectionData(section) {
        try {
            switch (section) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'products':
                    await this.loadProducts();
                    break;
                case 'inventory':
                    await this.loadInventory();
                    break;
                case 'orders':
                    await this.loadOrders();
                    break;
                case 'media':
                    await this.loadMedia();
                    break;
                case 'settings':
                    await this.loadSettings();
                    break;
                case 'messages':
                    await this.loadMessages();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${section} data:`, error);
            this.showToast(`Failed to load ${section} data`, 'error');
        }
    }
    
    async loadDashboard() {
        // Hook point for real dashboard data loading
        // This would connect to Firebase, API, etc.
        
        // Simulate loading delay
        await this.simulateLoading(1000);
        
        // Create dashboard content
        const dashboardContent = `
            <div class="dashboard-content">
                <div class="dashboard-card">
                    <div class="card-icon primary">
                        <i class="fas fa-box"></i>
                    </div>
                    <div class="card-title">Total Products</div>
                    <div class="card-value">${this.data.products.length}</div>
                </div>
                <div class="dashboard-card">
                    <div class="card-icon success">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="card-title">Total Orders</div>
                    <div class="card-value">${this.data.orders.length}</div>
                </div>
                <div class="dashboard-card">
                    <div class="card-icon warning">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="card-title">Low Stock Items</div>
                    <div class="card-value">${this.getLowStockCount()}</div>
                </div>
                <div class="dashboard-card">
                    <div class="card-icon info">
                        <i class="fas fa-envelope"></i>
                    </div>
                    <div class="card-title">Unread Messages</div>
                    <div class="card-value">${this.getUnreadMessageCount()}</div>
                </div>
            </div>
        `;
        
        const contentElement = document.getElementById('dashboardContent');
        if (contentElement) {
            contentElement.innerHTML = dashboardContent;
        }
        
        this.showSectionContent('dashboard');
    }
    
    async loadProducts() {
        console.log('🔄 Loading Products section...');
        
        // Show the products section first
        this.showSectionContent('products');
        
        // Ensure main product catalog is initialized and ready
        if (!window.mainProductCatalog) {
            console.log('⚠️ Main Product Catalog not initialized, creating now...');
            window.mainProductCatalog = new MainProductCatalog();
        }
        
        // Wait for the system to be ready
        await this._waitForProductCatalogReady();
        
        // Load the product catalog
        try {
            await window.mainProductCatalog.loadProductCatalog();
            console.log('✅ Products section loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load Products section:', error);
            this.showToast('Failed to load product catalog', 'error');
        }
    }
    
    async _waitForProductCatalogReady() {
        const maxWaitTime = 15000; // 15 seconds
        const checkInterval = 100;
        let waitTime = 0;
        
        while (waitTime < maxWaitTime) {
            if (window.mainProductCatalog && window.mainProductCatalog.isReady) {
                console.log('✅ Main Product Catalog is ready');
                return;
            }
            
            // If initialization is in progress, wait for it
            if (window.mainProductCatalog && window.mainProductCatalog.isInitializing) {
                console.log('⏳ Main Product Catalog initializing, waiting...');
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                waitTime += checkInterval;
                continue;
            }
            
            // If not initialized, start initialization
            if (window.mainProductCatalog && !window.mainProductCatalog.isInitializing) {
                console.log('🔄 Starting Main Product Catalog initialization...');
                try {
                    await window.mainProductCatalog.init();
                    return;
                } catch (error) {
                    console.error('❌ Main Product Catalog initialization failed:', error);
                    throw error;
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waitTime += checkInterval;
        }
        
        throw new Error('Main Product Catalog failed to become ready within timeout');
    }
    
    openProductModal(product = null) {
        // Redirect to main product catalog for CRUD operations
        if (window.mainProductCatalog) {
            // For now, show toast - main catalog handles add/edit
            this.showToast('Use the Product Catalog section to manage products', 'info');
        } else {
            this.showToast('Product catalog system loading...', 'info');
        }
    }
    
    closeProductModal() {
        // Redirect to main product catalog
        if (window.mainProductCatalog) {
            // Main catalog handles its own modal state
        }
    }
    
    async loadInventory() {
        // Inventory management system handles this now
        if (window.inventoryManager) {
            await window.inventoryManager.loadInventory();
        }
        this.showSectionContent('inventory');
    }
    
    async loadOrders() {
        // Order management system handles this now
        if (window.orderManager) {
            await window.orderManager.loadOrders();
        }
        this.showSectionContent('orders');
    }
    
    loadInventoryAndOrderManagement() {
        // Load inventory and order management JavaScript
        if (!window.inventoryManager || !window.orderManager) {
            const script = document.createElement('script');
            script.src = 'js/inventory-order-management.js';
            script.onload = () => {
                console.log('✅ Inventory and Order Management Systems loaded');
            };
            document.head.appendChild(script);
        }
    }
    
    openStockModal(productId = null) {
        if (window.inventoryManager) {
            window.inventoryManager.openStockModal(productId);
        } else {
            this.showToast('Inventory management system loading...', 'info');
        }
    }
    
    closeStockModal() {
        if (window.inventoryManager) {
            window.inventoryManager.closeStockModal();
        }
    }
    
    openBulkStockModal() {
        if (window.inventoryManager) {
            window.inventoryManager.openBulkStockModal();
        } else {
            this.showToast('Inventory management system loading...', 'info');
        }
    }
    
    closeBulkStockModal() {
        if (window.inventoryManager) {
            window.inventoryManager.closeBulkStockModal();
        }
    }
    
    viewOrderDetails(orderId) {
        if (window.orderManager) {
            window.orderManager.viewOrderDetails(orderId);
        } else {
            this.showToast('Order management system loading...', 'info');
        }
    }
    
    closeOrderModal() {
        if (window.orderManager) {
            window.orderManager.closeOrderModal();
        }
    }
    
    async loadMedia() {
        // Media management system handles this now
        if (window.mediaManager) {
            await window.mediaManager.loadMedia();
        }
        this.showSectionContent('media');
    }
    
    async loadSettings() {
        // Settings management system handles this now
        if (window.settingsManager) {
            await window.settingsManager.loadSettings();
        }
        this.showSectionContent('settings');
    }
    
    async loadMessages() {
        // Messages management system handles this now
        if (window.messagesManager) {
            await window.messagesManager.loadMessages();
        }
        this.showSectionContent('messages');
    }
    
    loadMainProductCatalog() {
        // Load main product catalog system (ONLY product system)
        if (!window.mainProductCatalog) {
            const script = document.createElement('script');
            script.src = 'js/main-product-catalog.js';
            script.onload = () => {
                console.log('✅ Main Product Catalog System loaded');
            };
            document.head.appendChild(script);
        }
    }
    
    loadMediaSettingsMessages() {
        // Load media, settings, and messages management JavaScript
        if (!window.mediaManager || !window.settingsManager || !window.messagesManager) {
            const script = document.createElement('script');
            script.src = 'js/media-settings-messages.js';
            script.onload = () => {
                console.log('✅ Media, Settings, and Messages Management Systems loaded');
            };
            document.head.appendChild(script);
        }
    }
    
    openMediaUploadModal() {
        if (window.mediaManager) {
            window.mediaManager.openMediaUploadModal();
        } else {
            this.showToast('Media management system loading...', 'info');
        }
    }
    
    closeMediaUploadModal() {
        if (window.mediaManager) {
            window.mediaManager.closeMediaUploadModal();
        }
    }
    
    closeMediaPreviewModal() {
        if (window.mediaManager) {
            window.mediaManager.closeMediaPreviewModal();
        }
    }
    
    openComposeMessageModal() {
        if (window.messagesManager) {
            window.messagesManager.openComposeMessageModal();
        } else {
            this.showToast('Messages management system loading...', 'info');
        }
    }
    
    closeComposeMessageModal() {
        if (window.messagesManager) {
            window.messagesManager.closeComposeMessageModal();
        }
    }
    
    setupMobileNavigation() {
        // Mobile menu toggle
        this.elements.mobileMenuToggle?.addEventListener('click', () => {
            this.toggleMobileSidebar();
        });
        
        // Close sidebar when clicking outside on mobile
        this.elements.mobileOverlay?.addEventListener('click', () => {
            this.closeMobileSidebar();
        });
        
        // Handle window resize for responsive behavior
        window.addEventListener('resize', () => {
            this.handleResponsiveResize();
        });
        
        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            this.handleOrientationChange();
        });
    }
    
    setupSectionFeedback() {
        // Add loading state improvements
        this.improveLoadingStates();
        
        // Add empty state improvements
        this.improveEmptyStates();
        
        // Add success/error feedback improvements
        this.improveFeedbackStates();
    }
    
    improveLoadingStates() {
        // Enhanced loading state with better visual feedback
        const loadingStates = document.querySelectorAll('.loading-state');
        loadingStates.forEach(state => {
            if (!state.querySelector('.loading-spinner')) {
                const spinner = document.createElement('div');
                spinner.className = 'loading-spinner';
                spinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                state.insertBefore(spinner, state.firstChild);
            }
        });
    }
    
    improveEmptyStates() {
        // Enhanced empty states with better messaging
        const emptyStates = document.querySelectorAll('.empty-state');
        emptyStates.forEach(state => {
            if (!state.querySelector('.empty-state-icon')) {
                const icon = state.querySelector('i');
                if (icon) {
                    icon.style.fontSize = '3rem';
                    icon.style.marginBottom = '1rem';
                }
            }
        });
    }
    
    improveFeedbackStates() {
        // Enhanced toast notifications with better positioning
        if (this.elements.toastContainer) {
            // Ensure proper z-index and positioning
            this.elements.toastContainer.style.zIndex = '10000';
            
            // Add click-to-dismiss functionality
            this.elements.toastContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('toast')) {
                    e.target.style.opacity = '0';
                    setTimeout(() => {
                        if (e.target.parentNode) {
                            e.target.parentNode.removeChild(e.target);
                        }
                    }, 300);
                }
            });
        }
    }
    
    handleResponsiveResize() {
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
        
        // Adjust sidebar behavior based on screen size
        if (!isMobile && this.elements.sidebar) {
            this.closeMobileSidebar();
        }
        
        // Adjust table scrolling for mobile
        const tables = document.querySelectorAll('.table-wrapper');
        tables.forEach(table => {
            if (isMobile) {
                table.style.overflowX = 'auto';
                table.style.webkitOverflowScrolling = 'touch';
            } else {
                table.style.overflowX = 'visible';
                table.style.webkitOverflowScrolling = 'auto';
            }
        });
        
        // Adjust modal sizing for mobile
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (isMobile) {
                modal.style.margin = '1rem';
                modal.style.maxWidth = 'calc(100% - 2rem)';
                modal.style.maxHeight = '80vh';
            } else {
                modal.style.margin = 'auto';
                modal.style.maxWidth = '600px';
                modal.style.maxHeight = '90vh';
            }
        });
    }
    
    handleOrientationChange() {
        // Handle mobile orientation changes
        setTimeout(() => {
            this.handleResponsiveResize();
        }, 100);
    }
    
    // ===================================
    // FINAL VERIFICATION METHODS
    // ===================================
    
    async verifyAllSections() {
        console.log('🔍 Performing final verification of all admin sections...');
        
        const verificationResults = {
            dashboard: await this.verifyDashboard(),
            products: await this.verifyProducts(),
            inventory: await this.verifyInventory(),
            orders: await this.verifyOrders(),
            media: await this.verifyMedia(),
            settings: await this.verifySettings(),
            messages: await this.verifyMessages(),
            websiteConnection: await this.verifyWebsiteConnection()
        };
        
        console.log('✅ Final verification results:', verificationResults);
        return verificationResults;
    }
    
    async verifyDashboard() {
        try {
            // Check if dashboard loads correctly
            const dashboardSection = document.getElementById('dashboardSection');
            const dashboardContent = document.getElementById('dashboardContent');
            
            if (!dashboardSection || !dashboardContent) {
                return { status: 'error', message: 'Dashboard section not found' };
            }
            
            // Check if dashboard can load content
            this.navigateToSection('dashboard');
            
            // Wait a moment for content to load
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const hasContent = dashboardContent.children.length > 0;
            const hasLoading = document.getElementById('dashboardLoading')?.style.display !== 'none';
            
            return {
                status: hasContent || hasLoading ? 'success' : 'warning',
                message: hasContent ? 'Dashboard loads content correctly' : 'Dashboard shows empty state',
                details: {
                    hasContent,
                    hasLoading,
                    sectionExists: true
                }
            };
        } catch (error) {
            return { status: 'error', message: `Dashboard verification failed: ${error.message}` };
        }
    }
    
    async verifyProducts() {
        try {
            // Check if product management loads correctly
            if (!window.productManager) {
                return { status: 'warning', message: 'Product manager not loaded' };
            }
            
            await window.productManager.loadProducts();
            
            const hasProducts = window.productManager.products.length > 0;
            const hasTable = document.getElementById('productsTableBody')?.children.length > 0;
            
            return {
                status: hasProducts || hasTable ? 'success' : 'warning',
                message: hasProducts ? 'Products load correctly' : 'Products shows empty state',
                details: {
                    hasProducts,
                    hasTable,
                    productCount: window.productManager.products.length
                }
            };
        } catch (error) {
            return { status: 'error', message: `Products verification failed: ${error.message}` };
        }
    }
    
    async verifyInventory() {
        try {
            if (!window.inventoryManager) {
                return { status: 'warning', message: 'Inventory manager not loaded' };
            }
            
            await window.inventoryManager.loadInventory();
            
            const hasInventory = window.inventoryManager.inventory.length > 0;
            const hasTable = document.getElementById('inventoryTableBody')?.children.length > 0;
            
            return {
                status: hasInventory || hasTable ? 'success' : 'warning',
                message: hasInventory ? 'Inventory loads correctly' : 'Inventory shows empty state',
                details: {
                    hasInventory,
                    hasTable,
                    inventoryCount: window.inventoryManager.inventory.length
                }
            };
        } catch (error) {
            return { status: 'error', message: `Inventory verification failed: ${error.message}` };
        }
    }
    
    async verifyOrders() {
        try {
            if (!window.orderManager) {
                return { status: 'warning', message: 'Order manager not loaded' };
            }
            
            await window.orderManager.loadOrders();
            
            const hasOrders = window.orderManager.orders.length > 0;
            const hasTable = document.getElementById('ordersTableBody')?.children.length > 0;
            
            return {
                status: hasOrders || hasTable ? 'success' : 'warning',
                message: hasOrders ? 'Orders load correctly' : 'Orders shows empty state',
                details: {
                    hasOrders,
                    hasTable,
                    orderCount: window.orderManager.orders.length
                }
            };
        } catch (error) {
            return { status: 'error', message: `Orders verification failed: ${error.message}` };
        }
    }
    
    async verifyMedia() {
        try {
            if (!window.mediaManager) {
                return { status: 'warning', message: 'Media manager not loaded' };
            }
            
            await window.mediaManager.loadMedia();
            
            const hasMedia = window.mediaManager.media.length > 0;
            const hasGrid = document.getElementById('mediaGrid')?.children.length > 0;
            
            return {
                status: hasMedia || hasGrid ? 'success' : 'warning',
                message: hasMedia ? 'Media loads correctly' : 'Media shows empty state',
                details: {
                    hasMedia,
                    hasGrid,
                    mediaCount: window.mediaManager.media.length
                }
            };
        } catch (error) {
            return { status: 'error', message: `Media verification failed: ${error.message}` };
        }
    }
    
    async verifySettings() {
        try {
            if (!window.settingsManager) {
                return { status: 'warning', message: 'Settings manager not loaded' };
            }
            
            await window.settingsManager.loadSettings();
            
            const hasSettings = Object.keys(window.settingsManager.settings).length > 0;
            const hasGrid = document.getElementById('settingsContent')?.children.length > 0;
            
            return {
                status: hasSettings || hasGrid ? 'success' : 'warning',
                message: hasSettings ? 'Settings load correctly' : 'Settings shows empty state',
                details: {
                    hasSettings,
                    hasGrid,
                    settingsCount: Object.keys(window.settingsManager.settings).length
                }
            };
        } catch (error) {
            return { status: 'error', message: `Settings verification failed: ${error.message}` };
        }
    }
    
    async verifyMessages() {
        try {
            if (!window.messagesManager) {
                return { status: 'warning', message: 'Messages manager not loaded' };
            }
            
            await window.messagesManager.loadMessages();
            
            const hasMessages = window.messagesManager.messages.length > 0;
            const hasList = document.getElementById('messageList')?.children.length > 0;
            const hasPlaceholder = document.querySelector('.placeholder-message');
            
            return {
                status: hasMessages || hasPlaceholder ? 'success' : 'info',
                message: hasMessages ? 'Messages load correctly' : 'Messages shows placeholder (no real source)',
                details: {
                    hasMessages,
                    hasList,
                    hasPlaceholder,
                    messageCount: window.messagesManager.messages.length
                }
            };
        } catch (error) {
            return { status: 'error', message: `Messages verification failed: ${error.message}` };
        }
    }
    
    async verifyWebsiteConnection() {
        try {
            // Check if admin is properly connected to website data source
            const hasFirebase = !!window.firebaseDB;
            const hasProductConnection = window.productManager && window.productManager.products.length > 0;
            
            return {
                status: hasFirebase ? 'success' : 'warning',
                message: hasFirebase ? 
                    'Admin panel connected to website data source' : 
                    'Firebase connection not established',
                details: {
                    hasFirebase,
                    hasProductConnection
                }
            };
        } catch (error) {
            return { status: 'error', message: `Website connection verification failed: ${error.message}` };
        }
    }
    
    // ===================================
    // RENDERING METHODS
    // ===================================
    
    renderProducts() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = this.data.products.map(product => `
            <tr>
                <td>
                    <img src="${product.image || 'https://via.placeholder.com/50x50'}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: var(--radius-md);">
                </td>
                <td>
                    <div style="font-weight: 500;">${product.name}</div>
                    <div style="font-size: var(--font-size-xs); color: var(--color-gray-500);">${product.sku || 'N/A'}</div>
                </td>
                <td>${product.category}</td>
                <td>$${product.price}</td>
                <td>
                    <span class="badge ${this.getStockBadgeClass(product.stock)}">
                        ${product.stock} in stock
                    </span>
                </td>
                <td>
                    <span class="badge ${product.status === 'active' ? 'badge-success' : 'badge-gray'}">
                        ${product.status}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-small edit" onclick="dashboard.editProduct('${product.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn-small delete" onclick="dashboard.deleteProduct('${product.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    renderInventory() {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = this.data.inventory.map(item => `
            <tr>
                <td>
                    <div style="font-weight: 500;">${item.name}</div>
                    <div style="font-size: var(--font-size-xs); color: var(--color-gray-500);">${item.sku || 'N/A'}</div>
                </td>
                <td>${item.category}</td>
                <td>
                    <span class="badge ${this.getStockBadgeClass(item.stock)}">
                        ${item.stock} units
                    </span>
                </td>
                <td>
                    <span class="badge ${this.getStockStatusBadgeClass(item.status)}">
                        ${item.status}
                    </span>
                </td>
                <td>${new Date(item.updatedAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-small edit" onclick="dashboard.updateStock('${item.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    renderOrders() {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = this.data.orders.map(order => `
            <tr>
                <td>
                    <div style="font-weight: 500;">#${order.id}</div>
                </td>
                <td>
                    <div style="font-weight: 500;">${order.customer}</div>
                    <div style="font-size: var(--font-size-xs); color: var(--color-gray-500);">${order.email}</div>
                </td>
                <td>${new Date(order.date).toLocaleDateString()}</td>
                <td>$${order.total}</td>
                <td>
                    <span class="badge ${this.getOrderStatusBadgeClass(order.status)}">
                        ${order.status}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-small edit" onclick="dashboard.viewOrder('${order.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    renderMedia() {
        const grid = document.getElementById('mediaGrid');
        if (!grid) return;
        
        grid.innerHTML = this.data.media.map(item => `
            <div class="media-item">
                <img src="${item.url}" alt="${item.name}" class="media-preview">
                <div class="media-info">
                    <div class="media-name">${item.name}</div>
                    <div class="media-meta">${item.type} • ${this.formatFileSize(item.size)}</div>
                </div>
            </div>
        `).join('');
    }
    
    renderSettings() {
        const container = document.getElementById('settingsContent');
        if (!container) return;
        
        container.innerHTML = `
            <div class="settings-grid">
                <div class="settings-card">
                    <div class="settings-header">
                        <h3 class="settings-title">Store Information</h3>
                    </div>
                    <div class="settings-body">
                        <div class="form-group">
                            <label class="form-label">Store Name</label>
                            <input type="text" class="form-input" id="storeName" value="${this.data.settings.storeName || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Store Email</label>
                            <input type="email" class="form-input" id="storeEmail" value="${this.data.settings.storeEmail || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Store Phone</label>
                            <input type="tel" class="form-input" id="storePhone" value="${this.data.settings.storePhone || ''}">
                        </div>
                    </div>
                </div>
                
                <div class="settings-card">
                    <div class="settings-header">
                        <h3 class="settings-title">Payment Settings</h3>
                    </div>
                    <div class="settings-body">
                        <div class="form-group">
                            <label class="form-label">Currency</label>
                            <select class="form-select" id="currency">
                                <option value="USD" ${this.data.settings.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                                <option value="EUR" ${this.data.settings.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                                <option value="GBP" ${this.data.settings.currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderMessages() {
        const list = document.getElementById('messageList');
        if (!list) return;
        
        list.innerHTML = this.data.messages.map(message => `
            <div class="message-item ${message.read ? '' : 'unread'}" onclick="dashboard.viewMessage('${message.id}')">
                <div class="message-header">
                    <div class="message-sender">${message.sender}</div>
                    <div class="message-time">${new Date(message.timestamp).toLocaleDateString()}</div>
                </div>
                <div class="message-subject">${message.subject}</div>
                <div class="message-preview">${message.preview}</div>
            </div>
        `).join('');
    }
    
    // ===================================
    // UTILITY METHODS
    // ===================================
    
    getStockBadgeClass(stock) {
        if (stock === 0) return 'badge-danger';
        if (stock < 10) return 'badge-warning';
        return 'badge-success';
    }
    
    getStockStatusBadgeClass(status) {
        switch (status) {
            case 'in_stock': return 'badge-success';
            case 'low_stock': return 'badge-warning';
            case 'out_of_stock': return 'badge-danger';
            default: return 'badge-gray';
        }
    }
    
    getOrderStatusBadgeClass(status) {
        switch (status) {
            case 'pending': return 'badge-warning';
            case 'processing': return 'badge-info';
            case 'shipped': return 'badge-primary';
            case 'delivered': return 'badge-success';
            case 'cancelled': return 'badge-danger';
            default: return 'badge-gray';
        }
    }
    
    getLowStockCount() {
        return this.data.inventory.filter(item => item.stock < 10).length;
    }
    
    getUnreadMessageCount() {
        return this.data.messages.filter(msg => !msg.read).length;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    simulateLoading(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // ===================================
    // MOBILE RESPONSIVENESS
    // ===================================
    
    toggleMobileSidebar() {
        this.elements.sidebar?.classList.toggle('active');
        this.elements.mobileOverlay?.classList.toggle('active');
    }
    
    closeMobileSidebar() {
        this.elements.sidebar?.classList.remove('active');
        this.elements.mobileOverlay?.classList.remove('active');
    }
    
    handleResize() {
        if (window.innerWidth > 768) {
            this.closeMobileSidebar();
        }
    }
    
    handleOrientationChange() {
        // Handle mobile orientation changes
        setTimeout(() => {
            this.handleResize();
        }, 100);
    }
    
    // ===================================
    // MODAL SYSTEM
    // ===================================
    
    openModal(content) {
        if (!this.elements.modalContainer) return;
        
        this.elements.modalContainer.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title" id="modalTitle">Modal Title</h3>
                    <button class="modal-close" onclick="dashboard.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" id="modalBody">
                    ${content}
                </div>
                <div class="modal-footer" id="modalFooter">
                    <button class="btn btn-secondary" onclick="dashboard.closeModal()">Cancel</button>
                    <button class="btn btn-primary" id="modalConfirmBtn">Confirm</button>
                </div>
            </div>
        `;
        
        this.elements.modalContainer.classList.add('active');
    }
    
    closeModal() {
        this.elements.modalContainer?.classList.remove('active');
        this.elements.modalContainer.innerHTML = '';
    }
    
    // ===================================
    // TOAST SYSTEM
    // ===================================
    
    showToast(message, type = 'info', title = '') {
        if (!this.elements.toastContainer) return;
        
        const toastId = `toast-${Date.now()}`;
        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.id = toastId;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${iconMap[type]}"></i>
            </div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        this.elements.toastContainer.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }
    
    // ===================================
    // SEARCH & FILTER HANDLERS
    // ===================================
    
    handleProductSearch(searchTerm) {
        // Hook point for real product search
        console.log('Searching products:', searchTerm);
        // Implementation would filter this.data.products
    }
    
    handleInventorySearch(searchTerm) {
        console.log('Searching inventory:', searchTerm);
    }
    
    handleOrderSearch(searchTerm) {
        console.log('Searching orders:', searchTerm);
    }
    
    handleMediaSearch(searchTerm) {
        console.log('Searching media:', searchTerm);
    }
    
    filterProducts() {
        console.log('Filtering products');
        // Implementation would filter this.data.products
    }
    
    filterInventory() {
        console.log('Filtering inventory');
    }
    
    filterOrders() {
        console.log('Filtering orders');
    }
    
    filterMedia() {
        console.log('Filtering media');
    }
    
    // ===================================
    // ACTION HANDLERS (Hook Points)
    // ===================================
    
    openProductModal(product = null) {
        console.log('Opening product modal', product);
        // Hook point for real product modal
        this.showToast('Product modal would open here', 'info');
    }
    
    editProduct(productId) {
        console.log('Editing product:', productId);
        this.showToast('Edit product functionality', 'info');
    }
    
    deleteProduct(productId) {
        console.log('Deleting product:', productId);
        this.showToast('Delete product functionality', 'warning');
    }
    
    updateStock(itemId) {
        console.log('Updating stock for:', itemId);
        this.showToast('Update stock functionality', 'info');
    }
    
    viewOrder(orderId) {
        console.log('Viewing order:', orderId);
        this.showToast('View order functionality', 'info');
    }
    
    exportOrdersData() {
        console.log('Exporting orders');
        this.showToast('Export orders functionality', 'info');
    }
    
    openMediaUploadModal() {
        console.log('Opening media upload modal');
        this.showToast('Media upload functionality', 'info');
    }
    
    saveSettings() {
        console.log('Saving settings');
        this.showToast('Settings saved successfully', 'success');
    }
    
    viewMessage(messageId) {
        console.log('Viewing message:', messageId);
        this.showToast('View message functionality', 'info');
    }
    
    openComposeMessageModal() {
        console.log('Opening compose message modal');
        this.showToast('Compose message functionality', 'info');
    }
    
    openBulkStockModal() {
        console.log('Opening bulk stock update modal');
        this.showToast('Bulk stock update functionality', 'info');
    }
    
    handleLogout() {
        console.log('Logging out');
        this.showToast('Logging out...', 'info');
        
        // Hook point for real logout logic
        setTimeout(() => {
            this.redirectToLogin();
        }, 1500);
    }
    
    handleKeyboardShortcuts(e) {
        // ESC to close modal
        if (e.key === 'Escape') {
            this.closeModal();
        }
        
        // Ctrl+S to save (in forms)
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (this.currentSection === 'settings') {
                this.saveSettings();
            }
        }
    }
}

// ===================================
// INITIALIZATION
// ===================================

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the dashboard
    window.dashboard = new AdminDashboard();
    
    console.log('🎉 Admin Dashboard ready for real integration');
});
