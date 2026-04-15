const API_BASE = 'http://localhost:3005/api';

// DOM Elements
const productGrid = document.getElementById('product-grid');
const cartSidebar = document.getElementById('cart-sidebar');
const cartOverlay = document.getElementById('cart-overlay');
const cartBtn = document.getElementById('cart-btn');
const closeCartBtn = document.getElementById('close-cart-btn');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const cartBadge = document.getElementById('cart-badge');
const toastEl = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const searchInput = document.getElementById('search-input');
const menuBtn = document.getElementById('menu-btn');
const categorySidebar = document.getElementById('category-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const categoryList = document.getElementById('category-list');
const productsHeading = document.getElementById('products-heading');
const checkoutLink = document.getElementById('checkout-link');

// State
let cart = [];
let searchTimer = null;
let activeCategory = '';

// Initialize Icons
lucide.createIcons();

// ── Auth State ──────────────────────────────────────────
function updateUserNav() {
    const userNavArea = document.getElementById('user-nav-area');
    if (!userNavArea) return;
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user) {
        userNavArea.innerHTML = `
            <span class="nav-username">Hi, ${user.username}</span>
            <button onclick="logout()" class="btn btn-secondary btn-sm">Logout</button>
        `;
    } else {
        userNavArea.innerHTML = `
            <a href="login.html" class="btn btn-secondary btn-sm">Login</a>
            <a href="register.html" class="btn btn-primary btn-sm">Register</a>
        `;
    }
    lucide.createIcons();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateUserNav();
    showToast('Logged out successfully.');
}

// ── Init ────────────────────────────────────────────────
async function init() {
    updateUserNav();
    setupEventListeners();
    await fetchProducts();
    await fetchCategories();
    await fetchCart();
}

// ── Event Listeners ─────────────────────────────────────
function setupEventListeners() {
    cartBtn.addEventListener('click', toggleCart);
    closeCartBtn.addEventListener('click', toggleCart);
    cartOverlay.addEventListener('click', toggleCart);

    menuBtn.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);

    document.addEventListener('click', (e) => {
        if (e.target.closest('.close-empty-btn')) toggleCart();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (cartSidebar.classList.contains('active')) toggleCart();
            if (categorySidebar.classList.contains('active')) toggleSidebar();
        }
    });

    // Search: debounced
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            fetchProducts(searchInput.value.trim(), activeCategory);
        }, 350);
    });
}

// ── UI Toggles ───────────────────────────────────────────
function toggleCart() {
    cartSidebar.classList.toggle('active');
    cartOverlay.classList.toggle('active');
    document.body.style.overflow = cartSidebar.classList.contains('active') ? 'hidden' : '';
}

function toggleSidebar() {
    categorySidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
    document.body.style.overflow = categorySidebar.classList.contains('active') ? 'hidden' : '';
}

function showToast(message, isError = false) {
    toastMessage.textContent = message;
    toastEl.style.backgroundColor = isError ? 'var(--danger)' : 'var(--success)';
    toastEl.classList.remove('hidden');
    toastEl.classList.add('show');
    setTimeout(() => { toastEl.classList.remove('show'); setTimeout(() => toastEl.classList.add('hidden'), 400); }, 3000);
}

