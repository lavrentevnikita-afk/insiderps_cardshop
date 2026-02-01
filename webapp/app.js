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

// ============================================
// PRELOADER
// ============================================

// Hide preloader when page is loaded
window.addEventListener('load', function() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('loaded');
            // Remove from DOM after animation
            setTimeout(() => {
                preloader.remove();
            }, 500);
        }, 300); // Small delay for better UX
    }
});

// ============================================
// LAZY LOADING IMAGES
// ============================================

function initLazyLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.addEventListener('load', () => {
                        img.classList.add('loaded');
                    });
                    if (img.complete) {
                        img.classList.add('loaded');
                    }
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px' // Start loading 50px before image enters viewport
        });
        
        images.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for browsers without IntersectionObserver
        images.forEach(img => {
            img.addEventListener('load', () => {
                img.classList.add('loaded');
            });
            if (img.complete) {
                img.classList.add('loaded');
            }
        });
    }
}

// App State
const app = {
    currentPage: 'home',
    currentRegion: null,
    currentProduct: null,
    previousPage: null,
    cart: JSON.parse(localStorage.getItem('cart') || '[]'),
    products: {
        usa: [],
        india: [],
        poland: [],
        turkey: []
    },
    productsLoaded: false
};

// Check for price changes
function checkPriceChanges(newProducts) {
    const savedPrices = JSON.parse(localStorage.getItem('productPrices') || '{}');
    const priceChanges = [];
    
    newProducts.forEach(product => {
        const savedProduct = savedPrices[product.id];
        if (savedProduct) {
            // Check price change
            if (savedProduct.price !== product.price) {
                const diff = product.price - savedProduct.price;
                const isIncrease = diff > 0;
                priceChanges.push({
                    product,
                    oldPrice: savedProduct.price,
                    newPrice: product.price,
                    diff: Math.abs(diff),
                    isIncrease
                });
            }
            // Check discount change
            if (savedProduct.discount !== product.discount) {
                const diff = product.discount - savedProduct.discount;
                if (diff > 0) {
                    // Discount increased - good news!
                    priceChanges.push({
                        product,
                        type: 'discount',
                        oldDiscount: savedProduct.discount,
                        newDiscount: product.discount,
                        diff
                    });
                }
            }
        }
    });
    
    // Save current prices
    const currentPrices = {};
    newProducts.forEach(p => {
        currentPrices[p.id] = { price: p.price, discount: p.discount };
    });
    localStorage.setItem('productPrices', JSON.stringify(currentPrices));
    
    // Show notifications for price changes (only if not first visit)
    if (Object.keys(savedPrices).length > 0 && priceChanges.length > 0) {
        priceChanges.forEach(change => {
            if (change.type === 'discount') {
                Toast.success(
                    '🎉 Скидка увеличена!',
                    `${change.product.name}: ${change.oldDiscount}% → ${change.newDiscount}%`,
                    4000
                );
            } else if (!change.isIncrease) {
                Toast.success(
                    '💰 Цена снижена!',
                    `${change.product.name}: ${change.oldPrice}₽ → ${change.newPrice}₽`,
                    4000
                );
            } else {
                Toast.info(
                    'Цена изменена',
                    `${change.product.name}: ${change.oldPrice}₽ → ${change.newPrice}₽`,
                    3000
                );
            }
        });
    }
}

// Load products from API
async function loadProducts() {
    // Show skeletons
    showSkeletons();
    
    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('API not available');
        
        const products = await response.json();
        
        // Check for price changes
        checkPriceChanges(products);
        
        // Группируем товары по регионам
        app.products = {
            usa: products.filter(p => p.region === 'USA'),
            india: products.filter(p => p.region === 'India'),
            poland: products.filter(p => p.region === 'Poland'),
            turkey: products.filter(p => p.region === 'Turkey')
        };
        
        app.productsLoaded = true;
        console.log('✅ Товары загружены с API:', products.length);
        
        // Перезагружаем текущую страницу если нужно
        if (app.currentPage === 'home') {
            loadPopularProducts();
        } else if (app.currentPage === 'catalog' && app.currentRegion) {
            app.showCatalog(app.currentRegion);
        }
    } catch (error) {
        console.warn('⚠️ API недоступен, используем локальные данные');
        // Fallback на hardcoded товары для Vercel
        app.products = {
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
        };
        app.productsLoaded = true;
    }
}

