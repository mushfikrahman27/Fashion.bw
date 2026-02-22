/* --- 1. CONFIGURATION & UPDATED DATA --- */
const SOCIAL_CONFIG = {
    whatsappNumber: "8801601982509", 
    messengerLink: "https://m.me/mushfikurrm0927" 
};

let cartArray = [];
const productsPerPage = window.innerWidth <= 768 ? 10 : 12;
let currentPage = 1;

// INITIAL DATA: Eikhane tumi category wise product add korbe
/* --- DYNAMIC PRODUCT DATA --- */
const allProducts = [
    // WOMEN CATEGORY
    { id: 1, name: "Luxury Tote Bag", price: "750", color: "Black", img: "bag1.jpg", category: "Women", subCategory: "Bags",img: "images/tote-bag.jpeg" },
    { id: 2, name: "Premium Handbag", price: "950", color: "Brown", img: "bag2.jpg", category: "Women", subCategory: "Bags",  img: "images/pic-2.jpg"},
    { id: 6, name: "Elegant Shoulder Bag", price: "820", color: "Beige", img: "bag3.jpg", category: "Women", subCategory: "Bags",img: "images/pic-3.jpg" },
    { id: 7, name: "Mini Party Clutch", price: "640", color: "Gold", img: "bag4.jpg", category: "Women", subCategory: "Bags",img: "images/pic-4.jpg" },
    { id: 8, name: "Casual Canvas Bag", price: "520", color: "Cream", img: "bag5.jpg", category: "Women", subCategory: "Bags" ,img: "images/pic-5.jpeg"},

    { id: 9, name: "Premium Abaya", price: "1400", color: "Pink", img: "dress1.jpg", category: "Women", subCategory: "Dress",img: "images/pic-6.jpg" },
    { id: 10, name: "premium borkha", price: "2600", color: "Maroon", img: "dress2.jpg", category: "Women", subCategory: "Dress",img: "images/pic-7.jpg" },
    { id: 11, name: "Casual Women Watch", price: "980", color: "Sky Blue", img: "dress3.jpg", category: "Women", subCategory: "Dress",img: "images/pic-8.webp" },

    // MEN CATEGORY
    { id: 3, name: "Urban Street Sneaker", price: "1800", color: "White/Grey", img: "sneaker1.jpg", category: "Men", subCategory: "Sneakers",img: "images/pic-9.webp" },
    { id: 4, name: "Classic Sport Sneaker", price: "2200", color: "Blue", img: "sneaker2.jpg", category: "Men", subCategory: "Sneakers",img: "images/pic-10.jpg" },
    { id: 12, name: "Running Pro Sneaker", price: "1950", color: "Black/Red", img: "sneaker3.jpg", category: "Men", subCategory: "Sneakers",img: "images/pic-11.jpg" },
    { id: 13, name: "Minimal White Sneaker", price: "1750", color: "White", img: "sneaker4.jpg", category: "Men", subCategory: "Sneakers",img: "images/pic-12.webp" },

    { id: 14, name: "Formal Leather Shoe", price: "2600", color: "Dark Brown", img: "shoe1.jpg", category: "Men", subCategory: "Shoes",img: "images/pic-13.jpg"  },
    { id: 15, name: "Office Classic Shoe", price: "2400", color: "Black", img: "shoe2.jpg", category: "Men", subCategory: "Shoes",img: "images/pic-14.jpg"  },

    { id: 16, name: "Slim Fit Shirt", price: "1200", color: "White", img: "shirt1.jpg", category: "Men", subCategory: "Shirt" ,img: "images/pic-15.webp" },
    { id: 17, name: "Casual Check Shirt", price: "980", color: "Green", img: "shirt2.jpg", category: "Men", subCategory: "Shirt",img: "images/pic-15.webp"  },
    { id: 18, name: "Denim Casual Shirt", price: "1450", color: "Blue", img: "shirt3.jpg", category: "Men", subCategory: "Shirt" ,img: "images/pic-15.webp" },

    // COLLECTION CATEGORY
    { id: 5, name: "Dark Aviator", price: "1200", color: "Silver", img: "glass1.jpg", category: "Men", subCategory: "Sunglasses",img: "images/pic-16.webp"  },
    { id: 19, name: "Retro Round Glass", price: "1350", color: "Black", img: "glass2.jpg", category: "Men", subCategory: "Sunglasses",img: "images/pic-16.webp"  },
    { id: 20, name: "Luxury Gold Frame", price: "1650", color: "Gold", img: "glass3.jpg", category: "Men", subCategory: "Sunglasses" ,img: "images/pic-16.webp" },

    { id: 21, name: "Smart Analog Watch", price: "3200", color: "Silver", img: "watch1.jpg", category: "Collection", subCategory: "Watches",img: "images/pic-17.png"  },
    { id: 22, name: "Leather Strap Watch", price: "2850", color: "Brown", img: "watch2.jpg", category: "Collection", subCategory: "Watches",img: "images/pic-17.png" },
    { id: 23, name: "Modern Black Watch", price: "3100", color: "Black", img: "watch3.jpg", category: "Collection", subCategory: "Watches",img: "images/pic-17.png" },

    // ACCESSORIES
    { id: 24, name: "Classic Leather Belt", price: "850", color: "Brown", img: "belt1.jpg", category: "Collection", subCategory: "Belts" ,img: "images/pic-18.jpg"},
    { id: 25, name: "Minimal Black Belt", price: "780", color: "Black", img: "belt2.jpg", category: "Collection", subCategory: "Belts",img: "images/pic-18.jpg" },

    { id: 26, name: "Travel Backpack", price: "2100", color: "Grey", img: "bag6.jpg", category: "Men", subCategory: "Bags", img: "images/pic-19.jpg"},
    { id: 27, name: "Office Laptop Bag", price: "2350", color: "Black", img: "bag7.jpg", category: "Men", subCategory: "Bags", img: "images/pic-19.jpg"},

    { id: 28, name: "Women Fashion Sandal", price: "1450", color: "Beige", img: "sandal1.jpg", category: "Women", subCategory: "Shoes", img: "images/pic-20.jpg"},
    { id: 29, name: "Elegant Heel Sandal", price: "1750", color: "Black", img: "sandal2.jpg", category: "Women", subCategory: "Shoes" ,img: "images/pic-20.jpg"},

    { id: 30, name: "Sports Cap", price: "420", color: "Navy", img: "cap1.jpg", category: "Collection", subCategory: "Caps" },
    { id: 31, name: "Urban Snapback Cap", price: "520", color: "Black", img: "cap2.jpg", category: "Collection", subCategory: "Caps" },

    { id: 32, name: "Winter Hoodie", price: "1850", color: "Charcoal", img: "hoodie1.jpg", category: "Men", subCategory: "Hoodie" },
    { id: 33, name: "Casual Zip Hoodie", price: "1950", color: "Olive", img: "hoodie2.jpg", category: "Men", subCategory: "Hoodie" },

    { id: 34, name: "Women Knit Sweater", price: "1680", color: "Cream", img: "sweater1.jpg", category: "Women", subCategory: "Sweater" },
    { id: 35, name: "Soft Wool Cardigan", price: "1780", color: "Lavender", img: "sweater2.jpg", category: "Women", subCategory: "Sweater" },

    { id: 36, name: "Premium Wallet", price: "980", color: "Dark Brown", img: "wallet1.jpg", category: "Collection", subCategory: "Wallet" },
    { id: 37, name: "Compact Card Holder", price: "620", color: "Black", img: "wallet2.jpg", category: "Collection", subCategory: "Wallet" },

    { id: 38, name: "Travel Duffel Bag", price: "2600", color: "Army Green", img: "bag8.jpg", category: "Men", subCategory: "Bags" },
    { id: 39, name: "Luxury Party Purse", price: "1450", color: "Rose Gold", img: "bag9.jpg", category: "Women", subCategory: "Bags" },

    { id: 40, name: "Classic Polo T-Shirt", price: "920", color: "White", img: "tshirt1.jpg", category: "Men", subCategory: "Tshirt" },
    { id: 41, name: "Graphic Street Tee", price: "880", color: "Black", img: "tshirt2.jpg", category: "Men", subCategory: "Tshirt" },

    { id: 42, name: "Women Basic Tee", price: "760", color: "Peach", img: "tshirt3.jpg", category: "Women", subCategory: "Tshirt" },
    { id: 43, name: "Oversized Street Tee", price: "990", color: "Grey", img: "tshirt4.jpg", category: "Women", subCategory: "Tshirt" },

    { id: 44, name: "Running Shorts", price: "720", color: "Black", img: "short1.jpg", category: "Men", subCategory: "Shorts" },
    { id: 45, name: "Casual Cotton Shorts", price: "680", color: "Khaki", img: "short2.jpg", category: "Men", subCategory: "Shorts" },

    { id: 46, name: "Yoga Leggings", price: "1100", color: "Black", img: "legging1.jpg", category: "Women", subCategory: "Leggings" },
    { id: 47, name: "Active Sports Leggings", price: "1250", color: "Purple", img: "legging2.jpg", category: "Women", subCategory: "Leggings" },

    { id: 48, name: "Winter Scarf", price: "520", color: "Maroon", img: "scarf1.jpg", category: "Collection", subCategory: "Winter" },
    { id: 49, name: "Knitted Gloves", price: "480", color: "Grey", img: "glove1.jpg", category: "Collection", subCategory: "Winter" },

    { id: 50, name: "Premium Travel Suitcase", price: "5400", color: "Black", img: "case1.jpg", category: "Collection", subCategory: "Travel" }
];

