document.addEventListener('DOMContentLoaded', () => {
    // Dynamic greeting based on time
    const updateGreeting = () => {
        const hour = new Date().getHours();
        const greetingElement = document.getElementById('timeContext');

        if (hour >= 5 && hour < 12) greetingElement.textContent = 'Good morning,';
        else if (hour >= 12 && hour < 18) greetingElement.textContent = 'Good afternoon,';
        else greetingElement.textContent = 'Good evening,';
    };

    updateGreeting();

    // Subtle entrance animations for cards
    const cards = document.querySelectorAll('.clarity-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        setTimeout(() => {
            card.style.opacity = '1';
        }, 300 + (index * 150));
    });

    // Navigation interaction
    const navItems = document.querySelectorAll('.nav-item:not(#navAdd)');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Haptic feedack simulation
            item.style.transform = 'scale(0.95)';
            setTimeout(() => item.style.transform = '', 100);
        });
    });

    // Add button interaction
    const addBtn = document.querySelector('.add-button');
    addBtn.addEventListener('click', () => {
        const modal = document.querySelector('.transaction-modal');
        if (modal) {
            modal.classList.add('active');
        } else {
            // Create modal if it doesn't exist
            createTransactionModal();
        }
    });
});

/* --- FINANCE CRUD (COMMIT I) --- */
const FINANCE_STORAGE_KEY = 'policia_finance_data';

// Initialize finance data
let financeData = {
    transactions: [],
    balance: 0,
    monthlyLimit: 50000
};

// Load data from localStorage
function loadFinanceData() {
    const saved = localStorage.getItem(FINANCE_STORAGE_KEY);
    if (saved) {
        try {
            financeData = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load finance data:', e);
        }
    }
    updateFinanceUI();
}

// Save data to localStorage
function saveFinanceData() {
    localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(financeData));
}

// Add transaction
function addTransaction(type, amount, description, category) {
    const transaction = {
        id: Date.now(),
        type, // 'income' or 'expense'
        amount: parseFloat(amount),
        description,
        category,
        date: new Date().toISOString(),
        timestamp: Date.now()
    };
    
    financeData.transactions.unshift(transaction);
    
    // Update balance
    if (type === 'income') {
        financeData.balance += amount;
    } else {
        financeData.balance -= amount;
    }
    
    saveFinanceData();
    updateFinanceUI();
    showFinanceToast(`${type === 'income' ? 'Income' : 'Expense'} of ৳${amount} added`);
}

// Delete transaction
function deleteTransaction(id) {
    const transaction = financeData.transactions.find(t => t.id === id);
    if (transaction) {
        // Reverse the balance change
        if (transaction.type === 'income') {
            financeData.balance -= transaction.amount;
        } else {
            financeData.balance += transaction.amount;
        }
        
        financeData.transactions = financeData.transactions.filter(t => t.id !== id);
        saveFinanceData();
        updateFinanceUI();
        showFinanceToast('Transaction deleted');
    }
}

// Update monthly limit
function updateMonthlyLimit(newLimit) {
    financeData.monthlyLimit = parseFloat(newLimit);
    saveFinanceData();
    updateFinanceUI();
}

// Get monthly expenses
function getMonthlyExpenses() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return financeData.transactions
        .filter(t => {
            const tDate = new Date(t.date);
            return t.type === 'expense' && 
                   tDate.getMonth() === currentMonth && 
                   tDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);
}