// Initialize app
async function init() {
    await loadProducts(); // Загружаем товары с сервера
    loadPromoBanners();
    loadPopularProducts();
    updateCartBadge();
    app.showPage('home');
    animateProductCards();
    
    // Initialize lazy loading for images
    initLazyLoading();
    
    // Periodic price check every 5 minutes
    setInterval(async () => {
        try {
            const response = await fetch('/api/products');
            if (response.ok) {
                const products = await response.json();
                checkPriceChanges(products);
                
                // Update products silently
                app.products = {
                    usa: products.filter(p => p.region === 'USA'),
                    india: products.filter(p => p.region === 'India'),
                    poland: products.filter(p => p.region === 'Poland'),
                    turkey: products.filter(p => p.region === 'Turkey')
                };
                
                // Refresh current view if needed
                if (app.currentPage === 'catalog' && app.currentRegion) {
                    renderCatalog();
                }
            }
        } catch (error) {
            console.log('Price check failed:', error);
        }
    }, 5 * 60 * 1000); // 5 minutes
}

// Load promo banners
async function loadPromoBanners() {
    const slider = document.getElementById('promo-slider');
    
    try {
        // Load banners from API
        const response = await fetch('/api/banners');
        if (response.ok) {
            const banners = await response.json();
            
            if (banners.length > 0) {
                const banner = banners[0]; // Show first active banner
                
                // Показываем баннер
                slider.style.display = 'block';
                
                let bannerHTML = '<div class="promo-banner">';
                
                if (banner.image) {
                    bannerHTML += `<div class="promo-banner-image" style="background-image: url('${banner.image}')"></div>`;
                }
                
                bannerHTML += '<div class="promo-banner-content">';
                bannerHTML += `<h3>${banner.title}</h3>`;
                bannerHTML += `<p>${banner.subtitle}</p>`;
                bannerHTML += '</div>';
                
                if (banner.link) {
                    bannerHTML = `<a href="${banner.link}" target="_blank" class="promo-banner-link">${bannerHTML}</a>`;
                }
                
                bannerHTML += '</div>';
                
                slider.innerHTML = bannerHTML;
            } else {
                // Скрываем блок, если нет баннеров
                slider.style.display = 'none';
                slider.innerHTML = '';
            }
        } else {
            // Скрываем при ошибке
            slider.style.display = 'none';
            slider.innerHTML = '';
        }
    } catch (error) {
        console.error('Error loading banners:', error);
        // Скрываем при ошибке
        slider.style.display = 'none';
        slider.innerHTML = '';
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
    const regionClass = `region-${product.region.toLowerCase()}`;
    
    return `
        <div class="product-card ${regionClass}" onclick="app.showProduct('${product.id}')">
            ${discountTag}
            <div class="product-image">
                <img src="${imageUrl}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x250/003087/00a8ff?text=PlayStation+Card'">
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
    
    renderCatalog();
};

// Render catalog with current sort
function renderCatalog() {
    const products = app.products[app.currentRegion];
    const container = document.getElementById('catalog-products');
    container.innerHTML = products.map(product => createProductCard(product)).join('');
    animateProductCards();
    
    // Re-initialize lazy loading for new images
    initLazyLoading();
}

// Show product detail
app.showProduct = function(productId) {
    const product = findProductById(productId);
    if (!product) return;
    
    app.currentProduct = product;
    app.showPage('product');
    
    const container = document.getElementById('product-detail');
    const originalPrice = product.discount > 0 ? Math.round(product.price / (1 - product.discount / 100)) : product.price;
    
    const imageUrl = product.image || 'https://via.placeholder.com/800x500/003087/00a8ff?text=PlayStation+Card';
    const regionClass = `region-${product.region.toLowerCase()}`;
    
    container.innerHTML = `
        <div class="product-detail-image ${regionClass}">
            <img src="${imageUrl}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/800x500/003087/00a8ff?text=PlayStation+Card'">
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
        Toast.success('Количество увеличено', `${product.name} теперь в корзине (${existingItem.quantity} шт.)`);
    } else {
        app.cart.push({ ...product, quantity: 1 });
        Toast.success('Добавлено в корзину', product.name);
    }
    
    saveCart();
    updateCartBadge();
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
};

// Buy now
app.buyNow = function(productId) {
    app.addToCart(productId);
    app.showPage('cart');
    renderCart();
};

