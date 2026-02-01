// Инициализация Telegram Web App
let tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

// Данные о картах по регионам
const cardsData = {
    usa: [
        { id: 'usa_10', amount: '10', currency: 'USD', price: 1000, flag: '🇺🇸' },
        { id: 'usa_20', amount: '20', currency: 'USD', price: 1900, flag: '🇺🇸' },
        { id: 'usa_50', amount: '50', currency: 'USD', price: 4500, flag: '🇺🇸' },
        { id: 'usa_100', amount: '100', currency: 'USD', price: 8500, flag: '🇺🇸' }
    ],
    india: [
        { id: 'india_1000', amount: '1000', currency: 'INR', price: 1200, flag: '🇮🇳' },
        { id: 'india_2000', amount: '2000', currency: 'INR', price: 2300, flag: '🇮🇳' },
        { id: 'india_4000', amount: '4000', currency: 'INR', price: 4500, flag: '🇮🇳' }
    ],
    poland: [
        { id: 'poland_50', amount: '50', currency: 'PLN', price: 1300, flag: '🇵🇱' },
        { id: 'poland_100', amount: '100', currency: 'PLN', price: 2500, flag: '🇵🇱' },
        { id: 'poland_200', amount: '200', currency: 'PLN', price: 4900, flag: '🇵🇱' }
    ],
    turkey: [
        { id: 'turkey_50', amount: '50', currency: 'TRY', price: 250, flag: '🇹🇷' },
        { id: 'turkey_100', amount: '100', currency: 'TRY', price: 450, flag: '🇹🇷' },
        { id: 'turkey_200', amount: '200', currency: 'TRY', price: 850, flag: '🇹🇷' },
        { id: 'turkey_500', amount: '500', currency: 'TRY', price: 2000, flag: '🇹🇷' }
    ]
};

let currentRegion = 'usa';

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    initRegionTabs();
    renderProducts(currentRegion);
    setupTelegramTheme();
});

// Настройка темы Telegram
function setupTelegramTheme() {
    document.body.style.backgroundColor = tg.backgroundColor || '#ffffff';
    
    // Настройка главной кнопки
    tg.MainButton.hide();
}

// Инициализация табов регионов
function initRegionTabs() {
    const tabs = document.querySelectorAll('.region-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Убираем active со всех табов
            tabs.forEach(t => t.classList.remove('active'));
            
            // Добавляем active к текущему
            tab.classList.add('active');
            
            // Меняем регион
            currentRegion = tab.dataset.region;
            renderProducts(currentRegion);
            
            // Вибрация
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
        });
    });
}

// Отрисовка товаров
function renderProducts(region) {
    const container = document.getElementById('products-container');
    const cards = cardsData[region] || [];
    
    if (cards.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎮</div>
                <h3>Скоро появятся карты</h3>
                <p>Для этого региона карты пока недоступны</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = cards.map(card => createProductCard(card)).join('');
    
    // Добавляем обработчики на кнопки
    document.querySelectorAll('.buy-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const cardId = e.target.dataset.id;
            handleBuyClick(cardId);
        });
    });
}

// Создание карточки товара
function createProductCard(card) {
    return `
        <div class="product-card">
            <div class="product-header">
                <span class="product-flag">${card.flag}</span>
                <span class="product-amount">${card.amount}</span>
                <span class="product-currency">${card.currency}</span>
            </div>
            <div class="product-body">
                <div class="product-badge">⚡ Моментально</div>
                <div class="product-price">
                    <span class="price-amount">${card.price.toLocaleString('ru-RU')}</span>
                    <span class="price-currency">₽</span>
                </div>
                <button class="buy-button" data-id="${card.id}">
                    Купить сейчас
                </button>
            </div>
        </div>
    `;
}

// Обработка клика по кнопке "Купить"
function handleBuyClick(cardId) {
    // Вибрация
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
    
    // Находим данные карты
    let selectedCard = null;
    for (let region in cardsData) {
        const card = cardsData[region].find(c => c.id === cardId);
        if (card) {
            selectedCard = card;
            break;
        }
    }
    
    if (!selectedCard) return;
    
    // Отправляем данные в бот
    const orderData = {
        action: 'buy',
        cardId: selectedCard.id,
        amount: selectedCard.amount,
        currency: selectedCard.currency,
        price: selectedCard.price
    };
    
    // Показываем уведомление
    tg.showAlert(
        `Вы выбрали карту:\n${selectedCard.amount} ${selected Card.currency}\n\nЦена: ${selectedCard.price} ₽\n\nДля покупки напишите в поддержку:\n@insider_mngr`,
        () => {
            // Закрываем Web App
            tg.close();
        }
    );
    
    // Опционально: отправляем данные боту
    // tg.sendData(JSON.stringify(orderData));
}

// Обработка кнопки "Назад"
tg.BackButton.onClick(() => {
    tg.close();
});

tg.BackButton.show();
