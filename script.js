/* --- 1. CONFIGURATION & DATA --- */
const SOCIAL_CONFIG = {
    whatsappNumber: "8801601982509", // Updated with your provided number
    messengerLink: "https://m.me/mushfikurrm0927" // Updated with your specific FB username link
};

let cartArray = [];
const productsPerPage = 10;
let currentPage = 1;

const allProducts = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: "Women Tote Bag",
    color: "Black",
    price: "750",
    img: "tote-bag.jpeg" 
}));

/* --- 2. MENU & CART UI ACTIONS --- */
function toggleMenu() { 
    document.getElementById('menuOverlay').classList.toggle('active'); 
}

function toggleSub(btn) { 
    btn.parentElement.classList.toggle('open'); 
}

function toggleCartDisplay() {
    const cartOverlay = document.getElementById('cartSerialOverlay');
    cartOverlay.classList.toggle('active');
    if(cartOverlay.classList.contains('active')) {
        renderSerialItems();
    }
}

/* --- 3. CART LOGIC --- */
function addToCart(id) {
    const product = allProducts.find(p => p.id === id);
    cartArray.push(product);
    document.getElementById('navbarCartCount').innerText = cartArray.length;
}

function removeItem(index) {
    cartArray.splice(index, 1);
    document.getElementById('navbarCartCount').innerText = cartArray.length;
    renderSerialItems();
}

function renderSerialItems() {
    const listContainer = document.getElementById('serialItemList');
    
    if (cartArray.length === 0) {
        listContainer.innerHTML = "<p style='text-align:center; padding-top:20px;'>Your cart is empty.</p>";
        return;
    }

    const total = cartArray.reduce((sum, item) => sum + parseInt(item.price), 0);

    let html = cartArray.map((item, index) => `
        <div class="serial-item-card">
            <img src="${item.img}" onerror="this.src='https://via.placeholder.com/60x70'">
            <div class="serial-item-details">
                <p><strong>${item.name}</strong></p>
                <p>TK ${item.price}</p>
            </div>
            <button class="remove-item-btn" onclick="removeItem(${index})">✕</button>
        </div>
    `).join('');

    html += `
        <div class="cart-checkout-footer">
            <div class="cart-total-row">
                <span>Total:</span>
                <span>TK ${total}</span>
            </div>
            <button class="checkout-buy-btn" onclick="processCartCheckout()">Buy Now</button>
        </div>
    `;

    listContainer.innerHTML = html;
}

/* --- 4. BUY NOW & DEEP-LINK REDIRECTION --- */

function openOrderOptions(productName, productPrice) {
    const message = `Hello! I want to buy: ${productName} (Total Price: TK ${productPrice})`;
    const encodedMsg = encodeURIComponent(message);

    // Using WhatsApp API for direct app triggering
    const whatsappURL = `https://api.whatsapp.com/send?phone=${SOCIAL_CONFIG.whatsappNumber}&text=${encodedMsg}`;
    // Using m.me for direct Messenger app triggering
    const messengerURL = SOCIAL_CONFIG.messengerLink;

    const modalHtml = `
        <div id="orderModal" class="social-modal-overlay">
            <div class="social-modal-content">
                <h3>Order via</h3>
                <div class="social-options">
                    <a href="${whatsappURL}" target="_blank" class="social-opt wa">
                        WhatsApp
                    </a>
                    <a href="${messengerURL}" target="_blank" class="social-opt fb">
                        Messenger
                    </a>
                </div>
                <button onclick="closeOrderModal()" class="close-modal-btn">Cancel</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if(modal) modal.remove();
}

function processCartCheckout() {
    if (cartArray.length === 0) return;
    const total = cartArray.reduce((sum, item) => sum + parseInt(item.price), 0);
    // Combines all selected products into one string for the chat message
    const itemNames = cartArray.map(i => i.name).join(', ');
    openOrderOptions(`Multiple Items: [${itemNames}]`, total);
}

document.addEventListener('click', function(e) {
    if(e.target && e.target.classList.contains('ready')) {
        const card = e.target.closest('.product-details');
        const name = card.querySelector('.p-name').innerText;
        const price = card.querySelector('.p-price').innerText.replace('TK-', '');
        openOrderOptions(name, price);
    }
});

/* --- 5. PRODUCT DISPLAY & SIZE LOGIC --- */
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
    const start = (page - 1) * productsPerPage;
    const end = start + productsPerPage;
    const items = allProducts.slice(start, end);

    items.forEach((p) => {
        const uniqueId = `prod-${p.id}`;
        grid.innerHTML += `
            <div class="product-card">
                <div class="product-img-holder">
                    <img src="${p.img}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/400x500'">
                </div>
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
            </div>
        `;
    });
    updatePagination();
}

/* --- 6. PAGINATION LOGIC --- */
function updatePagination() {
    const pBar = document.getElementById('paginationBar');
    const totalPages = Math.ceil(allProducts.length / productsPerPage);
    pBar.innerHTML = "";
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.innerText = i;
        btn.className = `page-num ${i === currentPage ? 'active' : ''}`;
        btn.onclick = () => { 
            currentPage = i; 
            displayProducts(i); 
            window.scrollTo({top:0, behavior:'smooth'}); 
        };
        pBar.appendChild(btn);
    }
}

displayProducts(1);