// Default filtered list
let filteredProducts = [...allProducts];
/* --- 2. SEARCH FUNCTIONALITY --- */
function initSearch() {
    const searchInput = document.querySelector('.stylish-search input');
    const suggestBox = document.getElementById('searchSuggestions');
    const clearBtn = document.getElementById('clearSearchBtn'); 
    
    if(!searchInput) return;

    if(clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = ""; 
            if(suggestBox) {
                suggestBox.innerHTML = "";
                suggestBox.style.display = 'none';
            }
            searchInput.dispatchEvent(new Event('input'));
            searchInput.focus();
        });
    }

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const grid = document.getElementById('productGrid');
        const cards = Array.from(grid.getElementsByClassName('product-card'));
        const pBar = document.getElementById('paginationBar');

        if (term.length < 1) {
            if(suggestBox) {
                suggestBox.innerHTML = ""; 
                suggestBox.style.display = 'none'; 
            }
        } else {
            const matches = allProducts.filter(p => p.name.toLowerCase().includes(term)).slice(0, 5);
            if(matches.length > 0 && suggestBox) {
                suggestBox.innerHTML = matches.map(p => `
                    <div class="suggest-item" onclick="quickView(${p.id})">
                        <img src="${p.img}" onerror="this.src='https://via.placeholder.com/400x500'">
                        <span style="font-size:0.8rem; font-weight:600;">${p.name}</span>
                    </div>
                `).join('');
                suggestBox.style.display = 'block';
            } else if (suggestBox) {
                suggestBox.style.display = 'none';
            }
        }

        if (term === "") {
            cards.forEach(card => card.style.display = 'block');
            if(pBar) pBar.style.display = 'flex';
            displayProducts(currentPage); 
            return;
        }

        if(pBar) pBar.style.display = 'none';

        const gridMatches = [];
        cards.forEach(card => {
            const productName = card.querySelector('.p-name').innerText.toLowerCase();
            if (productName.includes(term)) {
                const score = productName.startsWith(term) ? 2 : 1;
                gridMatches.push({ card, score });
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });

        gridMatches.sort((a, b) => b.score - a.score);
        gridMatches.forEach(match => grid.appendChild(match.card));
    });

    document.addEventListener('click', (e) => {
        if (suggestBox && !e.target.closest('.stylish-search')) suggestBox.style.display = 'none';
    });
}

