// ============================================
// UNIFIED PRODUCT MANAGEMENT SYSTEM
// admin-products.js
// Replaces: main-product-catalog.js + legacy Products section
// Uses standardized Firebase paths from firebase-paths.js
// ============================================

import { COLLECTIONS, getCollectionRef } from './firebase-paths.js';
import { validateProduct, sanitizeInput } from './utils/sanitize.js';
import { showSkeleton, hideSkeleton, showToast, showError, showFieldError, hideFieldError, disableSaveButton, enableSaveButton, showProgress, hideProgress, withTimeout, lockForm, unlockForm, isFormLocked, debounce } from './utils/ui-helpers.js';
import { logProductAction } from './utils/audit-log.js';
import { registerListener, registerFirestoreListener } from './utils/cleanup-manager.js';

class UnifiedProductSystem {
    constructor() {
        this.products = {};         // merged from all Firebase paths
        this.categories = new Set();
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.editingId = null;
        this.PATHS = [COLLECTIONS.PRODUCTS]; // standardized path only
        
        // Pagination properties
        this.pageSize = 20;
        this.currentPage = 1;
        this.lastDoc = null;
        this.firstDoc = null;
        this.totalPages = 0;
        this.totalCount = 0;
    }

    // ─────────────────────────────────────────
    // INIT — merge both Firebase paths live
    // ─────────────────────────────────────────
    async init() {
        if (!window.firebaseDB) { console.warn('Firebase not ready'); return; }

        // Load products with pagination
        await this.loadProducts();
        this.renderPaginationControls();
    }

    // ─────────────────────────────────────────
    // LOAD PRODUCTS WITH PAGINATION
    // ─────────────────────────────────────────
    async loadProducts(resetPage = true) {
        if (resetPage) {
            this.currentPage = 1;
            this.lastDoc = null;
            this.firstDoc = null;
        }

        showSkeleton('productGrid', 5);
        
        try {
            const collectionRef = getCollectionRef('PRODUCTS');
            let query = collectionRef
                .orderBy('createdAt', 'desc')
                .limit(this.pageSize);

            if (this.lastDoc && !resetPage) {
                query = query.startAfter(this.lastDoc);
            }

            // Wrap with timeout
            const snapshot = await withTimeout(
                query.get(),
                10000,
                "Products - Load Products"
            );
            
            // Store pagination references
            this.products = {};
            snapshot.forEach(doc => {
                this.products[doc.id] = { ...doc.data(), _id: doc.id };
            });

            // Store pagination references
            this.lastDoc = snapshot.docs[snapshot.docs.length - 1];
            if (snapshot.docs.length > 0) {
                this.firstDoc = snapshot.docs[0];
            }

            // Get total count for pagination info
            await this.loadTotalCount();

            hideSkeleton('productGrid');
            this.renderProducts();
            this.updatePaginationInfo();

        } catch (error) {
            console.error('Load products error:', error);
            hideSkeleton('productGrid');
            showError('productGrid', 'Failed to load products: ' + error.message, () => this.loadProducts());
        }
    }

    // ─────────────────────────────────────────
    // LOAD TOTAL COUNT
    // ─────────────────────────────────────────
    async loadTotalCount() {
        try {
            const collectionRef = getCollectionRef('PRODUCTS');
            const snapshot = await collectionRef.get();
            this.totalCount = snapshot.size;
            this.totalPages = Math.ceil(this.totalCount / this.pageSize);
        } catch (error) {
            console.error('Load count error:', error);
            this.totalCount = 0;
            this.totalPages = 1;
        }
    }

