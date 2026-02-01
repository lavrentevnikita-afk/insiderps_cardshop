// Initialize Telegram WebApp
const tg = window.Telegram?.WebApp || { initDataUnsafe: {} };
const isTelegramWebApp = !!window.Telegram?.WebApp?.initData;

// Настройка WebApp если запущен из Telegram
if (isTelegramWebApp) {
    tg.expand();
    tg.enableClosingConfirmation();
    console.log('✅ Запущено из Telegram WebApp');
} else {
    console.log('🌐 Запущено через браузер');
}

// App State
const app = {
    currentPage: 'home',
    currentRegion: null,
    currentProduct: null,
    previousPage: null,
    cart: JSON.parse(localStorage.getItem('cart') || '[]'),
    promoBanners: [
        {
            id: 1,
            enabled: true,
            title: 'НЕ ХВАТАЕТ ПРИМОГЕМОВ?',
            subtitle: 'САМЫЕ НИЗКИЕ ЦЕНЫ!'
        },
        {
            id: 2,
            enabled: true,
            title: 'НЕ УПУСКАЙ ЛУЧШИЕ ПРОМОКОДЫ',
            subtitle: 'В НАШЕМ ПРИЛОЖЕНИИ'
        }
    ],
    products: {
        usa: [
            { id: 'us_5', name: '5$ (Америка)', currency: 'USD', price: 465, discount: 0, description: 'Карта пополнения PlayStation Store на 5$ для аккаунта региона США. Моментальная доставка после оплаты.', image: 'https://i.imgur.com/pscard5.png' },
            { id: 'us_10', name: '10$ (Америка)', currency: 'USD', price: 774, discount: 10, description: 'Карта пополнения PlayStation Store на 10$ для аккаунта региона США. Моментальная доставка после оплаты.', image: 'https://i.imgur.com/pscard10.png' },
            { id: 'us_25', name: '25$ (Америка)', currency: 'USD', price: 1850, discount: 15, description: 'Карта пополнения PlayStation Store на 25$ для аккаунта региона США. Моментальная доставка после оплаты.', image: 'https://i.imgur.com/pscard25.png' },
            { id: 'us_50', name: '50$ (Америка)', currency: 'USD', price: 3699, discount: 20, description: 'Карта пополнения PlayStation Store на 50$ для аккаунта региона США. Моментальная доставка после оплаты.', image: 'https://i.imgur.com/pscard50.png' }
        ],
        india: [
            { id: 'in_500', name: '500₹ (Индия)', currency: 'INR', price: 550, discount: 0, description: 'Карта пополнения PlayStation Store на 500₹ для аккаунта региона Индия. Моментальная доставка после оплаты.', image: 'https://i.imgur.com/pscard_in500.png' },
            { id: 'in_1000', name: '1000₹ (Индия)', currency: 'INR', price: 1050, discount: 5, description: 'Карта пополнения PlayStation Store на 1000₹ для аккаунта региона Индия. Моментальная доставка после оплаты.', image: 'https://i.imgur.com/pscard_in1000.png' },
            { id: 'in_2000', name: '2000₹ (Индия)', currency: 'INR', price: 2050, discount: 10, description: 'Карта пополнения PlayStation Store на 2000₹ для аккаунта региона Индия. Моментальная доставка после оплаты.', image: 'https://i.imgur.com/pscard_in2000.png' }
        ],
        poland: [
            { id: 'pl_50', name: '50zł (Польша)', currency: 'PLN', price: 1200, discount: 0, description: 'Карта пополнения PlayStation Store на 50zł для аккаунта региона Польша. Моментальная доставка после оплаты.', image: 'https://i.imgur.com/pscard_pl50.png' },
            { id: 'pl_100', name: '100zł (Польша)', currency: 'PLN', price: 2350, discount: 5, description: 'Карта пополнения PlayStation Store на 100zł для аккаунта региона Польша. Моментальная доставка после оплаты.', image: 'https://i.imgur.com/pscard_pl100.png' },
            { id: 'pl_250', name: '250zł (Польша)', currency: 'PLN', price: 5800, discount: 10, description: 'Карта пополнения PlayStation Store на 250zł для аккаунта региона Польша. Моментальная доставка после оплаты.', image: 'https://i.imgur.com/pscard_pl250.png' }
        ],
        turkey: [
            { id: 'tr_50', name: '50₺ (Турция)', currency: 'TRY', price: 250, discount: 0, description: 'Карта пополнения PlayStation Store на 50₺ для аккаунта региона Турция. Моментальная доставка после оплаты.', image: 'https://i.imgur.com/pscard_tr50.png' },
            { id: 'tr_100', name: '100₺ (Турция)', currency: 'TRY', price: 480, discount: 5, description: 'Карта пополнения PlayStation Store на 100₺ для аккаунта региона Турция. Моментальная доставка после оплаты.', image: 'https://i.imgur.com/pscard_tr100.png' },
            { id: 'tr_250', name: '250₺ (Турция)', currency: 'TRY', price: 1150, discount: 14, description: 'Карта пополнения PlayStation Store на 250₺ для аккаунта региона Турция. Моментальная доставка после оплаты.', image: 'https://i.imgur.com/pscard_tr250.png' }
        ]
    }
};