/* --- 3. UI & CART ACTIONS --- */
function toggleMenu() {
    const menu = document.getElementById('menuOverlay');
    if(menu) menu.classList.toggle('active');
}

function toggleSub(btn) {
    const parent = btn.parentElement;
    // CSS e jodi .active use kora thake, tobe active use koro
    parent.classList.toggle('active'); 
    parent.classList.toggle('open'); 
    
    const icon = btn.querySelector('.plus-icon');
    if(icon) {
        // Luxury look er jonno minus sign (−) use kora hoyeche
        icon.innerText = (parent.classList.contains('active') || parent.classList.contains('open')) ? "−" : "+";
    }
}

function toggleCartDisplay() {
    const cartOverlay = document.getElementById('cartSerialOverlay');
    if (!cartOverlay) return;
    const isActive = cartOverlay.classList.toggle('active');
    document.body.style.overflow = isActive ? 'hidden' : '';
    if (isActive) renderSerialItems();
}

/* --- 4. THE ADD TO CART SYSTEM --- */
function addToCart(id) {
    const product = allProducts.find(p => p.id === id);
    const btn = document.querySelector(`button[onclick="addToCart(${id})"]`);
    
    if (btn) {
        const oldText = btn.innerText; 
        btn.innerText = "Added! ✓"; 
        btn.style.background = "#22c55e"; 
        setTimeout(() => { 
            btn.innerText = oldText; 
            btn.style.background = ""; 
        }, 1500);
    }

    const size = document.querySelector(`#sizes-prod-${id} span.active`)?.innerText || "Not Specified";
    cartArray.push({...product, selectedSize: size});
    
    const countLabel = document.getElementById('navbarCartCount');
    if(countLabel) countLabel.innerText = cartArray.length;

    const cartIcon = document.querySelector('.cart-glass');
    if(cartIcon) {
        cartIcon.classList.add('cart-bounce-active');
        setTimeout(() => cartIcon.classList.remove('cart-bounce-active'), 400);
    }
    showToast(product.name);
}