// Remove from cart
app.removeFromCart = function(productId) {
    const product = app.cart.find(item => item.id === productId);
    app.cart = app.cart.filter(item => item.id !== productId);
    saveCart();
    updateCartBadge();
    renderCart();
    
    if (product) {
        Toast.info('Удалено из корзины', product.name);
    }
    
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
            ${app.cart.map(item => {
                const regionClass = `region-${item.region.toLowerCase()}`;
                return `
                <div class="cart-item ${regionClass}">
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
                `;
            }).join('')}
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
    const checkoutBtn = document.querySelector('.cart-checkout');
    
    if (!email || !email.includes('@')) {
        Toast.warning('Введите корректный email', 'Email обязателен для получения кодов');
        return;
    }
    
    // Show loading state
    if (checkoutBtn) {
        checkoutBtn.classList.add('loading');
        checkoutBtn.disabled = true;
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
                // Remove loading state
                if (checkoutBtn) {
                    checkoutBtn.classList.remove('loading');
                    checkoutBtn.disabled = false;
                }
                
                Toast.success('✅ Заказ оформлен!', 'Коды отправлены в Telegram бот', 3000);
                
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
            
            // Remove loading state
            if (checkoutBtn) {
                checkoutBtn.classList.remove('loading');
                checkoutBtn.disabled = false;
            }
            
            // Show error with retry option
            showCheckoutError(error.message, orderData);
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
                // Remove loading state
                if (checkoutBtn) {
                    checkoutBtn.classList.remove('loading');
                    checkoutBtn.disabled = false;
                }
                
                Toast.success('✅ Заказ оформлен!', `Коды отправлены на ${email}`, 4000);
                
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
            
            // Remove loading state
            if (checkoutBtn) {
                checkoutBtn.classList.remove('loading');
                checkoutBtn.disabled = false;
            }
            
            // Show error with retry option
            showCheckoutError(error.message, orderData);
        }
    }
};

// Show beautiful error message with retry option
function showCheckoutError(errorMessage, orderData) {
    const cartContent = document.getElementById('cart-content');
    if (!cartContent) return;
    
    // Create error component
    const errorHtml = `
        <div class="error-container">
            <div class="error-icon">⚠️</div>
            <div class="error-title">Ошибка оформления заказа</div>
            <div class="error-message">
                Произошла ошибка при отправке заказа. 
                Пожалуйста, проверьте подключение к интернету и попробуйте снова.
            </div>
            ${errorMessage && errorMessage !== 'Failed to fetch' ? `
                <div class="error-details">
                    ${errorMessage}
                </div>
            ` : ''}
            <div class="error-actions">
                <button class="btn-retry" onclick="retryCheckout()">
                    <span>↻</span>
                    <span>Повторить попытку</span>
                </button>
                <button class="btn-cancel" onclick="hideCheckoutError()">
                    <span>✕</span>
                    <span>Отмена</span>
                </button>
            </div>
        </div>
    `;
    
    // Insert error before checkout button
    const checkoutBtn = cartContent.querySelector('.cart-checkout');
    if (checkoutBtn) {
        // Remove existing error if any
        const existingError = cartContent.querySelector('.error-container');
        if (existingError) existingError.remove();
        
        checkoutBtn.insertAdjacentHTML('beforebegin', errorHtml);
    }
    
    // Store orderData for retry
    window._lastOrderData = orderData;
    
    // Show toast notification
    Toast.error('Ошибка оформления заказа', 'Попробуйте еще раз', 4000);
}

// Retry checkout
window.retryCheckout = function() {
    hideCheckoutError();
    checkout();
};