    // ─────────────────────────────────────────
    // RENDER PAGINATION CONTROLS
    // ─────────────────────────────────────────
    renderPaginationControls() {
        const container = document.getElementById('paginationControls');
        if (!container) return;
        
        const firstDisabled = this.currentPage === 1 ? 'disabled' : '';
        const prevDisabled = this.currentPage === 1 ? 'disabled' : '';
        const nextDisabled = this.currentPage === this.totalPages ? 'disabled' : '';
        const lastDisabled = this.currentPage === this.totalPages ? 'disabled' : '';
        
        container.innerHTML = '<div class="pagination-info">' +
            '<span>Page ' + this.currentPage + ' of ' + this.totalPages + ' (' + this.totalCount + ' total products)</span>' +
            '</div>' +
            '<div class="pagination-buttons">' +
                '<button class="btn btn-secondary" onclick="productSystem.firstPage()" ' + firstDisabled + '>' +
                    '⏮ First' +
                '</button>' +
                '<button class="btn btn-secondary" onclick="productSystem.previousPage()" ' + prevDisabled + '>' +
                    '← Previous' +
                '</button>' +
                '<button class="btn btn-secondary" onclick="productSystem.nextPage()" ' + nextDisabled + '>' +
                    'Next →' +
                '</button>' +
                '<button class="btn btn-secondary" onclick="productSystem.lastPage()" ' + lastDisabled + '>' +
                    'Last ⏭' +
                '</button>' +
            '</div>';
    }

    // ─────────────────────────────────────────
    // UPDATE PAGINATION INFO
    // ─────────────────────────────────────────
    updatePaginationInfo() {
        const infoEl = document.querySelector('.pagination-info span');
        if (infoEl) {
            infoEl.textContent = 'Page ' + this.currentPage + ' of ' + this.totalPages + ' (' + this.totalCount + ' total products)';
        }
        
        // Update button states
        const buttons = document.querySelectorAll('.pagination-buttons button');
        buttons.forEach(btn => btn.disabled = false);
        
        if (this.currentPage === 1) {
            buttons[0].disabled = true; // First
            buttons[1].disabled = true; // Previous
        }
        
        if (this.currentPage === this.totalPages) {
            buttons[2].disabled = true; // Next
            buttons[3].disabled = true; // Last
        }
    }

    // ─────────────────────────────────────────
    // PAGINATION NAVIGATION
    // ─────────────────────────────────────────
    async firstPage() {
        if (this.currentPage === 1) return;
        await this.loadProducts(true);
    }

    async previousPage() {
        if (this.currentPage === 1) return;
        this.currentPage--;
        await this.loadProducts(false);
    }

    async nextPage() {
        if (this.currentPage === this.totalPages) return;
        this.currentPage++;
        await this.loadProducts(false);
    }

    async lastPage() {
        if (this.currentPage === this.totalPages) return;
        this.currentPage = this.totalPages;
        await this.loadProducts(false);
    }

    // ─────────────────────────────────────────
    // SUMMARY BAR
    // ─────────────────────────────────────────
    renderSummary() {
        const el = document.getElementById('productSummaryBar');
        if (!el) return;
        const all = Object.values(this.products);
        const total     = all.length;
        const active    = all.filter(p => p.active !== false).length;
        const outStock  = all.filter(p => (p.stock ?? p.quantity ?? 0) <= 0).length;
        const lowStock  = all.filter(p => { const s = p.stock ?? p.quantity ?? 0; return s > 0 && s <= (p.lowStockThreshold || 5); }).length;
        const totalValue = all.reduce((s, p) => s + ((p.stock ?? p.quantity ?? 0) * (p.price || 0)), 0);

        el.innerHTML = `
            <div class="pstat-card" onclick="productSystem.setFilter('all')">
                <div class="pstat-val">${total}</div><div class="pstat-lbl">Total Products</div>
            </div>
            <div class="pstat-card active" onclick="productSystem.setFilter('active')">
                <div class="pstat-val">${active}</div><div class="pstat-lbl">✅ Active</div>
            </div>
            <div class="pstat-card low" onclick="productSystem.setFilter('low')">
                <div class="pstat-val">${lowStock}</div><div class="pstat-lbl">⚠️ Low Stock</div>
            </div>
            <div class="pstat-card out" onclick="productSystem.setFilter('out')">
                <div class="pstat-val">${outStock}</div><div class="pstat-lbl">❌ Out of Stock</div>
            </div>
            <div class="pstat-card value">
                <div class="pstat-val">TK ${totalValue.toLocaleString()}</div><div class="pstat-lbl">💰 Stock Value</div>
            </div>
        `;
    }

