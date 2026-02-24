// admin/js/dashboard.js
import { auth, db } from '../../firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 1. Security Check: Keu login chara dhukte parbe na
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html"; // Login na thakle login page-e niye jabe
    }
});

// 2. Realtime Stats Load
const totalVisitorsEl = document.getElementById('totalVisitors');

function loadDashboardStats() {
    const visitsRef = ref(db, 'visits');

    // Realtime data listener (Data barle auto update hobe)
    onValue(visitsRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const totalCount = Object.keys(data).length; // Koita visit hoyeche ta count kora
            totalVisitorsEl.innerText = totalCount;
        } else {
            totalVisitorsEl.innerText = "0";
        }
    });
}

// 3. Logout System
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            alert("Logged Out!");
            window.location.href = "index.html";
        });
    });
}

// Execute function
loadDashboardStats();