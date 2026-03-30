// ============================================
// ACCESSIBILITY ENHANCEMENTS
// js/accessibility.js
// ============================================

class AccessibilityManager {
    constructor() {
        this.focusableElements = new Set();
        this.currentFocusIndex = -1;
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    init() {
        this.setupKeyboardNavigation();
        this.setupAriaLabels();
        this.setupFocusManagement();
        this.setupScreenReaderAnnouncements();
    }

    // ─────────────────────────────────────────
    // SETUP KEYBOARD NAVIGATION
    // ─────────────────────────────────────────
    setupKeyboardNavigation() {
        // Navigation keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Alt + number keys for quick navigation
            if (e.altKey && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                const sectionMap = {
                    '1': 'dashboard',
                    '2': 'products', 
                    '3': 'orders',
                    '4': 'inventory',
                    '5': 'media',
                    '6': 'settings',
                    '7': 'messages'
                };
                
                const targetSection = sectionMap[e.key];
                if (targetSection) {
                    this.navigateToSection(targetSection);
                }
            }
            
            // Tab navigation for interactive elements
            if (e.key === 'Tab') {
                this.handleTabNavigation(e);
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            
            // Enter to activate focused elements
            if (e.key === 'Enter') {
                this.activateFocusedElement();
            }
        });
    }

    // ─────────────────────────────────────────
    // SETUP ARIA LABELS
    // ─────────────────────────────────────────
    setupAriaLabels() {
        // Add ARIA labels to navigation
        const nav = document.querySelector('nav');
        if (nav) {
            nav.setAttribute('aria-label', 'Admin navigation');
            
            const navItems = nav.querySelectorAll('.nav-item');
            navItems.forEach((item, index) => {
                item.setAttribute('role', 'button');
                item.setAttribute('tabindex', '0');
                item.setAttribute('aria-label', `Navigate to ${item.textContent.trim()} section`);
            });
        }

        // Add ARIA labels to forms
        this.enhanceFormAccessibility();
        
        // Add ARIA labels to data tables
        this.enhanceTableAccessibility();
    }

    // ─────────────────────────────────────────
    // ENHANCE FORM ACCESSIBILITY
    // ─────────────────────────────────────────
    enhanceFormAccessibility() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            // Add form description
            if (!form.getAttribute('aria-describedby')) {
                const formId = form.id || 'form';
                form.setAttribute('aria-describedby', `${formId}-description`);
                
                // Add hidden description
                const description = document.createElement('div');
                description.id = `${formId}-description`;
                description.className = 'sr-only';
                description.textContent = `Form for ${formId.replace('-', ' ')}`;
                form.parentNode.insertBefore(description, form);
            }
            
            // Enhance form inputs
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                this.enhanceInputAccessibility(input);
            });
        });
    }

    // ─────────────────────────────────────────
    // ENHANCE INPUT ACCESSIBILITY
    // ─────────────────────────────────────────
    enhanceInputAccessibility(input) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        const inputId = input.id || 'input';
        
        // Ensure proper labeling
        if (!input.getAttribute('aria-label') && label) {
            input.setAttribute('aria-label', label.textContent.trim());
        }
        
        // Add required indicator
        if (input.hasAttribute('required')) {
            input.setAttribute('aria-required', 'true');
        }
        
        // Add error message association
        const errorElement = document.getElementById(`${inputId}-error`);
        if (errorElement) {
            input.setAttribute('aria-describedby', `${inputId}-error`);
            errorElement.setAttribute('role', 'alert');
            errorElement.setAttribute('aria-live', 'polite');
        }
        
        // Add focus/blur handlers for visual feedback
        input.addEventListener('focus', () => {
            input.classList.add('focused');
            this.announceToScreenReader(`${input.getAttribute('aria-label')} field focused`);
        });
        
        input.addEventListener('blur', () => {
            input.classList.remove('focused');
        });
    }

    // ─────────────────────────────────────────
    // ENHANCE TABLE ACCESSIBILITY
    // ─────────────────────────────────────────
    enhanceTableAccessibility() {
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            table.setAttribute('role', 'grid');
            table.setAttribute('aria-label', 'Data table');
            
            // Enhance table headers
            const headers = table.querySelectorAll('th');
            headers.forEach((header, index) => {
                header.setAttribute('scope', 'col');
                header.setAttribute('role', 'columnheader');
                header.setAttribute('aria-sort', 'none'); // Override if sortable
            });
            
            // Enhance table rows
            const rows = table.querySelectorAll('tr');
            rows.forEach((row, rowIndex) => {
                row.setAttribute('role', 'row');
                
                const cells = row.querySelectorAll('td, th');
                cells.forEach((cell, cellIndex) => {
                    const header = headers[cellIndex];
                    if (header) {
                        const headerText = header.textContent.trim();
                        cell.setAttribute('aria-label', `${headerText}, row ${rowIndex + 1}`);
                    }
                });
            });
        });
    }

    // ─────────────────────────────────────────
    // SETUP FOCUS MANAGEMENT
    // ─────────────────────────────────────────
    setupFocusManagement() {
        // Track focusable elements
        this.updateFocusableElements();
        
        // Observe DOM changes
        const observer = new MutationObserver(() => {
            this.updateFocusableElements();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ─────────────────────────────────────────
    // UPDATE FOCUSABLE ELEMENTS
    // ─────────────────────────────────────────
    updateFocusableElements() {
        this.focusableElements.clear();
        
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])',
            '.nav-item'
        ].join(', ');
        
        document.querySelectorAll(focusableSelectors).forEach(element => {
            this.focusableElements.add(element);
        });
    }

    // ─────────────────────────────────────────
    // HANDLE TAB NAVIGATION
    // ─────────────────────────────────────────
    handleTabNavigation(e) {
        const focusableArray = Array.from(this.focusableElements);
        const currentIndex = focusableArray.indexOf(document.activeElement);
        
        let nextIndex;
        if (e.shiftKey) {
            // Shift + Tab = previous
            nextIndex = currentIndex <= 0 ? focusableArray.length - 1 : currentIndex - 1;
        } else {
            // Tab = next
            nextIndex = currentIndex >= focusableArray.length - 1 ? 0 : currentIndex + 1;
        }
        
        if (nextIndex >= 0 && nextIndex < focusableArray.length) {
            const nextElement = focusableArray[nextIndex];
            nextElement.focus();
            e.preventDefault();
        }
    }

    // ─────────────────────────────────────────
    // NAVIGATE TO SECTION
    // ─────────────────────────────────────────
    navigateToSection(sectionId) {
        const navItem = document.querySelector(`[data-section="${sectionId}"]`);
        if (navItem) {
            navItem.click();
            this.announceToScreenReader(`Navigated to ${sectionId} section`);
        }
    }

    // ─────────────────────────────────────────
    // ACTIVATE FOCUSED ELEMENT
    // ─────────────────────────────────────────
    activateFocusedElement() {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'BUTTON') {
            activeElement.click();
        }
    }

    // ─────────────────────────────────────────
    // CLOSE ALL MODALS
    // ─────────────────────────────────────────
    closeAllModals() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => modal.remove());
    }

    // ─────────────────────────────────────────
    // SCREEN READER ANNOUNCEMENTS
    // ─────────────────────────────────────────
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            announcement.remove();
        }, 1000);
    }
}

// Initialize accessibility manager
window.accessibilityManager = new AccessibilityManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.accessibilityManager.init();
});
