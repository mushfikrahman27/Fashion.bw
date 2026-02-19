/* --- 1. CONFIGURATION & DATA --- */
const SOCIAL_CONFIG = {
    whatsappNumber: "8801601982509", 
    messengerLink: "https://m.me/mushfikurrm0927" 
};

let cartArray = [];
const productsPerPage = 10;
let currentPage = 1;
let filteredProducts = [];

const allProducts = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: i % 2 === 0 ? "Women Tote Bag" : "Premium Handbag",
    color: i % 2 === 0 ? "Black" : "Brown",
    price: "750",
    img: "tote-bag.jpeg" 
}));

/* --- 2. SEARCH FUNCTIONALITY --- */
function initSearch() {
    const searchInput = document.querySelector('.stylish-search input');
    if(!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const grid = document.getElementById('productGrid');
        const cards = Array.from(grid.getElementsByClassName('product-card'));
        const pBar = document.getElementById('paginationBar');

        if (term === "") {
            cards.forEach(card => card.style.display = 'block');
            if(pBar) pBar.style.display = 'flex';
            displayProducts(currentPage); 
            return;
        }

        if(pBar) pBar.style.display = 'none';

        const matches = [];
        cards.forEach(card => {
            const productName = card.querySelector('.p-name').innerText.toLowerCase();
            if (productName.includes(term)) {
                const score = productName.startsWith(term) ? 2 : 1;
                matches.push({ card, score });
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });

        matches.sort((a, b) => b.score - a.score);
        matches.forEach(match => grid.appendChild(match.card));
    });
}

/* --- 3. UI & CART ACTIONS (RESTORING MENU & CLEANING CART) --- */

function toggleMenu() {
    const menu = document.getElementById('menuOverlay');
    if(menu) menu.classList.toggle('active');
}

function toggleSub(btn) {
    const parent = btn.parentElement;
    parent.classList.toggle('open');
    // Change plus to minus
    const icon = btn.querySelector('.plus-icon');
    if(icon) icon.innerText = parent.classList.contains('open') ? "−" : "+";
}

function toggleCartDisplay() {
    const cartOverlay = document.getElementById('cartSerialOverlay');
    if(!cartOverlay) return;
    cartOverlay.classList.toggle('active');
    if(cartOverlay.classList.contains('active')) {
        renderSerialItems();
    }
}

/* --- THE ADD TO CART SYSTEM (RESTORED & FIXED) --- */
function addToCart(id) {
    const product = allProducts.find(p => p.id === id);
    const btn = document.querySelector(`button[onclick="addToCart(${id})"]`);
    
    // 1. Button Feedback
    if (btn) {
        const oldText = btn.innerText; 
        btn.innerText = "Added! ✓"; 
        btn.style.background = "#22c55e"; 
        btn.style.color = "white";
        setTimeout(() => { 
            btn.innerText = oldText; 
            btn.style.background = ""; 
            btn.style.color = ""; 
        }, 1500);
    }

    // 2. Size Logic (Looking for your active class)
    const size = document.querySelector(`#sizes-prod-${id} span.active`)?.innerText || "Not Specified";
    
    // 3. Add to Array
    cartArray.push({...product, selectedSize: size});
    
    // 4. Update Navbar Count
    const countLabel = document.getElementById('navbarCartCount');
    if(countLabel) countLabel.innerText = cartArray.length;

    // 5. BOUNCE THE NAV CART ICON
    const cartIcon = document.querySelector('.cart-glass');
    if(cartIcon) {
        cartIcon.classList.add('cart-bounce-active');
        setTimeout(() => cartIcon.classList.remove('cart-bounce-active'), 400);
    }
}

function removeItem(index) {
    cartArray.splice(index, 1);
    const countLabel = document.getElementById('navbarCartCount');
    if(countLabel) countLabel.innerText = cartArray.length;
    renderSerialItems();
}

/* --- RENDER CART (Single Aesthetic Header & Thumbnails) --- */
function renderSerialItems() {
    const container = document.getElementById('serialItemList');
    if(!container) return;
    
    // Only One Aesthetic Header - Uses your CSS classes
    const headerHtml = `
        <div class="cart-header-cool">
            <span>YOUR SELECTION (${cartArray.length})</span>
            <button class="cool-close-btn" onclick="toggleCartDisplay()">
                <div class="close-icon-line"></div>
            </button>
        </div>`;
    
    if (cartArray.length === 0) {
        container.innerHTML = `${headerHtml}
            <div class="empty-cart-ui">
                <p style="color:#94a3b8;">Your bag is empty</p>
            </div>`;
        return;
    }

    const total = cartArray.reduce((sum, item) => sum + parseInt(item.price), 0);
    
    // Items List
    let itemsHtml = cartArray.map((item, index) => `
        <div class="serial-item-card">
            <img src="${item.img}" onerror="this.src='https://via.placeholder.com/55x65'">
            <div class="serial-item-details">
                <p><strong>${item.name}</strong></p>
                <p style="font-size:0.75rem; color:#64748b;">Size: ${item.selectedSize} | TK ${item.price}</p>
            </div>
            <button class="remove-item-btn" onclick="removeItem(${index})">✕</button>
        </div>`).join('');

    // Footer
    const footerHtml = `
        <div class="cart-checkout-footer">
            <div class="cart-total-row">
                <span>Total:</span>
                <span>TK ${total}</span>
            </div>
            <button class="checkout-buy-btn" onclick="processCartCheckout()">Buy Now</button>
        </div>`;

    container.innerHTML = headerHtml + '<div style="flex:1; overflow-y:auto;">' + itemsHtml + '</div>' + footerHtml;
}

