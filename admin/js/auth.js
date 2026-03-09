// admin/js/auth.js - Production-ready authentication system

// Firebase settings import
import { auth } from '../../firebase-config.js'; 

// Firebase authentication functions
import { 
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Form validation and security utilities
class FormValidator {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    static sanitizeInput(input) {
        return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    
    static validateLoginForm(email, password) {
        const errors = [];
        
        if (!email || !email.trim()) {
            errors.push('Email is required');
        } else if (!this.validateEmail(email)) {
            errors.push('Please enter a valid email address');
        }
        
        if (!password || !password.trim()) {
            errors.push('Password is required');
        } else if (password.length < 6) {
            errors.push('Password must be at least 6 characters');
        }
        
        return errors;
    }
}

// Toast notification system
class ToastManager {
    static show(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
}

// Rate limiting for login attempts
class RateLimiter {
    constructor() {
        this.attempts = new Map();
        this.MAX_ATTEMPTS = 5;
        this.LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
    }
    
    isLocked(email) {
        const attempts = this.attempts.get(email);
        if (!attempts) return false;
        
        const now = Date.now();
        if (attempts.count >= this.MAX_ATTEMPTS && now - attempts.lastAttempt < this.LOCKOUT_TIME) {
            return true;
        }
        
        // Reset if lockout period passed
        if (now - attempts.lastAttempt >= this.LOCKOUT_TIME) {
            this.attempts.delete(email);
        }
        
        return false;
    }
    
    recordAttempt(email) {
        const attempts = this.attempts.get(email) || { count: 0, lastAttempt: 0 };
        attempts.count++;
        attempts.lastAttempt = Date.now();
        this.attempts.set(email, attempts);
    }
    
    getRemainingTime(email) {
        const attempts = this.attempts.get(email);
        if (!attempts) return 0;
        
        const now = Date.now();
        const remaining = this.LOCKOUT_TIME - (now - attempts.lastAttempt);
        return Math.max(0, remaining);
    }
}

// Initialize rate limiter
const rateLimiter = new RateLimiter();

// DOM elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const messageBox = document.getElementById('loginMessage');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');

// UI state management
function setLoadingState(isLoading) {
    if (loginBtn) {
        loginBtn.disabled = isLoading;
        const btnText = loginBtn.querySelector('.btn-text');
        const btnLoader = loginBtn.querySelector('.btn-loader');
        
        if (isLoading) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline';
        } else {
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    }
}

function clearErrors() {
    if (emailError) emailError.textContent = '';
    if (passwordError) passwordError.textContent = '';
    if (messageBox) messageBox.textContent = '';
    
    if (emailInput) emailInput.classList.remove('error');
    if (passwordInput) passwordInput.classList.remove('error');
}

function showError(field, message) {
    const errorElement = field === 'email' ? emailError : passwordError;
    const inputElement = field === 'email' ? emailInput : passwordInput;
    
    if (errorElement) errorElement.textContent = message;
    if (inputElement) inputElement.classList.add('error');
}

function showMessage(message, type = 'error') {
    if (messageBox) {
        messageBox.textContent = message;
        messageBox.className = `login-message ${type}`;
    }
}

// Enhanced login function
async function handleLogin(email, password) {
    // Clear previous errors
    clearErrors();
    
    // Validate form
    const validationErrors = FormValidator.validateLoginForm(email, password);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => {
            if (error.includes('Email')) {
                showError('email', error);
            } else if (error.includes('Password')) {
                showError('password', error);
            } else {
                showMessage(error);
            }
        });
        return false;
    }
    
    // Check rate limiting
    if (rateLimiter.isLocked(email)) {
        const remainingTime = Math.ceil(rateLimiter.getRemainingTime(email) / 60000);
        showMessage(`Too many login attempts. Please try again in ${remainingTime} minutes.`);
        return false;
    }
    
    setLoadingState(true);
    
    try {
        // Sanitize inputs
        const sanitizedEmail = FormValidator.sanitizeInput(email.trim());
        const sanitizedPassword = FormValidator.sanitizeInput(password);
        
        // Attempt login
        const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, sanitizedPassword);
        
        // Successful login
        ToastManager.show('Login successful! Redirecting to dashboard...', 'success');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1500);
        
        return true;
        
    } catch (error) {
        // Record failed attempt
        rateLimiter.recordAttempt(email);
        
        // Handle specific error codes
        let errorMessage = 'Login failed. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many login attempts. Please try again later.';
                break;
            default:
                errorMessage = 'Login failed. Please check your credentials and try again.';
        }
        
        showMessage(errorMessage);
        console.error('Login error:', error);
        return false;
        
    } finally {
        setLoadingState(false);
    }
}

// Event listeners
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput?.value || '';
        const password = passwordInput?.value || '';
        
        await handleLogin(email, password);
    });
}

// Real-time validation
if (emailInput) {
    emailInput.addEventListener('blur', () => {
        const email = emailInput.value.trim();
        if (email && !FormValidator.validateEmail(email)) {
            showError('email', 'Please enter a valid email address');
        } else {
            emailError.textContent = '';
            emailInput.classList.remove('error');
        }
    });
}

if (passwordInput) {
    passwordInput.addEventListener('blur', () => {
        const password = passwordInput.value;
        if (password && password.length < 6) {
            showError('password', 'Password must be at least 6 characters');
        } else {
            passwordError.textContent = '';
            passwordInput.classList.remove('error');
        }
    });
}

// Clear errors on input
if (emailInput) {
    emailInput.addEventListener('input', () => {
        emailError.textContent = '';
        emailInput.classList.remove('error');
    });
}

if (passwordInput) {
    passwordInput.addEventListener('input', () => {
        passwordError.textContent = '';
        passwordInput.classList.remove('error');
    });
}

// Logout functionality for dashboard
async function handleLogout() {
    try {
        await signOut(auth);
        ToastManager.show('Logged out successfully', 'success');
        window.location.href = "index.html";
    } catch (error) {
        console.error('Logout error:', error);
        ToastManager.show('Logout failed', 'error');
    }
}

// Export logout function for dashboard
window.handleLogout = handleLogout;