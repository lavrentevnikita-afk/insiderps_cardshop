const fs = require('fs');
const path = require('path');

// Загружаем товары
function getProducts() {
  const productsPath = path.join(__dirname, '../data/products.json');
  const data = fs.readFileSync(productsPath, 'utf-8');
  return JSON.parse(data);
}

// Обработчик команды /start
function handleStart(bot, msg) {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'Друг';
  
  const welcomeMessage = `
👋 Привет, ${userName}!

🎮 *Карты пополнения PlayStation для разных регионов*

Покупайте карты пополнения для турецких, европейских, американских и других региональных аккаунтов PlayStation за рубли.

✅ Моментальная выдача ключей
✅ Официальные карты Sony
✅ Поддержка 24/7
✅ Постоянные скидки

📢 Наш канал: @insider_playstation

🛍 Выберите действие из меню ниже:
  `.trim();

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🛍 Открыть магазин', web_app: { url: process.env.WEBAPP_URL } }
      ],
      [
        { text: '❓ Помощь', callback_data: 'help' },
        { text: '⭐ Отзывы', url: 'https://t.me/insider_playstation' }
      ],
      [
        { text: '💬 Чат с поддержкой', url: 'https://t.me/insider_mngr' }
      ]
    ]
  };

  bot.sendMessage(chatId, welcomeMessage, { reply_markup: keyboard });
}

// Обработчик команды /help
function handleHelp(bot, msg) {
  const chatId = msg.chat.id;
  
  const helpMessage = `
📖 *Инструкция по покупке*

*Как купить карту пополнения:*
1️⃣ Нажмите "🛍 Открыть магазин"
2️⃣ Выберите нужный регион и номинал
3️⃣ Нажмите "Купить"
4️⃣ Оплатите удобным способом
5️⃣ Получите код активации моментально!

*Поддерживаемые регионы:*
🇺🇸 Америка (США)
🇮🇳 Индия
🇵🇱 Польша
🇹🇷 Турция

*Доступные команды:*
/start - Главное меню
/shop - Открыть магазин
/help - Помощь

*Поддержка:*
💬 @insider_mngr
📢 Канал: @insider_playstation
  `.trim();

  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
}

// Обработчик команды /shop
function handleShop(bot, msg) {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'Друг';
  
  const welcomeMessage = `
👋 Привет, ${userName}!

🎮 *Карты пополнения PlayStation для разных регионов*

Покупайте карты пополнения для турецких, европейских, американских и других региональных аккаунтов PlayStation за рубли.

✅ Моментальная выдача ключей
✅ Официальные карты Sony
✅ Поддержка 24/7
✅ Постоянные скидки

📢 Наш канал: @insider_playstation

🛍 Выберите действие из меню ниже:
  `.trim();

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🛍 Открыть магазин', web_app: { url: process.env.WEBAPP_URL } }
      ],
      [
        { text: '❓ Помощь', callback_data: 'help' },
        { text: '⭐ Отзывы', url: 'https://t.me/insider_playstation' }
      ],
      [
        { text: '💬 Чат с поддержкой', url: 'https://t.me/insider_mngr' }
      ]
    ]
  };

  bot.sendMessage(chatId, welcomeMessage, { reply_markup: keyboard });
}

// Обработка callback запросов
function handleCallbackQuery(bot, query) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  if (query.data === 'back') {
    // Возврат к главному меню
    const userName = query.from.first_name || 'Друг';
    const welcomeMessage = `
👋 Привет, ${userName}!

🎮 *Карты пополнения PlayStation для разных регионов*

Покупайте карты пополнения для турецких, европейских, американских и других региональных аккаунтов PlayStation за рубли.

✅ Моментальная выдача ключей
✅ Официальные карты Sony
✅ Поддержка 24/7
✅ Постоянные скидки

📢 Наш канал: @insider_playstation

🛍 Выберите действие из меню ниже:
    `.trim();
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🛍 Открыть магазин', web_app: { url: process.env.WEBAPP_URL } }
        ],
        [
          { text: '❓ Помощь', callback_data: 'help' },
          { text: '⭐ Отзывы', url: 'https://t.me/insider_playstation' }
        ],
        [
          { text: '💬 Чат с поддержкой', url: 'https://t.me/insider_mngr' }
        ]
      ]
    };
    
    bot.editMessageText(welcomeMessage, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    });
    
  } else if (query.data === 'help') {
    // Показать помощь
    const helpMessage = `
📖 *Инструкция по покупке*

*Как купить карту пополнения:*
1️⃣ Нажмите "🛍 Открыть магазин"
2️⃣ Выберите нужный регион и номинал
3️⃣ Нажмите "Купить"
4️⃣ Оплатите удобным способом
5️⃣ Получите код активации моментально!

*Поддерживаемые регионы:*
🇺🇸 Америка (США)
🇮🇳 Индия
🇵🇱 Польша
🇹🇷 Турция

*Доступные команды:*
/start - Главное меню
/shop - Открыть магазин
/help - Помощь

*Поддержка:*
💬 @insider_mngr
📢 Канал: @insider_playstation
    `.trim();
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '« Назад', callback_data: 'back' }
        ]
      ]
    };
    
    bot.editMessageText(helpMessage, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }
  
  bot.answerCallbackQuery(query.id);
}

module.exports = {
  handleStart,
  handleHelp,
  handleShop,
  handleCallbackQuery
};