/* --- 4. BUY NOW & REDIRECTION --- */
function openOrderOptions(fullMessage) {
    const encodedMsg = encodeURIComponent(fullMessage);
    const modalHtml = `
        <div id="orderModal" class="social-modal-overlay">
            <div class="social-modal-content">
                <h3>Order via</h3>
                <div class="social-options">
                    <a href="https://api.whatsapp.com/send?phone=${SOCIAL_CONFIG.whatsappNumber}&text=${encodedMsg}" target="_blank" class="social-opt wa">WhatsApp</a>
                    <a href="${SOCIAL_CONFIG.messengerLink}" target="_blank" class="social-opt fb">Messenger</a>
                </div>
                <button onclick="closeOrderModal()" class="close-modal-btn">Cancel</button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeOrderModal() { const modal = document.getElementById('orderModal'); if(modal) modal.remove(); }

function handleSingleBuy(card) {
    const name = card.querySelector('.p-name').innerText;
    const price = card.querySelector('.p-price').innerText.replace('TK-', '');
    const color = card.querySelector('.p-meta').innerText.replace('Color: ', '');
    const sizeElem = card.querySelector('.size-options span.active');
    const size = sizeElem ? sizeElem.innerText : "Not Specified";
    openOrderOptions(`Hello! I want to Buy: ${name} (Size: ${size}, Color: ${color}), Total Price: TK ${price}`);
}

function processCartCheckout() {
    if (cartArray.length === 0) return;
    const total = cartArray.reduce((sum, item) => sum + parseInt(item.price), 0);
    const details = cartArray.map(i => `${i.name} (Size: ${i.selectedSize}, Color: ${i.color})`).join(', ');
    openOrderOptions(`Hello! I want to Buy: ${details}, Total Price: TK ${total}`);
}

document.addEventListener('click', (e) => {
    if(e.target && e.target.classList.contains('ready')) handleSingleBuy(e.target.closest('.product-card'));
});

/* --- 5. PRODUCT RENDERING --- */
function renderSingleCard(container, p) {
    const uniqueId = `prod-${p.id}`;
    container.innerHTML += `
        <div class="product-card">
            <div class="product-img-holder"><img src="${p.img}" onerror="this.src='https://via.placeholder.com/400x500'"></div>
            <div class="product-details">
                <h3 class="p-name">${p.name}</h3>
                <p class="p-meta">Color: ${p.color}</p>
                <p class="p-price">TK-${p.price}</p>
                <div class="size-container">
                    <label class="size-label">Select Size:</label>
                    <div class="size-options" id="sizes-${uniqueId}">
                        <span onclick="selectSize('${uniqueId}', this)">S</span>
                        <span onclick="selectSize('${uniqueId}', this)">M</span>
                        <span onclick="selectSize('${uniqueId}', this)">L</span>
                        <span onclick="selectSize('${uniqueId}', this)">XL</span>
                    </div>
                </div>
                <div class="button-group">
                    <button class="action-btn buy-btn" id="btn-${uniqueId}" disabled>Choose Size</button>
                    <button class="action-btn cart-btn" onclick="addToCart(${p.id})">Add to Cart</button>
                </div>
            </div>
        </div>`;
}

function selectSize(prodId, element) {
    const options = document.querySelectorAll(`#sizes-${prodId} span`);
    options.forEach(opt => opt.classList.remove('active'));
    element.classList.add('active');
    const btn = document.getElementById(`btn-${prodId}`);
    btn.innerText = "Buy Now";
    btn.classList.add('ready');
    btn.disabled = false;
}

function displayProducts(page) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    grid.innerHTML = "";
    const items = allProducts.slice((page - 1) * productsPerPage, page * productsPerPage);
    items.forEach(p => renderSingleCard(grid, p));
    updatePagination();
}

function updatePagination() {
    const pBar = document.getElementById('paginationBar');
    if(!pBar) return;
    const totalPages = Math.ceil(allProducts.length / productsPerPage);
    pBar.innerHTML = "";
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.innerText = i;
        btn.className = `page-num ${i === currentPage ? 'active' : ''}`;
        btn.onclick = () => { currentPage = i; displayProducts(i); window.scrollTo({top:0, behavior:'smooth'}); };
        pBar.appendChild(btn);
    }
}

/* --- INITIAL RUN --- */
displayProducts(1);
initSearch();