// ── Fetch API ─────────────────────────────────────────────
async function fetchProducts(search = '', category = '') {
    try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (category) params.append('category', category);
        const url = `${API_BASE}/products${params.toString() ? '?' + params.toString() : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch products');
        const products = await res.json();

        // Update heading
        if (category) productsHeading.textContent = category;
        else if (search) productsHeading.textContent = `Results for "${search}"`;
        else productsHeading.textContent = 'Featured Collection';

        renderProducts(products);
    } catch (error) {
        console.error(error);
        productGrid.innerHTML = `<div class="loading-state" style="color:var(--danger)"><i data-lucide="alert-circle"></i> Failed to load products. Ensure backend is running.</div>`;
        lucide.createIcons();
    }
}

async function fetchCategories() {
    try {
        const res = await fetch(`${API_BASE}/categories`);
        const cats = await res.json();
        renderCategories(cats);
    } catch (e) { /* silently fail */ }
}

async function fetchCart() {
    const token = localStorage.getItem('token');
    if (!token) {
        cart = [];
        renderCart();
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
            logout();
            return;
        }
        if (!res.ok) throw new Error('Failed to fetch cart');
        cart = await res.json();
        renderCart();
    } catch (error) {
        console.error(error);
    }
}

// ── Actions ───────────────────────────────────────────────
async function addToCart(productId) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Please login to add items to cart', true);
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/cart`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId, quantity: 1 })
        });
        if (res.status === 401) {
            showToast('Session expired. Please login again.', true);
            logout();
            setTimeout(() => window.location.href = 'login.html', 1500);
            return;
        }
        if (!res.ok) throw new Error('Failed to add to cart');
        showToast('Added to cart!');
        await fetchCart();
    } catch (error) {
        showToast('Error adding to cart', true);
    }
}

async function updateQuantity(cartId, newQuantity) {
    if (newQuantity < 1) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/cart/${cartId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ quantity: newQuantity })
        });
        if (res.status === 401) { logout(); return; }
        await fetchCart();
    } catch (error) { console.error(error); }
}

async function removeFromCart(cartId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/cart/${cartId}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) { logout(); return; }
        showToast('Item removed from cart');
        await fetchCart();
    } catch (error) { console.error(error); }
}

// ── Render Functions ─────────────────────────────────────
function renderProducts(products) {
    if (!products.length) {
        productGrid.innerHTML = '<div class="loading-state">No products found.</div>';
        return;
    }
    productGrid.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="product-image-container">
                <img src="${p.image_url}" alt="${p.name}" class="product-image" loading="lazy">
                ${p.category ? `<span class="product-category-tag">${p.category}</span>` : ''}
            </div>
            <div class="product-info">
                <h3 class="product-title">${p.name}</h3>
                <p class="product-desc">${p.description}</p>
                <div class="product-footer">
                    <span class="product-price">$${Number(p.price).toFixed(2)}</span>
                    <button class="add-to-cart-btn" onclick="addToCart(${p.id})" aria-label="Add to cart">
                        <i data-lucide="plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function renderCategories(cats) {
    categoryList.innerHTML = cats.map(cat => `
        <button class="category-btn" data-category="${cat}">
            <i data-lucide="tag"></i> ${cat}
        </button>
    `).join('');

    categoryList.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            activeCategory = btn.dataset.category;
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            fetchProducts(searchInput.value.trim(), activeCategory);
            toggleSidebar();
        });
    });

    document.querySelector('.category-btn[data-category=""]')?.addEventListener('click', () => {
        activeCategory = '';
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.category-btn[data-category=""]').classList.add('active');
        fetchProducts(searchInput.value.trim(), '');
        toggleSidebar();
    });

    lucide.createIcons();
}

function renderCart() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadge.textContent = totalItems;

    const totalPrice = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    cartTotalEl.textContent = `$${totalPrice.toFixed(2)}`;

    if (checkoutLink) {
        checkoutLink.style.display = cart.length > 0 ? 'block' : 'none';
    }

    if (!cart.length) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart-message">
                <i data-lucide="shopping-cart" class="empty-icon"></i>
                <p>Your cart is empty.</p>
                <button class="btn btn-secondary close-empty-btn">Continue Shopping</button>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image_url}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-details">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">$${Number(item.price).toFixed(2)}</div>
                <div class="cart-item-actions">
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateQuantity(${item.cart_id}, ${item.quantity - 1})"><i data-lucide="minus" style="width:14px;height:14px;"></i></button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${item.cart_id}, ${item.quantity + 1})"><i data-lucide="plus" style="width:14px;height:14px;"></i></button>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${item.cart_id})"><i data-lucide="trash-2" style="width:18px;height:18px;"></i></button>
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', init);
