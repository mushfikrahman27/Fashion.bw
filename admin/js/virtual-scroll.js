// ============================================
// VIRTUAL SCROLLING FOR LARGE LISTS
// js/virtual-scroll.js
// ============================================

class VirtualScrollManager {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.items = [];
        this.visibleItems = [];
        this.itemHeight = options.itemHeight || 60;
        this.bufferSize = options.bufferSize || 10;
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.isScrolling = false;
        this.renderCallback = options.renderItem || this.defaultRenderItem;
        
        this.init();
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    init() {
        if (!this.container) return;
        
        this.containerHeight = this.container.clientHeight;
        this.setupScrollListener();
        this.setupResizeListener();
    }

    // ─────────────────────────────────────────
    // SETUP SCROLL LISTENER
    // ─────────────────────────────────────────
    setupScrollListener() {
        this.container.addEventListener('scroll', () => {
            this.handleScroll();
        });
    }

    // ─────────────────────────────────────────
    // SETUP RESIZE LISTENER
    // ─────────────────────────────────────────
    setupResizeListener() {
        window.addEventListener('resize', () => {
            this.containerHeight = this.container.clientHeight;
            this.render();
        });
    }

    // ─────────────────────────────────────────
    // SET ITEMS
    // ─────────────────────────────────────────
    setItems(items) {
        this.items = items;
        this.render();
    }

    // ─────────────────────────────────────────
    // HANDLE SCROLL
    // ─────────────────────────────────────────
    handleScroll() {
        this.scrollTop = this.container.scrollTop;
        
        if (!this.isScrolling) {
            this.isScrolling = true;
            requestAnimationFrame(() => {
                this.render();
                this.isScrolling = false;
            });
        }
    }

    // ─────────────────────────────────────────
    // CALCULATE VISIBLE RANGE
    // ─────────────────────────────────────────
    calculateVisibleRange() {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
        const endIndex = Math.min(startIndex + visibleCount + this.bufferSize, this.items.length);
        
        return { startIndex, endIndex };
    }

    // ─────────────────────────────────────────
    // RENDER VISIBLE ITEMS
    // ─────────────────────────────────────────
    render() {
        const { startIndex, endIndex } = this.calculateVisibleRange();
        this.visibleItems = this.items.slice(startIndex, endIndex);
        
        // Create spacer for top offset
        const topSpacer = document.createElement('div');
        topSpacer.style.height = `${startIndex * this.itemHeight}px`;
        
        // Render visible items
        const itemsHTML = this.visibleItems.map((item, index) => 
            this.renderCallback(item, startIndex + index)
        ).join('');
        
        // Create spacer for bottom offset
        const bottomSpacer = document.createElement('div');
        bottomSpacer.style.height = `${Math.max(0, (this.items.length - endIndex) * this.itemHeight)}px`;
        
        // Update container content
        this.container.innerHTML = '';
        this.container.appendChild(topSpacer);
        this.container.insertAdjacentHTML('beforeend', itemsHTML);
        this.container.appendChild(bottomSpacer);
    }

    // ─────────────────────────────────────────
    // DEFAULT RENDER ITEM
    // ─────────────────────────────────────────
    defaultRenderItem(item, index) {
        return `
            <div class="virtual-item" data-index="${index}" style="height: ${this.itemHeight}px; display: flex; align-items: center; padding: 8px; border-bottom: 1px solid var(--border);">
                <div class="virtual-item-content">
                    <h4>${item.name || item.title || 'Untitled'}</h4>
                    <p>${item.description || item.content || ''}</p>
                </div>
            </div>
        `;
    }

    // ─────────────────────────────────────────
    // SCROLL TO ITEM
    // ─────────────────────────────────────────
    scrollToItem(index) {
        const targetScrollTop = index * this.itemHeight;
        this.container.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
        });
    }

    // ─────────────────────────────────────────
    // GET VISIBLE ITEMS
    // ─────────────────────────────────────────
    getVisibleItems() {
        return this.visibleItems;
    }

    // ─────────────────────────────────────────
    // GET TOTAL ITEMS
    // ─────────────────────────────────────────
    getTotalItems() {
        return this.items.length;
    }
}

// Export for use in other modules
window.VirtualScrollManager = VirtualScrollManager;