/* --- 5. HERO & NOTIFICATIONS --- */
window.addEventListener('scroll', function() {
    const heroBg = document.querySelector('.hero-bg-image');
    if (heroBg) {
        let scrollOffset = window.pageYOffset;
        heroBg.style.transform = `translateY(${scrollOffset * 0.5}px)`;
    }
});

function showToast(productName) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <div class="toast-content">
            <p>Added <span>${productName}</span> to your bag!</p>
        </div>
        <button class="toast-view-btn" onclick="toggleCartDisplay()">View Cart</button>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('active'), 10);
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

function removeItem(index) {
    cartArray.splice(index, 1);
    const countLabel = document.getElementById('navbarCartCount');
    if(countLabel) countLabel.innerText = cartArray.length;
    renderSerialItems();
}

/* --- 6. RENDER CART --- */
function renderSerialItems() {
    const container = document.getElementById('serialItemList');
    if(!container) return;

    const headerHtml = `
        <div class="cart-header-cool">
            <span>YOUR SELECTION (${cartArray.length})</span>
            <button class="cool-close-btn" onclick="toggleCartDisplay()">
                <div class="close-icon-line"></div>
            </button>
        </div>`;

    if (cartArray.length === 0) {
        container.innerHTML = headerHtml + `<div class="empty-cart-ui"><p>Your bag is empty</p></div>`;
        return;
    }

    const total = cartArray.reduce((sum, item) => sum + parseInt(item.price), 0);
    const itemsHtml = cartArray.map((item, index) => `
        <div class="serial-item-card">
            <img src="${item.img}" onerror="this.src='https://via.placeholder.com/55x65'">
            <div class="serial-item-details">
                <p><strong>${item.name}</strong></p>
                <p style="font-size:0.75rem;">Size: ${item.selectedSize} | TK ${item.price}</p>
            </div>
            <button class="remove-item-btn" onclick="removeItem(${index})">✕</button>
        </div>`).join('');

    container.innerHTML = headerHtml + `
        <div style="flex: 1; overflow-y: auto; max-height: calc(80vh - 60px);">${itemsHtml}</div>
        <div class="cart-checkout-footer">
            <div class="cart-total-row"><span>Total:</span><span>TK ${total}</span></div>
            <button class="checkout-buy-btn" onclick="processCartCheckout()">Buy Now</button>
        </div>`;
}

