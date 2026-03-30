// admin/js/dashboard.js - PHASE 1: Mobile-First Live Dashboard
import { db } from '../../firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

function startInarahLive() {
    // 1. Sync Visitors
    onValue(ref(db, 'visits'), (snap) => {
        const visitorCount = snap.exists() ? Object.keys(snap.val()).length : 0;
        document.getElementById('stat-visitors').innerText = visitorCount;
    });

    // 2. Sync Orders & Revenue
    onValue(ref(db, 'orders'), (snap) => {
        console.log("Dashboard Order Data:", snap.val()); // Debug logging
        
        let rev = 0;
        let active = 0;
        if (snap.exists()) {
            Object.values(snap.val()).forEach(o => {
                // Use the correct data structure from website
                const orderTotal = o.totals?.total || o.total || 0;
                if (o.status === 'completed' || o.status === 'shipped') {
                    rev += Number(orderTotal);
                }
                if (o.status === 'pending') {
                    active++;
                }
            });
        }
        document.getElementById('stat-revenue').innerText = `TK ${rev}`;
        document.getElementById('stat-orders').innerText = active;
    });
}

window.onload = startInarahLive;
