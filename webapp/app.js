// Инициализация Telegram Web App
let tg = window.Telegram.WebApp;
tg.expand(); // Разворачиваем на весь экран

// URL вашего API (замените на реальный)
const API_URL = 'https://your-server.com/api';

// Загрузка товаров
async function loadProducts() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const productsContainer = document.getElementById('products-container');

    try {
        // Для демо используем локальные данные
        // В продакшене замените на: const response = await fetch(`${API_URL}/products`);
        const products = await fetchProducts();
        
        loading.classList.add('hidden');
        
        if (!products || products.length === 0) {
            error.classList.remove('hidden');
            return;
        }

        renderProducts(products);
        
    } catch (err) {
        console.error('Ошибка загрузки товаров:', err);
        loading.classList.add('hidden');
        error.classList.remove('hidden');
    }
}

// Получение товаров (для демо - хардкод, в продакшене - API запрос)
async function fetchProducts() {
    // В продакшене замените на реальный API запрос
    return [
        {
            id: "product_1",
            name: "Базовая подписка",
            description: "Доступ на 30 дней ко всем функциям",
            price: 299,
            currency: "RUB",
            image: "https://via.placeholder.com/300x200?text=Basic"
        },
        {
            id: "product_2",
            name: "Премиум подписка",
            description: "Доступ на 90 дней + бонусы",
            price: 799,
            currency: "RUB",
            image: "https://via.placeholder.com/300x200?text=Premium"
        },
        {
            id: "product_3",
            name: "VIP подписка",
            description: "Доступ на 365 дней + все бонусы",
            price: 2499,
            currency: "RUB",
            image: "https://via.placeholder.com/300x200?text=VIP"
        }
    ];
}

// Отрисовка товаров
function renderProducts(products) {
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    products.forEach(product => {
        const card = createProductCard(product);
        container.appendChild(card);
    });
}

// Создание карточки товара
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    card.innerHTML = `
        <img src="${product.image}" alt="${product.name}" class="product-image" />
        <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-description">${product.description}</p>
            <div class="product-footer">
                <span class="product-price">${product.price} ₽</span>
                <button class="buy-button" onclick="buyProduct('${product.id}', '${product.name}', ${product.price})">
                    Купить
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Покупка товара
function buyProduct(productId, productName, price) {
    // Показываем индикатор загрузки
    tg.MainButton.setText('Обработка...');
    tg.MainButton.show();
    
    // Отправляем данные боту
    const data = {
        action: 'buy',
        productId: productId,
        productName: productName,
        price: price
    };
    
    // Отправляем данные в бот
    tg.sendData(JSON.stringify(data));
    
    // Уведомление пользователя
    tg.showAlert(`Вы выбрали: ${productName}\nЦена: ${price} ₽\n\nСейчас откроется окно оплаты.`);
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Настройка темы
    document.body.style.backgroundColor = tg.backgroundColor;
    
    // Загружаем товары
    loadProducts();
    
    // Настройка кнопок WebApp
    tg.ready();
});

// Обработка кнопки "Назад"
tg.BackButton.onClick(() => {
    tg.close();
});