// Update UI
function updateFinanceUI() {
    // Update balance display
    const balanceEl = document.querySelector('.balance-amount');
    if (balanceEl) {
        balanceEl.textContent = `৳${financeData.balance.toLocaleString()}`;
    }
    
    // Update monthly limit
    const limitEl = document.querySelector('.limit-amount');
    if (limitEl) {
        limitEl.textContent = `৳${financeData.monthlyLimit.toLocaleString()}`;
    }
    
    // Update monthly spent
    const monthlySpent = getMonthlyExpenses();
    const spentEl = document.querySelector('.spent-amount');
    if (spentEl) {
        spentEl.textContent = `৳${monthlySpent.toLocaleString()} spent`;
    }
    
    // Update progress bar
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        const percentage = Math.min((monthlySpent / financeData.monthlyLimit) * 100, 100);
        progressFill.style.width = `${percentage}%`;
    }
    
    // Update remaining amount
    const remaining = financeData.monthlyLimit - monthlySpent;
    const remainingEl = document.querySelector('.card-sub-info span:last-child');
    if (remainingEl && remaining >= 0) {
        remainingEl.textContent = `৳${remaining.toLocaleString()} remaining`;
    }
    
    // Render transactions
    renderTransactions();
}

// Render transactions
function renderTransactions() {
    const container = document.querySelector('.transactions-list');
    if (!container) return;
    
    const transactions = financeData.transactions.slice(0, 20); // Show last 20
    
    if (transactions.length === 0) {
        container.innerHTML = '<p class="no-transactions">No transactions yet</p>';
        return;
    }
    
    container.innerHTML = transactions.map(t => `
        <div class="transaction-item ${t.type}">
            <div class="transaction-info">
                <div class="transaction-desc">${t.description}</div>
                <div class="transaction-meta">${t.category} • ${new Date(t.date).toLocaleDateString()}</div>
            </div>
            <div class="transaction-amount ${t.type}">
                ${t.type === 'income' ? '+' : '-'}৳${t.amount.toLocaleString()}
            </div>
            <button class="delete-transaction" onclick="deleteTransaction(${t.id})">×</button>
        </div>
    `).join('');
}

// Show toast notification
function showFinanceToast(message) {
    const toast = document.createElement('div');
    toast.className = 'finance-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Handle add transaction form
function setupTransactionForm() {
    const form = document.getElementById('transactionForm');
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const type = document.querySelector('input[name="type"]:checked').value;
        const amount = document.querySelector('input[name="amount"]').value;
        const description = document.querySelector('input[name="description"]').value;
        const category = document.querySelector('select[name="category"]').value;
        
        if (amount && description) {
            addTransaction(type, parseFloat(amount), description, category);
            form.reset();
            
            // Close modal if exists
            const modal = document.querySelector('.transaction-modal');
            if (modal) modal.classList.remove('active');
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadFinanceData();
    setupTransactionForm();
});

// Create transaction modal dynamically
function createTransactionModal() {
    const modalHtml = `
        <div class="transaction-modal">
            <div class="transaction-modal-content">
                <form class="transaction-form" id="transactionForm">
                    <h3>Add Transaction</h3>
                    
                    <div class="radio-group">
                        <label class="radio-option">
                            <input type="radio" name="type" value="income" checked>
                            <span>Income</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="type" value="expense">
                            <span>Expense</span>
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label for="amount">Amount (৳)</label>
                        <input type="number" name="amount" id="amount" required step="0.01" min="0">
                    </div>
                    
                    <div class="form-group">
                        <label for="description">Description</label>
                        <input type="text" name="description" id="description" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="category">Category</label>
                        <select name="category" id="category" required>
                            <option value="">Select category</option>
                            <option value="Food">Food</option>
                            <option value="Transport">Transport</option>
                            <option value="Shopping">Shopping</option>
                            <option value="Entertainment">Entertainment</option>
                            <option value="Bills">Bills</option>
                            <option value="Salary">Salary</option>
                            <option value="Business">Business</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    
                    <div class="form-buttons">
                        <button type="button" class="btn-secondary" onclick="closeTransactionModal()">Cancel</button>
                        <button type="submit" class="btn-primary">Add Transaction</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Add close on backdrop click
    const modal = document.querySelector('.transaction-modal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeTransactionModal();
        }
    });
}

// Close transaction modal
function closeTransactionModal() {
    const modal = document.querySelector('.transaction-modal');
    if (modal) {
        modal.classList.remove('active');
        // Reset form
        const form = document.getElementById('transactionForm');
        if (form) form.reset();
    }
}