/* --- 7. ORDER LOGIC --- */
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

function closeOrderModal() { document.getElementById('orderModal')?.remove(); }

function handleSingleBuy(card) {
    const name = card.querySelector('.p-name').innerText;
    const price = card.querySelector('.p-price').innerText.replace('TK-', '');
    const color = card.querySelector('.p-meta').innerText.replace('Color: ', '');
    const size = card.querySelector('.size-options span.active')?.innerText || "Not Specified";
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

/* --- 8. PRODUCT RENDERING & PAGINATION --- */
function renderSingleCard(container, p) {
    const uniqueId = `prod-${p.id}`;
    container.innerHTML += `
        <div class="product-card">
            <div class="product-img-holder skeleton">
                <img src="${p.img}" onload="this.parentElement.classList.remove('skeleton')" onerror="this.src='https://via.placeholder.com/400x500'">
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
    
    const start = (page - 1) * productsPerPage;
    const end = start + productsPerPage;
    const itemsToShow = filteredProducts.slice(start, end);
    
    if (itemsToShow.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--muted-foreground); padding: 40px;">No products found in this category.</p>`;
    } else {
        itemsToShow.forEach(p => renderSingleCard(grid, p));
    }
    
    updatePagination();
}

function updatePagination() {
    const pBar = document.getElementById('paginationBar');
    if(!pBar) return;
    
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    pBar.innerHTML = "";

    // Jodio 1tar beshi page thake tobei pagination dekhabe
    if (totalPages > 1) {
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.innerText = i;
            btn.className = `page-num ${i === currentPage ? 'active' : ''}`;
            btn.onclick = () => { 
                currentPage = i; 
                displayProducts(i);
                window.scrollTo({ top: document.getElementById('productGrid').offsetTop - 100, behavior: 'smooth' });
            };
            pBar.appendChild(btn);
        }
    }
}

// Page load hoye gele loading screen hide korar jonno
window.addEventListener('load', () => {
    const loader = document.getElementById('loadingScreen');
    if (loader) {
        loader.style.display = 'none';
    }
});

// Extra precaution: Jodi load hote deri hoy, 3 second por auto hide hobe
setTimeout(() => {
    const loader = document.getElementById('loadingScreen');
    if (loader && loader.style.display !== 'none') {
        loader.style.display = 'none';
    }
}, 3000);

/* --- FINAL MENU & FILTER BRIDGE --- */

// 1. Menu item click handler
function handleCategoryClick(event, mainCat, subCat) {
    event.preventDefault(); // Page jump stop korbe
    filterByCategory(mainCat, subCat); // Filter logic call korbe
    
    // Mobile-e menu auto bondho hobe
    const menu = document.getElementById('menuOverlay');
    if(menu) {
        menu.classList.remove('active');
        document.body.classList.remove('menu-open');
    }
}

// 2. Updated Filter Logic (Pill active color change shoho)
function filterByCategory(mainCat, subCat = 'All') {
    currentPage = 1;
    
    // Main Filtering logic
    if (mainCat === 'All') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(p => 
            p.category === mainCat && (subCat === 'All' || p.subCategory === subCat)
        );
    }

    // Scroll to products
    const grid = document.getElementById('productGrid');
    if (grid) {
        window.scrollTo({
            top: grid.offsetTop - 120,
            behavior: 'smooth'
        });
    }

    // Filter pills (All, Tote, Handbag) er active class update kora
    const pills = document.querySelectorAll('.pill');
    pills.forEach(pill => {
        pill.classList.remove('active');
        if(pill.innerText.toLowerCase() === mainCat.toLowerCase()) {
            pill.classList.add('active');
        }
    });

    displayProducts(1);
}

/* --- INITIAL RUN --- */
displayProducts(1);
initSearch();