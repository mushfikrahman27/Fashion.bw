// ============================================
// MESSAGES & NOTIFICATIONS SYSTEM
// admin-messages.js
// Features: Customer messages, order notifications,
//           real-time alerts, templates, auto-replies
// ============================================

class MessagingSystem {
    constructor() {
        this.messages     = {};
        this.notifications = {};
        this.templates    = this.defaultTemplates();
        this.activeThread = null;
        this.unreadCount  = 0;
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    async init() {
        if (!window.firebaseDB) { console.warn('Firebase not ready'); return; }
        const { ref, onValue } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");

        // Live customer messages listener
        onValue(ref(window.firebaseDB, 'customer-messages'), (snap) => {
            this.messages = snap.exists() ? snap.val() : {};
            this.renderInbox();
            this.updateUnreadBadge();
        });

        // Live order notifications listener
        onValue(ref(window.firebaseDB, 'order-notifications'), (snap) => {
            this.notifications = snap.exists() ? snap.val() : {};
            this.renderNotifications();
        });

        // Load saved templates
        onValue(ref(window.firebaseDB, 'message-templates'), (snap) => {
            if (snap.exists()) {
                const saved = snap.val();
                this.templates = { ...this.defaultTemplates(), ...saved };
            }
            this.renderTemplates();
        });
    }

    // ─────────────────────────────────────────
    // DEFAULT TEMPLATES
    // ─────────────────────────────────────────
    defaultTemplates() {
        return {
            order_confirmed: {
                name: '✅ Order Confirmed',
                subject: 'Your order has been confirmed!',
                body: 'Dear {customerName},\n\nThank you for your order #{orderId}! We have received your order and it is now being processed.\n\nOrder Total: TK {orderTotal}\n\nWe will notify you once your order is shipped.\n\nThank you for shopping with us!'
            },
            order_shipped: {
                name: '🚚 Order Shipped',
                subject: 'Your order is on the way!',
                body: 'Dear {customerName},\n\nGreat news! Your order #{orderId} has been shipped.\n\nExpected delivery: 2-3 business days.\n\nThank you for your patience!'
            },
            order_delivered: {
                name: '🎉 Order Delivered',
                subject: 'Your order has been delivered!',
                body: 'Dear {customerName},\n\nYour order #{orderId} has been delivered successfully!\n\nWe hope you love your purchase. Please feel free to contact us if you have any questions.\n\nThank you for shopping with us!'
            },
            order_cancelled: {
                name: '❌ Order Cancelled',
                subject: 'Your order has been cancelled',
                body: 'Dear {customerName},\n\nWe regret to inform you that your order #{orderId} has been cancelled.\n\nIf you have any questions, please contact us.\n\nWe apologize for any inconvenience.'
            },
            low_stock_supplier: {
                name: '⚠️ Low Stock (Supplier)',
                subject: 'Urgent: Low stock alert',
                body: 'Hi,\n\nThis is an automated alert. The following product is running low:\n\nProduct: {productName}\nCurrent Stock: {stock} units\n\nPlease arrange a restock at your earliest convenience.'
            },
            welcome: {
                name: '👋 Welcome Message',
                subject: 'Welcome to our store!',
                body: 'Dear {customerName},\n\nWelcome! Thank you for creating an account with us.\n\nYou can now track your orders, save your address, and enjoy a faster checkout.\n\nHappy shopping!'
            },
            custom: {
                name: '✏️ Custom Message',
                subject: '',
                body: ''
            }
        };
    }

    // ─────────────────────────────────────────
    // INBOX — customer messages
    // ─────────────────────────────────────────
    renderInbox() {
        const el = document.getElementById('messageInboxList');
        if (!el) return;

        const search = (document.getElementById('messageSearchInput')?.value || '').toLowerCase();
        const filter = document.getElementById('messageFilterSelect')?.value || 'all';

        let threads = Object.entries(this.messages)
            .map(([id, m]) => ({ ...m, _id: id }))
            .sort((a, b) => (b.lastMessageAt || b.timestamp || 0) - (a.lastMessageAt || a.timestamp || 0));

        if (filter === 'unread') threads = threads.filter(t => !t.readByAdmin);
        if (filter === 'order')  threads = threads.filter(t => t.orderId);

        if (search) threads = threads.filter(t =>
            (t.customerName || '').toLowerCase().includes(search) ||
            (t.subject || '').toLowerCase().includes(search) ||
            (t.lastMessage || t.message || '').toLowerCase().includes(search)
        );

        if (threads.length === 0) {
            el.innerHTML = `<div style="text-align:center;padding:40px;color:#9ca3af">
                <div style="font-size:36px">💬</div><p>No messages yet</p></div>`;
            return;
        }

        el.innerHTML = threads.map(t => {
            const unread = !t.readByAdmin;
            const time = t.lastMessageAt || t.timestamp
                ? this.timeAgo(t.lastMessageAt || t.timestamp) : '';
            return `
            <div class="msg-thread ${unread ? 'unread' : ''} ${this.activeThread === t._id ? 'active' : ''}"
                onclick="messagingSystem.openThread('${t._id}')">
                <div class="msg-thread-avatar">${(t.customerName || '?')[0].toUpperCase()}</div>
                <div class="msg-thread-info">
                    <div class="msg-thread-header">
                        <span class="msg-thread-name">${t.customerName || 'Customer'}</span>
                        <span class="msg-thread-time">${time}</span>
                    </div>
                    ${t.orderId ? `<div style="font-size:11px;color:#8b5cf6;margin-bottom:2px">📦 Order #${t.orderId.slice(-6).toUpperCase()}</div>` : ''}
                    <div class="msg-thread-preview">${t.lastMessage || t.message || t.subject || '—'}</div>
                </div>
                ${unread ? '<div class="msg-unread-dot"></div>' : ''}
            </div>`;
        }).join('');
    }

    async openThread(threadId) {
        this.activeThread = threadId;
        const thread = this.messages[threadId];
        if (!thread) return;

        // Mark as read
        if (!thread.readByAdmin && window.firebaseDB) {
            const { ref, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            await update(ref(window.firebaseDB, `customer-messages/${threadId}`), {
                readByAdmin: true, readAt: Date.now()
            });
        }

        // Render thread panel
        const el = document.getElementById('messageThreadPanel');
        if (!el) return;

        const replies = thread.replies
            ? Object.values(thread.replies).sort((a, b) => a.timestamp - b.timestamp)
            : [];

        const messagesHtml = [
            // Original message
            `<div class="msg-bubble customer">
                <div class="msg-bubble-meta">${thread.customerName || 'Customer'} · ${this.timeAgo(thread.timestamp)}</div>
                <div class="msg-bubble-text">${thread.message || thread.subject || '—'}</div>
            </div>`,
            // Replies
            ...replies.map(r => `
            <div class="msg-bubble ${r.fromAdmin ? 'admin' : 'customer'}">
                <div class="msg-bubble-meta">${r.fromAdmin ? '👤 You (Admin)' : thread.customerName || 'Customer'} · ${this.timeAgo(r.timestamp)}</div>
                <div class="msg-bubble-text">${r.text}</div>
            </div>`)
        ].join('');

        // Order link if attached
        const orderInfo = thread.orderId ? `
            <div style="background:#ede9fe;border:1px solid #c4b5fd;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:13px">
                📦 Linked Order: <strong>#${thread.orderId.slice(-6).toUpperCase()}</strong>
                <button class="obtn obtn-primary" style="margin-left:8px;font-size:11px;padding:3px 8px"
                    onclick="messagingSystem.viewLinkedOrder('${thread.orderId}')">View Order</button>
            </div>` : '';

        el.innerHTML = `
            <div class="msg-thread-top">
                <div style="display:flex;align-items:center;gap:10px">
                    <div class="msg-thread-avatar" style="width:40px;height:40px;font-size:18px">
                        ${(thread.customerName || '?')[0].toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight:700">${thread.customerName || 'Customer'}</div>
                        <div style="font-size:12px;color:#9ca3af">${thread.customerPhone || thread.customerEmail || ''}</div>
                    </div>
                </div>
                <button class="obtn obtn-cancel" onclick="messagingSystem.deleteThread('${threadId}')">🗑️ Delete</button>
            </div>
            ${orderInfo}
            <div class="msg-bubbles" id="msgBubbles">${messagesHtml}</div>
            <div class="msg-reply-area">
                <div style="margin-bottom:8px">
                    <select id="templateSelect" onchange="messagingSystem.applyTemplate(this.value, '${threadId}')"
                        style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px">
                        <option value="">📋 Use a template...</option>
                        ${Object.entries(this.templates).map(([k, t]) =>
                            `<option value="${k}">${t.name}</option>`).join('')}
                    </select>
                </div>
                <textarea id="replyTextarea" placeholder="Type your reply..."
                    style="width:100%;min-height:90px;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;font-family:inherit;resize:vertical;outline:none"></textarea>
                <div style="display:flex;gap:8px;margin-top:8px">
                    <button class="obtn obtn-primary" style="flex:1;padding:10px"
                        onclick="messagingSystem.sendReply('${threadId}')">📨 Send Reply</button>
                    <button class="obtn" style="background:#f3f4f6;padding:10px"
                        onclick="messagingSystem.closeThread()">✕ Close</button>
                </div>
            </div>
        `;

        // Scroll to bottom
        setTimeout(() => {
            const bubbles = document.getElementById('msgBubbles');
            if (bubbles) bubbles.scrollTop = bubbles.scrollHeight;
        }, 50);

        // Highlight active thread
        this.renderInbox();
    }

    closeThread() {
        this.activeThread = null;
        const el = document.getElementById('messageThreadPanel');
        if (el) el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9ca3af;flex-direction:column;gap:12px">
            <div style="font-size:48px">💬</div>
            <p>Select a message to view</p>
        </div>`;
    }

    async sendReply(threadId) {
        const text = document.getElementById('replyTextarea')?.value?.trim();
        if (!text) return;
        if (!window.firebaseDB) return;
        const { ref, push, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");

        const reply = { text, fromAdmin: true, timestamp: Date.now() };
        await push(ref(window.firebaseDB, `customer-messages/${threadId}/replies`), reply);
        await update(ref(window.firebaseDB, `customer-messages/${threadId}`), {
            lastMessage: text, lastMessageAt: Date.now(), readByAdmin: true
        });

        document.getElementById('replyTextarea').value = '';
        this.showToast('Reply sent ✅', 'success');
        this.openThread(threadId);
    }

    async deleteThread(threadId) {
        if (!confirm('Delete this conversation? This cannot be undone.')) return;
        if (!window.firebaseDB) return;
        const { ref, remove } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        await remove(ref(window.firebaseDB, `customer-messages/${threadId}`));
        delete this.messages[threadId];
        this.closeThread();
        this.showToast('Conversation deleted', 'success');
    }

    viewLinkedOrder(orderId) {
        if (window.orderSystem) {
            window.orderSystem.viewOrder(orderId);
        }
    }

    // ─────────────────────────────────────────
    // COMPOSE NEW MESSAGE
    // ─────────────────────────────────────────
    openCompose(prefillOrderId = '', prefillCustomer = '') {
        document.getElementById('composeModal').style.display = 'flex';
        if (prefillOrderId) document.getElementById('compose_orderId').value = prefillOrderId;
        if (prefillCustomer) document.getElementById('compose_customer').value = prefillCustomer;
    }

    closeCompose() {
        document.getElementById('composeModal').style.display = 'none';
    }

    async sendNewMessage() {
        const customerName  = document.getElementById('compose_customer')?.value?.trim();
        const customerPhone = document.getElementById('compose_phone')?.value?.trim();
        const orderId       = document.getElementById('compose_orderId')?.value?.trim();
        const subject       = document.getElementById('compose_subject')?.value?.trim();
        const message       = document.getElementById('compose_body')?.value?.trim();

        if (!customerName || !message) {
            this.showToast('Customer name and message are required', 'error');
            return;
        }

        if (!window.firebaseDB) return;
        const { ref, push } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");

        const msgData = {
            customerName, customerPhone, orderId, subject, message,
            timestamp: Date.now(), lastMessage: message,
            lastMessageAt: Date.now(), fromAdmin: true, readByAdmin: true
        };

        await push(ref(window.firebaseDB, 'customer-messages'), msgData);

        // Also save to user notifications if orderId provided
        if (orderId && window.orderSystem) {
            const order = window.orderSystem.orders[orderId];
            if (order?.userId) {
                await push(ref(window.firebaseDB, `user-notifications/${order.userId}`), {
                    message, orderId, timestamp: Date.now(), read: false
                });
            }
        }

        this.closeCompose();
        this.showToast('Message sent ✅', 'success');
    }

    // ─────────────────────────────────────────
    // TEMPLATES
    // ─────────────────────────────────────────
    applyTemplate(templateKey, threadId) {
        if (!templateKey) return;
        const template = this.templates[templateKey];
        if (!template) return;

        const thread = this.messages[threadId];
        let body = template.body;

        // Replace placeholders
        if (thread) {
            body = body
                .replace(/{customerName}/g, thread.customerName || 'Customer')
                .replace(/{orderId}/g, thread.orderId || '')
                .replace(/{orderTotal}/g, '');
        }

        const textarea = document.getElementById('replyTextarea');
        if (textarea) {
            textarea.value = body;
            textarea.focus();
        }
    }

    renderTemplates() {
        const el = document.getElementById('templatesList');
        if (!el) return;
        el.innerHTML = Object.entries(this.templates).map(([key, t]) => `
            <div class="template-card">
                <div style="font-weight:600;margin-bottom:4px">${t.name}</div>
                <div style="font-size:12px;color:#6b7280;margin-bottom:8px">${t.subject || 'No subject'}</div>
                <div style="font-size:12px;color:#374151;background:#f9fafb;padding:8px;border-radius:6px;max-height:60px;overflow:hidden">
                    ${t.body?.slice(0, 120) || ''}...
                </div>
                <div style="display:flex;gap:6px;margin-top:8px">
                    <button class="obtn obtn-primary" style="flex:1;font-size:12px"
                        onclick="messagingSystem.editTemplate('${key}')">✏️ Edit</button>
                    ${!['order_confirmed','order_shipped','order_delivered','order_cancelled'].includes(key)
                        ? `<button class="obtn obtn-cancel" style="font-size:12px"
                            onclick="messagingSystem.deleteTemplate('${key}')">🗑️</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    editTemplate(key) {
        const t = this.templates[key] || { name: '', subject: '', body: '' };
        document.getElementById('templateEditKey').value   = key;
        document.getElementById('templateEditName').value  = t.name;
        document.getElementById('templateEditSubject').value = t.subject;
        document.getElementById('templateEditBody').value  = t.body;
        document.getElementById('templateEditModal').style.display = 'flex';
    }

    async saveTemplate() {
        const key     = document.getElementById('templateEditKey')?.value?.trim() ||
                        'custom_' + Date.now();
        const name    = document.getElementById('templateEditName')?.value?.trim();
        const subject = document.getElementById('templateEditSubject')?.value?.trim();
        const body    = document.getElementById('templateEditBody')?.value?.trim();
        if (!name || !body) { this.showToast('Name and body required', 'error'); return; }

        this.templates[key] = { name, subject, body };

        if (window.firebaseDB) {
            const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            await set(ref(window.firebaseDB, `message-templates/${key}`), { name, subject, body });
        }

        document.getElementById('templateEditModal').style.display = 'none';
        this.renderTemplates();
        this.showToast('Template saved ✅', 'success');
    }

    async deleteTemplate(key) {
        if (!confirm('Delete this template?')) return;
        delete this.templates[key];
        if (window.firebaseDB) {
            const { ref, remove } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            await remove(ref(window.firebaseDB, `message-templates/${key}`));
        }
        this.renderTemplates();
        this.showToast('Template deleted', 'success');
    }

    // ─────────────────────────────────────────
    // ORDER NOTIFICATIONS TAB
    // ─────────────────────────────────────────
    renderNotifications() {
        const el = document.getElementById('notificationsList');
        if (!el) return;
        const list = Object.values(this.notifications)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 50);

        if (list.length === 0) {
            el.innerHTML = `<div style="text-align:center;padding:40px;color:#9ca3af">
                <div style="font-size:36px">🔔</div><p>No notifications yet</p></div>`;
            return;
        }

        const statusColors = {
            processing: '#3b82f6', shipped: '#8b5cf6',
            delivered:  '#10b981', cancelled: '#ef4444'
        };

        el.innerHTML = list.map(n => `
            <div class="notif-row">
                <div class="notif-icon" style="background:${statusColors[n.status] || '#6b7280'}20;color:${statusColors[n.status] || '#6b7280'}">
                    ${{ processing:'⚙️', shipped:'🚚', delivered:'✅', cancelled:'❌' }[n.status] || '🔔'}
                </div>
                <div style="flex:1">
                    <div style="font-weight:600;font-size:14px">${n.customerName || 'Customer'}</div>
                    <div style="font-size:13px;color:#374151;margin:2px 0">${n.message}</div>
                    <div style="font-size:11px;color:#9ca3af">${this.timeAgo(n.timestamp)}</div>
                </div>
                ${n.orderId ? `<button class="obtn obtn-view" style="font-size:12px"
                    onclick="messagingSystem.viewLinkedOrder('${n.orderId}')">View</button>` : ''}
            </div>
        `).join('');
    }

    // ─────────────────────────────────────────
    // UNREAD BADGE
    // ─────────────────────────────────────────
    updateUnreadBadge() {
        const unread = Object.values(this.messages).filter(m => !m.readByAdmin).length;
        this.unreadCount = unread;
        const badge = document.getElementById('messageUnreadBadge');
        if (badge) {
            badge.textContent = unread;
            badge.style.display = unread > 0 ? 'inline-flex' : 'none';
        }
    }

    // ─────────────────────────────────────────
    // TAB SWITCHER
    // ─────────────────────────────────────────
    switchTab(tab) {
        ['inbox', 'notifications', 'templates'].forEach(t => {
            document.getElementById(`msgtab_${t}`)?.classList.toggle('active', t === tab);
            document.getElementById(`msgpanel_${t}`)?.style && (document.getElementById(`msgpanel_${t}`).style.display = t === tab ? 'block' : 'none');
        });
    }

    // ─────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────
    timeAgo(ts) {
        if (!ts) return '';
        const diff = Date.now() - ts;
        const m = Math.floor(diff / 60000);
        const h = Math.floor(diff / 3600000);
        const d = Math.floor(diff / 86400000);
        if (m < 1)  return 'just now';
        if (m < 60) return `${m}m ago`;
        if (h < 24) return `${h}h ago`;
        return `${d}d ago`;
    }

    showToast(msg, type = 'success') {
        const t = document.createElement('div');
        t.className = `order-toast ${type}`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.classList.add('show'), 10);
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
    }
}

window.messagingSystem = new MessagingSystem();
document.addEventListener('DOMContentLoaded', () => window.messagingSystem.init());