// Initialize app
function init() {
    loadPromoBanners();
    loadPopularProducts();
    updateCartBadge();
    app.showPage('home');
    animateProductCards();
}

// Load promo banners
function loadPromoBanners() {
    const slider = document.getElementById('promo-slider');
    const activeBanners = app.promoBanners.filter(b => b.enabled);
    
    if (activeBanners.length > 0) {
        const banner = activeBanners[0]; // Show first banner
        slider.innerHTML = `
            <div class="promo-banner">
                <h3>${banner.title}</h3>
                <p>${banner.subtitle}</p>
            </div>
        `;
    }
}

// Load popular products (most purchased)
function loadPopularProducts() {
    const container = document.getElementById('popular-products');
    
    // Get top products from each region
    const popular = [
        app.products.usa[1], // $10
        app.products.india[1], // 1000₹
        app.products.turkey[2], // 250₺
        app.products.poland[0] // 50zł
    ];
    
    container.innerHTML = popular.map(product => createProductCard(product)).join('');
}

// Create product card HTML
function createProductCard(product) {
    const discountTag = product.discount > 0 
        ? `<div class="product-discount">-${product.discount}%</div>` 
        : '';
    
    const imageUrl = product.image || 'https://via.placeholder.com/400x250/003087/00a8ff?text=PlayStation+Card';
    
    return `
        <div class="product-card" onclick="app.showProduct('${product.id}')">
            ${discountTag}
            <div class="product-favorite">⭐</div>
            <div class="product-image">
                <img src="${imageUrl}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/400x250/003087/00a8ff?text=PlayStation+Card'">
            </div>
            <div class="product-info">
                <div class="product-title">
                    ${product.name}
                    <span class="product-currency">${product.currency}</span>
                </div>
                <div class="product-price">
                    ${product.price}₽
                    ${product.discount > 0 ? `<span>${Math.round(product.price / (1 - product.discount / 100))}₽</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

// Show page
app.showPage = function(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');
    app.previousPage = app.currentPage;
    app.currentPage = pageId;
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
};

// Show catalog for region
app.showCatalog = function(region) {
    app.currentRegion = region;
    app.showPage('catalog');
    
    const regionNames = {
        usa: '🇺🇸 PlayStation Америка',
        india: '🇮🇳 PlayStation Индия',
        poland: '🇵🇱 PlayStation Польша',
        turkey: '🇹🇷 PlayStation Турция'
    };
    
    document.getElementById('catalog-title').textContent = regionNames[region];
    
    const products = app.products[region];
    const container = document.getElementById('catalog-products');
    container.innerHTML = products.map(product => createProductCard(product)).join('');
    animateProductCards();
};

// Show product detail
app.showProduct = function(productId) {
    const product = findProductById(productId);
    if (!product) return;
    
    app.currentProduct = product;
    app.showPage('product');
    
    const container = document.getElementById('product-detail');
    const originalPrice = product.discount > 0 ? Math.round(product.price / (1 - product.discount / 100)) : product.price;
    
    const imageUrl = product.image || 'https://via.placeholder.com/800x500/003087/00a8ff?text=PlayStation+Card';
    
    container.innerHTML = `
        <div class="product-detail-image">
            <img src="${imageUrl}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/800x500/003087/00a8ff?text=PlayStation+Card'">
        </div>
        <div class="product-detail-content">
            <div class="product-detail-header">
                <div>
                    <div class="product-detail-title">
                        ${product.name}
                        <span class="product-currency">${product.currency}</span>
                    </div>
                    <p class="product-description">${product.description}</p>
                </div>
                <div class="product-detail-price">
                    ${product.price}₽
                    ${product.discount > 0 ? `<div style="font-size: 18px; color: var(--text-secondary); text-decoration: line-through;">${originalPrice}₽</div>` : ''}
                </div>
            </div>
            <div class="product-actions">
                <button class="btn btn-secondary" onclick="app.addToCart('${product.id}')">
                    В корзину
                </button>
                <button class="btn btn-primary" onclick="app.buyNow('${product.id}')">
                    Купить сейчас
                </button>
            </div>
        </div>
    `;
};

// Go back
app.goBack = function() {
    if (app.currentPage === 'product' && app.currentRegion) {
        app.showCatalog(app.currentRegion);
    } else {
        app.showPage('home');
    }
};

// Add to cart
app.addToCart = function(productId) {
    const product = findProductById(productId);
    if (!product) return;
    
    const existingItem = app.cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        app.cart.push({ ...product, quantity: 1 });
    }
    
    saveCart();
    updateCartBadge();
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
    
    tg.showAlert('Товар добавлен в корзину!');
};