// Hide error
window.hideCheckoutError = function() {
    const error = document.querySelector('.error-container');
    if (error) {
        error.style.animation = 'error-shake-reverse 0.3s ease-out';
        setTimeout(() => error.remove(), 300);
    }
    delete window._lastOrderData;
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

// Show skeleton loaders
function showSkeletons() {
    const popularContainer = document.getElementById('popular-products');
    const skeletonHTML = `
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
    `;
    popularContainer.innerHTML = skeletonHTML;
}

// Load orders history
app.loadOrders = async function() {
    const emailInput = document.getElementById('orders-email');
    const email = emailInput.value.trim();
    const loadBtn = document.querySelector('.email-input-group .btn');
    
    if (!email || !email.includes('@')) {
        Toast.warning('Введите корректный email', 'Email обязателен для поиска заказов');
        return;
    }
    
    // Show loading state
    if (loadBtn) {
        loadBtn.classList.add('loading');
        loadBtn.disabled = true;
    }
    
    const ordersList = document.getElementById('orders-list');
    ordersList.innerHTML = '<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>';
    
    try {
        const response = await fetch(`/api/orders?email=${encodeURIComponent(email)}`);
        
        if (!response.ok) {
            throw new Error('Ошибка сервера');
        }
        
        const data = await response.json();
        
        // Remove loading state
        if (loadBtn) {
            loadBtn.classList.remove('loading');
            loadBtn.disabled = false;
        }
        
        if (data.orders && data.orders.length > 0) {
            ordersList.innerHTML = data.orders.map(order => createOrderCard(order)).join('');
            Toast.success('Заказы загружены', `Найдено заказов: ${data.orders.length}`);
        } else {
            ordersList.innerHTML = `
                <div class="no-orders">
                    <div class="no-orders-icon">📦</div>
                    <div class="no-orders-text">Заказы не найдены</div>
                    <div class="no-orders-subtext">Для этого email пока нет заказов</div>
                </div>
            `;
            Toast.info('Заказы не найдены', 'Попробуйте другой email');
        }
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        
        // Remove loading state
        if (loadBtn) {
            loadBtn.classList.remove('loading');
            loadBtn.disabled = false;
        }
        
        ordersList.innerHTML = `
            <div class="error-container">
                <div class="error-icon">❌</div>
                <div class="error-title">Ошибка загрузки заказов</div>
                <div class="error-message">
                    Не удалось загрузить историю заказов. 
                    Проверьте подключение к интернету.
                </div>
                <div class="error-actions">
                    <button class="btn-retry" onclick="app.loadOrders()">
                        <span>↻</span>
                        <span>Повторить</span>
                    </button>
                </div>
            </div>
        `;
        
        Toast.error('Ошибка загрузки', 'Проверьте подключение к интернету', 4000);
    }
};

// Create order card HTML
function createOrderCard(order) {
    const date = new Date(order.timestamp).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const status = order.status || 'completed';
    const statusText = status === 'completed' ? 'Выполнен' : 'В обработке';
    
    return `
        <div class="order-item">
            <div class="order-header">
                <div>
                    <div class="order-id">Заказ #${order.id || order.timestamp}</div>
                    <div class="order-date">${date}</div>
                </div>
                <div class="order-status ${status}">${statusText}</div>
            </div>
            <div class="order-products">
                ${order.items.map(item => `
                    <div class="order-product">
                        <span class="order-product-name">${item.name} x${item.quantity}</span>
                        <span class="order-product-price">${item.price * item.quantity}₽</span>
                    </div>
                `).join('')}
            </div>
            <div class="order-total">
                <span class="order-total-label">Итого:</span>
                <span class="order-total-amount">${order.total}₽</span>
            </div>
        </div>
    `;
}
// ============================================
// TOAST NOTIFICATIONS SYSTEM
// ============================================

const Toast = {
    container: null,
    
    init() {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },
    
    show(options) {
        this.init();
        
        const {
            type = 'info', // success, info, warning, error
            title = '',
            message = '',
            duration = 3000,
            icon = null
        } = options;
        
        // Default icons
        const icons = {
            success: '✓',
            info: 'ℹ',
            warning: '⚠',
            error: '✕'
        };
        
        const toastIcon = icon || icons[type] || icons.info;
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        toast.innerHTML = `
            <div class="toast-icon">${toastIcon}</div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close" onclick="Toast.remove(this.parentElement)">✕</button>
            ${duration > 0 ? '<div class="toast-progress"></div>' : ''}
        `;
        
        this.container.appendChild(toast);
        
        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(toast);
            }, duration);
        }
        
        return toast;
    },
    
    remove(toast) {
        if (!toast || !toast.parentElement) return;
        
        toast.classList.add('toast-removing');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
    },
    
    success(title, message = '', duration = 3000) {
        return this.show({ type: 'success', title, message, duration });
    },
    
    info(title, message = '', duration = 3000) {
        return this.show({ type: 'info', title, message, duration });
    },
    
    warning(title, message = '', duration = 3000) {
        return this.show({ type: 'warning', title, message, duration });
    },
    
    error(title, message = '', duration = 3000) {
        return this.show({ type: 'error', title, message, duration });
    }
};