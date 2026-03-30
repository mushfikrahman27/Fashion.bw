// ============================================
// CATEGORY MANAGEMENT SYSTEM
// js/categories.js
// ============================================

import { COLLECTIONS, getCollectionRef } from './firebase-paths.js';
import { showToast, showError } from './utils/ui-helpers.js';

class CategoryManager {
    constructor() {
        this.categories = new Set();
        this.productCounts = {};
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    async init() {
        if (!window.firebaseDB) {
            console.warn('Firebase not ready');
            return;
        }
        
        await this.loadCategories();
        await this.loadProductCounts();
    }

    // ─────────────────────────────────────────
    // LOAD CATEGORIES
    // ─────────────────────────────────────────
    async loadCategories() {
        try {
            const collectionRef = getCollectionRef('PRODUCTS');
            const snapshot = await collectionRef.get();
            
            this.categories.clear();
            snapshot.forEach(doc => {
                const product = doc.data();
                if (product.category) {
                    this.categories.add(product.category);
                }
            });
            
            this.renderCategories();
        } catch (error) {
            console.error('Load categories error:', error);
            showError('categoriesContainer', 'Failed to load categories', () => this.loadCategories());
        }
    }

    // ─────────────────────────────────────────
    // LOAD PRODUCT COUNTS PER CATEGORY
    // ─────────────────────────────────────────
    async loadProductCounts() {
        try {
            const collectionRef = getCollectionRef('PRODUCTS');
            const snapshot = await collectionRef.get();
            
            this.productCounts = {};
            snapshot.forEach(doc => {
                const product = doc.data();
                const category = product.category || 'Uncategorized';
                
                if (!this.productCounts[category]) {
                    this.productCounts[category] = 0;
                }
                this.productCounts[category]++;
            });
            
        } catch (error) {
            console.error('Load product counts error:', error);
        }
    }

    // ─────────────────────────────────────────
    // RENDER CATEGORIES
    // ─────────────────────────────────────────
    renderCategories() {
        const container = document.getElementById('categoriesContainer');
        if (!container) return;
        
        const categoriesArray = Array.from(this.categories).sort();
        
        if (categoriesArray.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No categories found. Categories will be created when you add products.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = categoriesArray.map(category => {
            const productCount = this.productCounts[category] || 0;
            const countBadge = productCount > 0 ? `<span class="category-count">(${productCount})</span>` : '';
            
            return `
                <div class="category-item">
                    <div class="category-info">
                        <span class="category-name">${category}</span>
                        ${countBadge}
                    </div>
                    <div class="category-actions">
                        <button class="btn btn-sm btn-danger" onclick="categoryManager.confirmDeleteCategory('${category}')" title="Delete category">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ─────────────────────────────────────────
    // CONFIRM DELETE CATEGORY
    // ─────────────────────────────────────────
    async confirmDeleteCategory(category) {
        const productCount = this.productCounts[category] || 0;
        
        if (productCount > 0) {
            // Show warning modal with product count
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal">
                    <h3>⚠️ Cannot Delete Category</h3>
                    <p>This category has <strong>${productCount}</strong> active product${productCount !== 1 ? 's' : ''}.</p>
                    <p>You must reassign or delete these products before removing this category.</p>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                        <button class="btn btn-primary" onclick="categoryManager.viewCategoryProducts('${category}')">View Products</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            return;
        }
        
        // No products - can delete directly
        const confirmed = confirm(`Are you sure you want to delete the category "${category}"?`);
        if (confirmed) {
            await this.deleteCategory(category);
        }
    }

    // ─────────────────────────────────────────
    // DELETE CATEGORY
    // ─────────────────────────────────────────
    async deleteCategory(category) {
        try {
            // Remove category from all products in this category
            const collectionRef = getCollectionRef('PRODUCTS');
            const snapshot = await collectionRef.where('category', '==', category).get();
            
            const batch = window.firebaseDB.batch();
            snapshot.forEach(doc => {
                batch.update(doc.ref, { category: '', updatedAt: Date.now() });
            });
            
            await batch.commit();
            
            // Update local data
            this.categories.delete(category);
            delete this.productCounts[category];
            
            this.renderCategories();
            showToast(`Category "${category}" deleted successfully`, 'success');
            
        } catch (error) {
            console.error('Delete category error:', error);
            showToast('Failed to delete category: ' + error.message, 'error');
        }
    }

    // ─────────────────────────────────────────
    // VIEW CATEGORY PRODUCTS
    // ─────────────────────────────────────────
    viewCategoryProducts(category) {
        // Close any open modals
        document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
        
        // Switch to products section and filter by category
        const navItem = document.querySelector('[data-section="products"]');
        if (navItem) {
            navItem.click();
            
            // Set category filter after a short delay
            setTimeout(() => {
                const categoryFilter = document.getElementById('productCategoryFilter');
                if (categoryFilter) {
                    categoryFilter.value = category;
                    categoryFilter.dispatchEvent(new Event('change'));
                }
            }, 500);
        }
    }

    // ─────────────────────────────────────────
    // ADD NEW CATEGORY
    // ─────────────────────────────────────────
    addCategory(categoryName) {
        if (!categoryName || categoryName.trim() === '') {
            showToast('Category name is required', 'error');
            return;
        }
        
        const sanitizedCategory = categoryName.trim();
        
        if (this.categories.has(sanitizedCategory)) {
            showToast('Category already exists', 'warning');
            return;
        }
        
        this.categories.add(sanitizedCategory);
        this.productCounts[sanitizedCategory] = 0;
        
        this.renderCategories();
        showToast(`Category "${sanitizedCategory}" added`, 'success');
    }

    // ─────────────────────────────────────────
    // GET CATEGORY OPTIONS
    // ─────────────────────────────────────────
    getCategoryOptions() {
        const categoriesArray = Array.from(this.categories).sort();
        return categoriesArray.map(category => 
            `<option value="${category}">${category}</option>`
        ).join('');
    }
}

// Initialize category manager
window.categoryManager = new CategoryManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.categoryManager.init();
});