// Buy now
app.buyNow = function(productId) {
    app.addToCart(productId);
    app.showPage('cart');
    renderCart();
};

// Remove from cart
app.removeFromCart = function(productId) {
    app.cart = app.cart.filter(item => item.id !== productId);
    saveCart();
    updateCartBadge();
    renderCart();
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('warning');
    }
};

// Render cart
function renderCart() {
    const container = document.getElementById('cart-content');
    
    if (app.cart.length === 0) {
        container.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">🛒</div>
                <p>Корзина пуста</p>
                <button class="btn btn-primary" onclick="app.showPage('home')">
                    Перейти к покупкам
                </button>
            </div>
        `;
        return;
    }
    
    const subtotal = app.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = app.cart.reduce((sum, item) => {
        const original = item.discount > 0 ? Math.round(item.price / (1 - item.discount / 100)) : item.price;
        return sum + ((original - item.price) * item.quantity);
    }, 0);
    const total = subtotal;
    
    container.innerHTML = `
        <div class="cart-items">
            ${app.cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-image">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
                            <path fill="currentColor" d="M25 2L2 13v24l23 11 23-11V13L25 2zm0 4.4l18.6 8.9v19.4L25 43.6 6.4 34.7V15.3L25 6.4z"/>
                        </svg>
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.name}</div>
                        <div class="cart-item-currency">${item.currency}</div>
                        <div class="cart-item-price">${item.price * item.quantity}₽</div>
                    </div>
                    <button class="cart-item-remove" onclick="app.removeFromCart('${item.id}')">
                        Удалить
                    </button>
                </div>
            `).join('')}
        </div>
        
        <div class="cart-payment">
            <h3>Способ оплаты</h3>
            <div class="payment-methods">
                <div class="payment-method active" onclick="selectPaymentMethod(this)">
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 32'%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-size='16' fill='%23003087'%3EСБП%3C/text%3E%3C/svg%3E" alt="СБП">
                </div>
                <div class="payment-method" onclick="selectPaymentMethod(this)">
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 32'%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-size='12' fill='%23003087'%3EМИР%3C/text%3E%3C/svg%3E" alt="МИР">
                </div>
                <div class="payment-method" onclick="selectPaymentMethod(this)">
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 32'%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-size='10' fill='%231434CB'%3EVISA%3C/text%3E%3C/svg%3E" alt="VISA">
                </div>
            </div>
            
            <div class="cart-email">
                <label for="email">E-mail</label>
                <input type="email" id="email" placeholder="Ваш E-mail" />
            </div>
        </div>
        
        <div class="cart-total">
            <div class="cart-total-row">
                <span>СВП От</span>
                <span>${subtotal}₽</span>
            </div>
            ${discount > 0 ? `
                <div class="cart-total-row discount">
                    <span>Скидка</span>
                    <span>-${discount}₽</span>
                </div>
            ` : ''}
            <div class="cart-total-row final">
                <span>Сумма</span>
                <span>${total}₽</span>
            </div>
        </div>
        
        <button class="btn btn-primary cart-checkout" onclick="checkout()">
            ПРОДОЛЖИТЬ
        </button>
        
        <div class="cart-terms">
            Нажимая кнопку Продолжить, я принимаю условия 
            <a href="#">Пользовательского соглашения</a>, 
            <a href="#">Положения об обработке персональных данных</a> 
            и подтверждаю ознакомление с <a href="#">FAQ</a>
        </div>
    `;
}

// Select payment method
window.selectPaymentMethod = function(element) {
    document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
    element.classList.add('active');
};

// Checkout
window.checkout = async function() {
    const email = document.getElementById('email')?.value;
    
    if (!email || !email.includes('@')) {
        if (tg.showAlert) {
            tg.showAlert('Пожалуйста, введите корректный E-mail');
        } else {
            alert('Пожалуйста, введите корректный E-mail');
        }
        return;
    }
    
    // Подготовка данных заказа
    const orderData = {
        type: 'order',
        email: email,
        items: app.cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            currency: item.currency
        })),
        total: app.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        timestamp: new Date().toISOString()
    };
    
    if (isTelegramWebApp) {
        // Запущено из Telegram - отправляем в бот
        console.log('📱 Отправка заказа в Telegram бот');
        
        // Добавляем данные пользователя Telegram
        orderData.telegram_user = {
            id: tg.initDataUnsafe.user?.id,
            first_name: tg.initDataUnsafe.user?.first_name,
            username: tg.initDataUnsafe.user?.username
        };
        
        try {
            // Отправляем через API бэкенда
            const response = await fetch('/api/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': tg.initData || ''
                },
                body: JSON.stringify(orderData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (tg.showAlert) {
                    tg.showAlert('✅ Заказ оформлен! Коды отправлены в бот.');
                }
                // Очищаем корзину
                app.cart = [];
                saveCart();
                updateCartBadge();
                app.showPage('home');
                
                // Закрываем WebApp через 2 секунды
                setTimeout(() => {
                    if (tg.close) tg.close();
                }, 2000);
            } else {
                throw new Error(result.error || 'Ошибка создания заказа');
            }
        } catch (error) {
            console.error('❌ Ошибка отправки заказа:', error);
            if (tg.showAlert) {
                tg.showAlert('❌ Ошибка оформления заказа. Попробуйте снова.');
            } else {
                alert('❌ Ошибка оформления заказа. Попробуйте снова.');
            }
        }
    } else {
        // Запущено через браузер - отправляем на email
        console.log('📧 Отправка заказа на email');
        
        try {
            const response = await fetch('/api/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(`✅ Заказ оформлен!\n\nКоды отправлены на: ${email}\n\nПроверьте почту через несколько минут.`);
                
                // Очищаем корзину
                app.cart = [];
                saveCart();
                updateCartBadge();
                app.showPage('home');
            } else {
                throw new Error(result.error || 'Ошибка создания заказа');
            }
        } catch (error) {
            console.error('❌ Ошибка отправки заказа:', error);
            alert('❌ Ошибка оформления заказа. Попробуйте снова.');
        }
    }
};

// Helper functions
function findProductById(id) {
    for (const region in app.products) {
        const product = app.products[region].find(p => p.id === id);
        if (product) return product;
    }
    return null;
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(app.cart));
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    const count = app.cart.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

// When cart page becomes active, render it
const originalShowPage = app.showPage;
app.showPage = function(pageId) {
    originalShowPage.call(this, pageId);
    if (pageId === 'cart') {
        renderCart();
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Add scroll effect for navbar
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
});

// Add loading animation to product cards
function animateProductCards() {
    const cards = document.querySelectorAll('.product-card, .region-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}
