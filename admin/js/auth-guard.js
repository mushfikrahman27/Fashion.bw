// admin/js/auth-guard.js - PHASE 5: Security, Admin Roles & Final Deployment
import { auth, db } from '../../firebase-config.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. CHECK ACCESS ON EVERY PAGE
export function checkAdminAccess() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "login-secure.html"; // No user? Go to login.
            return;
        }

        // Verify Admin Role in Database
        try {
            const adminRef = ref(db, `admins/${user.uid}`);
            const snapshot = await get(adminRef);

            if (!snapshot.exists()) {
                showError("Access Denied: You are not authorized as an Admin.");
                setTimeout(async () => {
                    await signOut(auth);
                    window.location.href = "login-secure.html";
                }, 2000);
                return;
            }

            // User is verified admin - allow access
            console.log("Admin access granted for:", user.email);
            hideError();
            
        } catch (error) {
            console.error("Admin verification failed:", error);
            showError("Security check failed. Please try again.");
            setTimeout(() => {
                window.location.href = "login-secure.html";
            }, 3000);
        }
    });
}

// 2. SECURE LOGIN FUNCTION
window.loginAdmin = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    const loginBtn = document.getElementById('loginBtn');
    const btnText = document.getElementById('btnText');
    
    // Validation
    if (!email || !pass) {
        showError("Please enter both email and password.");
        return;
    }

    // Show loading state
    loginBtn.disabled = true;
    btnText.textContent = "Signing In...";
    hideError();

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        
        // Check if this user is admin before redirecting
        const adminRef = ref(db, `admins/${userCredential.user.uid}`);
        const adminSnapshot = await get(adminRef);
        
        if (adminSnapshot.exists()) {
            // Success - Admin verified
            btnText.textContent = "✅ Success!";
            setTimeout(() => {
                window.location.href = "dashboard-new.html";
            }, 1000);
        } else {
            // User exists but not admin
            showError("Access Denied: This account is not authorized as Admin.");
            await signOut(auth);
            loginBtn.disabled = false;
            btnText.textContent = "Sign In";
        }
        
    } catch (error) {
        console.error("Login failed:", error);
        let errorMessage = "Login failed. Please try again.";
        
        // User-friendly error messages
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = "Admin account not found.";
                break;
            case 'auth/wrong-password':
                errorMessage = "Incorrect password.";
                break;
            case 'auth/too-many-requests':
                errorMessage = "Too many attempts. Please wait.";
                break;
            case 'auth/network-request-failed':
                errorMessage = "Network error. Check connection.";
                break;
        }
        
        showError(errorMessage);
        loginBtn.disabled = false;
        btnText.textContent = "Sign In";
    }
};

// 3. ERROR DISPLAY FUNCTIONS
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function hideError() {
    const errorElement = document.getElementById('errorMessage');
    errorElement.style.display = 'none';
}

// 4. AUTO-SECURE ALL ADMIN PAGES
// Add this script to all admin pages to protect them
document.addEventListener('DOMContentLoaded', () => {
    // Only check admin access if not on login page
    if (!window.location.pathname.includes('login-secure.html')) {
        checkAdminAccess();
    }
});

// 5. SESSION TIMEOUT (Optional - Enhanced Security)
let sessionTimeout;
function resetSessionTimeout() {
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
        signOut(auth).then(() => {
            alert("Session expired for security. Please login again.");
            window.location.href = "login-secure.html";
        });
    }, 30 * 60 * 1000); // 30 minutes
}

// Reset timeout on user activity
document.addEventListener('mousemove', resetSessionTimeout);
document.addEventListener('keypress', resetSessionTimeout);
