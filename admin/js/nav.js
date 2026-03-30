// ============================================
// ADMIN PANEL NAVIGATION MANAGER
// nav.js
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.admin-section');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    // Add hamburger menu for mobile
    const hamburger = document.createElement('button');
    hamburger.className = 'hamburger';
    hamburger.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;
    hamburger.addEventListener('click', toggleSidebar);
    
    // Insert hamburger at the beginning of topBar
    const topBar = document.getElementById('topBar');
    if (topBar) {
        topBar.insertBefore(hamburger, topBar.firstChild);
    }
    
    // Navigation click handler
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetSection = this.getAttribute('data-section');
            
            showSection(targetSection);
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Close sidebar on mobile after navigation
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                hamburger.classList.remove('active');
            }
        });
    });
    
    // Show section function
    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(sectionId + 'Section');
        if (targetSection) {
            targetSection.classList.add('active');
        }
    }
    
    // Toggle sidebar for mobile
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        hamburger.classList.toggle('active');
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
                sidebar.classList.remove('active');
                hamburger.classList.remove('active');
            }
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            hamburger.classList.remove('active');
        }
    });
    
    // Handle escape key to close sidebar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            hamburger.classList.remove('active');
        }
    });
    
    // Initialize dashboard as active section
    showSection('dashboard');
    
    // Global logout function
    window.logout = function() {
        if (window.firebaseAuth) {
            window.firebaseAuth.signOut().then(() => {
                showToast('Logged out successfully', 'success');
                setTimeout(() => {
                    window.location.href = '../login.html';
                }, 1000);
            }).catch((error) => {
                showToast('Error logging out: ' + error.message, 'error');
            });
        } else {
            window.location.href = '../login.html';
        }
    };
    
    // Toast notification function
    window.showToast = function(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--warning)'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: var(--z-toast);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            min-height: 44px;
            display: flex;
            align-items: center;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        toastContainer.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    };
});