    // ─────────────────────────────────────────
    // CATEGORY FILTER DROPDOWN
    // ─────────────────────────────────────────
    populateCategoryFilter() {
        const el = document.getElementById('productCategoryFilter');
        if (!el) return;
        const current = el.value;
        el.innerHTML = `<option value="all">All Categories</option>` +
            [...this.categories].sort().map(c => `<option value="${c}" ${current === c ? 'selected' : ''}>${c}</option>`).join('');
    }

    setFilter(f) {
        this.currentFilter = f;
        this.renderProducts();
    }

    // ─────────────────────────────────────────
    // RENDER PRODUCT GRID
    // ─────────────────────────────────────────
    renderProducts() {
        const el = document.getElementById('productGrid');
        if (!el) return;

        const search   = (document.getElementById('productSearchInput')?.value || '').toLowerCase();
        const category = document.getElementById('productCategoryFilter')?.value || 'all';
        const sort     = document.getElementById('productSortSelect')?.value || 'name';

        let list = Object.values(this.products);

        // Filter by status
        if (this.currentFilter === 'active') list = list.filter(p => p.active !== false);
        if (this.currentFilter === 'inactive') list = list.filter(p => p.active === false);
        if (this.currentFilter === 'low') list = list.filter(p => { const s = p.stock ?? p.quantity ?? 0; return s > 0 && s <= (p.lowStockThreshold || 5); });
        if (this.currentFilter === 'out') list = list.filter(p => (p.stock ?? p.quantity ?? 0) <= 0);

        // Search
        if (search) list = list.filter(p =>
            (p.name || '').toLowerCase().includes(search) ||
            (p.category || '').toLowerCase().includes(search) ||
            (p.description || '').toLowerCase().includes(search) ||
            (p._id || '').toLowerCase().includes(search)
        );

        // Category
        if (category !== 'all') list = list.filter(p => p.category === category);

        // Sort
        if (sort === 'name')       list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        if (sort === 'price_asc')  list.sort((a, b) => (a.price || 0) - (b.price || 0));
        if (sort === 'price_desc') list.sort((a, b) => (b.price || 0) - (a.price || 0));
        if (sort === 'stock_asc')  list.sort((a, b) => (a.stock ?? a.quantity ?? 0) - (b.stock ?? b.quantity ?? 0));
        if (sort === 'newest')     list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // Count display
        const countEl = document.getElementById('productCount');
        if (countEl) countEl.textContent = `${list.length} product${list.length !== 1 ? 's' : ''}`;

        if (list.length === 0) {
            el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#9ca3af">
                <div style="font-size:48px">📦</div>
                <p>No products found</p>
                <button class="obtn obtn-primary" onclick="productSystem.openAddModal()">+ Add First Product</button>
            </div>`;
            return;
        }

        el.innerHTML = list.map(p => this.productCard(p)).join('');
    }

    productCard(p) {
        const stock = p.stock ?? p.quantity ?? 0;
        const threshold = p.lowStockThreshold || 5;
        const stockLevel = stock <= 0 ? 'out' : stock <= threshold ? 'low' : 'ok';
        const stockBadge = {
            out: `<span class="pbadge pbadge-out">❌ Out of Stock</span>`,
            low: `<span class="pbadge pbadge-low">⚠️ Low (${stock})</span>`,
            ok:  `<span class="pbadge pbadge-ok">✅ ${stock} in stock</span>` 
        }[stockLevel];

        const activeBadge = p.active === false
            ? `<span class="pbadge" style="background:#f3f4f6;color:#6b7280">Hidden</span>` 
            : `<span class="pbadge" style="background:#d1fae5;color:#065f46">Active</span>`;

        return `
        <div class="product-card ${p.active === false ? 'inactive' : ''}">
            <div class="product-card-img">
                ${p.image || p.imageUrl
                    ? `<img src="${p.image || p.imageUrl}" alt="${p.name}" />` 
                    : `<div class="product-card-noimg">📦</div>`}
                <div class="product-card-badges">${activeBadge}</div>
            </div>
            <div class="product-card-body">
                <div class="product-card-name" title="${p.name || ''}">${p.name || 'Unnamed Product'}</div>
                ${p.category ? `<div class="product-card-cat">${p.category}</div>` : ''}
                <div class="product-card-price">TK ${(p.price || 0).toLocaleString()}</div>
                ${stockBadge}
                ${p.description ? `<div class="product-card-desc">${p.description.slice(0, 80)}${p.description.length > 80 ? '...' : ''}</div>` : ''}
            </div>
            <div class="product-card-actions">
                <button class="obtn obtn-primary" onclick="productSystem.openEditModal('${p._id}')">✏️ Edit</button>
                <button class="obtn" style="background:#f3f4f6;color:#374151" onclick="productSystem.toggleActive('${p._id}')">
                    ${p.active === false ? '👁️ Show' : '🙈 Hide'}
                </button>
                <button class="obtn obtn-cancel" onclick="productSystem.deleteProduct('${p._id}')">🗑️</button>
            </div>
        </div>`;
    }

    // ─────────────────────────────────────────
    // ADD / EDIT MODAL
    // ─────────────────────────────────────────
    openAddModal() {
        this.editingId = null;
        this.renderModal({});
        document.getElementById('productModalTitle').textContent = '➕ Add New Product';
        document.getElementById('productModal').style.display = 'flex';
    }

    openEditModal(productId) {
        this.editingId = productId;
        const product = this.products[productId];
        if (!product) return;
        this.renderModal(product);
        document.getElementById('productModalTitle').textContent = '✏️ Edit Product';
        document.getElementById('productModal').style.display = 'flex';
    }

    renderModal(p) {
        const categoryOptions = [...this.categories].sort()
            .map(c => `<option value="${c}" ${p.category === c ? 'selected' : ''}>${c}</option>`).join('');

        document.getElementById('productModalBody').innerHTML = `
            <div class="pform-grid">
                <div class="pform-group pform-full">
                    <label>Product Name *</label>
                    <input id="pf_name" type="text" value="${p.name || ''}" placeholder="Enter product name" />
                </div>
                <div class="pform-group">
                    <label>Price (TK) *</label>
                    <input id="pf_price" type="number" value="${p.price || ''}" placeholder="0" min="0" />
                </div>
                <div class="pform-group">
                    <label>Stock Quantity</label>
                    <input id="pf_stock" type="number" value="${p.stock ?? p.quantity ?? ''}" placeholder="0" min="0" />
                </div>
                <div class="pform-group">
                    <label>Category</label>
                    <input id="pf_category" type="text" value="${p.category || ''}" placeholder="e.g. Clothing, Food..."
                        list="categoryDatalist" />
                    <datalist id="categoryDatalist">${categoryOptions}</datalist>
                </div>
                <div class="pform-group">
                    <label>Low Stock Alert At ≤</label>
                    <input id="pf_threshold" type="number" value="${p.lowStockThreshold || 5}" min="1" />
                </div>
                <div class="pform-group pform-full">
                    <label>Description</label>
                    <textarea id="pf_description" placeholder="Product description...">${p.description || ''}</textarea>
                </div>
                <div class="pform-group pform-full">
                    <label>Image URL</label>
                    <input id="pf_image" type="text" value="${p.image || p.imageUrl || ''}" placeholder="https://..." 
                        oninput="productSystem.previewImage(this.value)" />
                    <div id="imagePreviewWrap" style="margin-top:8px">
                        ${(p.image || p.imageUrl) ? `<img src="${p.image || p.imageUrl}" id="imagePreview" style="max-height:100px;border-radius:8px;border:1px solid #e5e7eb" />` : ''}
                    </div>
                </div>
                <div class="pform-group pform-full">
                    <label>Additional Fields (JSON — optional)</label>
                    <textarea id="pf_extra" placeholder='{"weight": "500g", "color": "red"}'>${p._extra ? JSON.stringify(p._extra, null, 2) : ''}</textarea>
                </div>
                <div class="pform-group pform-full" style="display:flex;align-items:center;gap:10px">
                    <input type="checkbox" id="pf_active" ${p.active !== false ? 'checked' : ''} style="width:18px;height:18px" />
                    <label for="pf_active" style="margin:0;cursor:pointer">Product is Active (visible on website)</label>
                </div>
            </div>
        `;
    }

    previewImage(url) {
        const wrap = document.getElementById('imagePreviewWrap');
        if (!wrap) return;
        if (url) {
            wrap.innerHTML = `<img src="${url}" id="imagePreview" style="max-height:100px;border-radius:8px;border:1px solid #e5e7eb" onerror="this.style.display='none'" />`;
        } else {
            wrap.innerHTML = '';
        }
    }

    async saveProduct() {
        // Check if form is already locked
        if (isFormLocked('productForm')) {
            showToast('Please wait for current operation to complete', 'warning');
            return;
        }
        
        // Lock form
        lockForm('productForm');
        
        // Clear previous errors
        hideFieldError('pf_name');
        hideFieldError('pf_price');
        hideFieldError('pf_stock');
        hideFieldError('pf_category');
        
        // Collect form data
        const productData = {
            name: document.getElementById('pf_name')?.value?.trim(),
            price: parseFloat(document.getElementById('pf_price')?.value || 0),
            stock: parseInt(document.getElementById('pf_stock')?.value || 0),
            category: document.getElementById('pf_category')?.value?.trim() || '',
            description: document.getElementById('pf_description')?.value?.trim() || '',
            image: document.getElementById('pf_image')?.value?.trim() || '',
            lowStockThreshold: parseInt(document.getElementById('pf_threshold')?.value || 5),
            active: document.getElementById('pf_active')?.checked ?? true
        };
        
        // Parse extra JSON if provided
        try {
            const extraRaw = document.getElementById('pf_extra')?.value?.trim();
            if (extraRaw) {
                productData._extra = JSON.parse(extraRaw);
            }
        } catch (e) {
            showFieldError('pf_extra', 'Extra fields JSON is invalid');
            unlockForm('productForm');
            return;
        }
        
        // Validate all product data
        const validation = validateProduct(productData);
        
        if (!validation.isValid) {
            // Show specific field errors
            if (validation.errors.some(e => e.includes('name'))) {
                showFieldError('pf_name', validation.errors.find(e => e.includes('name')));
            }
            if (validation.errors.some(e => e.includes('price'))) {
                showFieldError('pf_price', validation.errors.find(e => e.includes('price')));
            }
            if (validation.errors.some(e => e.includes('stock'))) {
                showFieldError('pf_stock', validation.errors.find(e => e.includes('stock')));
            }
            if (validation.errors.some(e => e.includes('description'))) {
                showFieldError('pf_description', validation.errors.find(e => e.includes('description')));
            }
            
            showToast('Please fix validation errors', 'error');
            unlockForm('productForm');
            return;
        }
        
        // Check for duplicate product (name + category combo)
        if (!this.editingId) {
            const isDuplicate = await this.checkDuplicateProduct(
                validation.sanitized.name, 
                validation.sanitized.category
            );
            
            if (isDuplicate) {
                const shouldUpdate = confirm(
                    `Product "${validation.sanitized.name}" already exists in category "${validation.sanitized.category}".\n\n` +
                    'Do you want to update the existing product instead?'
                );
                
                if (shouldUpdate) {
                    // Find and edit the existing product
                    const existingProduct = Object.values(this.products).find(p => 
                        p.name.toLowerCase() === validation.sanitized.name.toLowerCase() &&
                        p.category === validation.sanitized.category
                    );
                    
                    if (existingProduct) {
                        unlockForm('productForm');
                        this.openEditModal(existingProduct._id);
                        return;
                    }
                } else {
                    unlockForm('productForm');
                    return; // User chose not to update
                }
            }
        }
        
        // Disable save button and show progress
        disableSaveButton('productSaveBtn', this.editingId ? 'Updating...' : 'Saving...');
        
        try {
            const collectionRef = getCollectionRef('PRODUCTS');
            
            if (this.editingId) {
                // Update existing product
                await withTimeout(
                    collectionRef.doc(this.editingId).update({
                        ...validation.sanitized,
                        updatedAt: Date.now()
                    }),
                    10000,
                    "Products - Update Product"
                );
                
                // Log product update
                await logProductAction('UPDATED', {
                    id: this.editingId,
                    name: validation.sanitized.name,
                    category: validation.sanitized.category,
                    price: validation.sanitized.price,
                    changes: this.getProductChanges(this.editingId, validation.sanitized)
                });
                
                showToast('Product updated successfully', 'success');
            } else {
                // Create new product
                const docRef = await withTimeout(
                    collectionRef.add({
                        ...validation.sanitized,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    }),
                    10000,
                    "Products - Create Product"
                );
                
                // Log product creation
                await logProductAction('CREATED', {
                    id: docRef.id,
                    name: validation.sanitized.name,
                    category: validation.sanitized.category,
                    price: validation.sanitized.price
                });
                
                showToast('Product created successfully', 'success');
            }
            
            // Close modal and refresh
            this.closeModal();
            this.loadProducts(); // Reload products to show changes
            
        } catch (error) {
            console.error('Save product error:', error);
            showToast('Failed to save product: ' + error.message, 'error');
        } finally {
            // Always unlock form
            unlockForm('productForm');
            enableSaveButton('productSaveBtn', 'Save');
        }
    }

    // ─────────────────────────────────────────
    // HANDLE SEARCH WITH DEBOUNCE
    // ─────────────────────────────────────────
    handleSearch(event) {
        const searchTerm = event.target.value.trim();
        
        // Debounce search to avoid excessive Firebase calls
        this.debouncedSearch(searchTerm);
    }

    debouncedSearch = debounce(async (searchTerm) => {
        this.currentSearch = searchTerm;
        this.currentPage = 1; // Reset to first page on new search
        this.lastDoc = null;
        this.firstDoc = null;
        
        await this.loadProducts(false);
    }, 300);

    // ─────────────────────────────────────────
    // CHECK DUPLICATE PRODUCT
    // ─────────────────────────────────────────
    async checkDuplicateProduct(name, category) {
        const collectionRef = getCollectionRef('PRODUCTS');
        
        try {
            const snapshot = await collectionRef
                .where('name', '==', name)
                .where('category', '==', category)
                .limit(1)
                .get();
            
            return !snapshot.empty;
        } catch (error) {
            console.error('Duplicate check error:', error);
            return false;
        }
    }

    async toggleActive(productId) {
        const product = this.products[productId];
        if (!product || !window.firebaseDB) return;
        const { ref, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        const newActive = product.active === false ? true : false;
        await update(ref(window.firebaseDB, `products/${productId}`), { active: newActive });
        this.showToast(newActive ? 'Product is now visible' : 'Product hidden from website', 'success');
    }

    async deleteProduct(productId) {
        const product = this.products[productId];
        if (!confirm(`Delete "${product?.name || productId}"? This cannot be undone.`)) return;
        if (!window.firebaseDB) return;
        const { ref, remove } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");

        try {
            // Delete from both paths to clean up legacy data too
            await Promise.allSettled(
                this.PATHS.map(path => remove(ref(window.firebaseDB, `${path}/${productId}`)))
            );
            delete this.products[productId];
            this.renderProducts();
            this.renderSummary();
            this.showToast('Product deleted', 'success');
        } catch (err) {
            this.showToast('Failed to delete product', 'error');
        }
    }

    closeModal() {
        document.getElementById('productModal').style.display = 'none';
        this.editingId = null;
    }

    // ─────────────────────────────────────────
    // MIGRATE legacy product-catalog → products
    // ─────────────────────────────────────────
    async migrateLegacyProducts() {
        if (!window.firebaseDB) return;
        if (!confirm('This will copy all products from "product-catalog" into "products" node. Continue?')) return;
        const { ref, get, set } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        const snap = await get(ref(window.firebaseDB, 'product-catalog'));
        if (!snap.exists()) { this.showToast('No legacy products found', 'error'); return; }
        let count = 0;
        const updates = [];
        snap.forEach(child => {
            updates.push(set(ref(window.firebaseDB, `products/${child.key}`), { ...child.val(), _migratedAt: Date.now() }));
            count++;
        });
        await Promise.all(updates);
        this.showToast(`✅ Migrated ${count} products to unified catalog`, 'success');
    }

    // ─────────────────────────────────────────
    // TOAST
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

window.productSystem = new UnifiedProductSystem();
document.addEventListener('DOMContentLoaded', () => window.productSystem.init());
