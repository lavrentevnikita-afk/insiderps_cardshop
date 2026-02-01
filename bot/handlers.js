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

Добро пожаловать в наш магазин цифровых товаров!

🛍 Чтобы открыть магазин, нажми на кнопку ниже или используй команду /shop

❓ Нужна помощь? Используй /help
  `.trim();

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🛍 Перейти в магазин', callback_data: 'shop' }
      ],
      [
        { text: '❓ Помощь', callback_data: 'help' },
        { text: '⭐ Отзывы', url: 'https://t.me/addlist/YOUR_CHANNEL' }
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
📖 *Инструкция по использованию*

*Как купить товар:*
1️⃣ Нажми кнопку "🛍 Перейти в магазин"
2️⃣ Выбери нужный товар
3️⃣ Нажми "Купить"
4️⃣ Оплати через Telegram Payments
5️⃣ Получи свой ключ автоматически!

*Доступные команды:*
/start - Начать работу с ботом
/shop - Открыть магазин
/help - Показать эту справку

*Поддержка:*
Если возникли проблемы, нажми кнопку "💬 Чат с поддержкой"
  `.trim();

  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
}

// Обработчик команды /shop
function handleShop(bot, msg) {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId, 
    '🛍 Для открытия магазина нужно задеплоить Web App на HTTPS хостинг (Vercel/Netlify).\n\nЛокальная версия доступна в браузере: http://localhost:3000\n\nИнструкция по деплою в INSTALLATION.md',
    { parse_mode: 'Markdown' }
  );
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

Добро пожаловать в наш магазин цифровых товаров!

🛍 Выбери действие из меню ниже:
    `.trim();
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🛍 Перейти в магазин', callback_data: 'shop' }
        ],
        [
          { text: '❓ Помощь', callback_data: 'help' },
          { text: '⭐ Отзывы', url: 'https://t.me/addlist/YOUR_CHANNEL' }
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
📖 *Инструкция по использованию*

*Как купить товар:*
1️⃣ Нажми кнопку "🛍 Перейти в магазин"
2️⃣ Выбери нужный товар
3️⃣ Нажми "Купить"
4️⃣ Оплати через Telegram Payments
5️⃣ Получи свой ключ автоматически!

*Доступные команды:*
/start - Начать работу с ботом
/shop - Открыть магазин
/help - Показать эту справку

*Поддержка:*
Если возникли проблемы, нажми кнопку "💬 Чат с поддержкой"
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
    
  } else if (query.data === 'shop') {
    // Показать информацию о магазине
    const shopMessage = `
🛍 *Магазин*

Для открытия магазина нужно задеплоить Web App на HTTPS хостинг (Vercel/Netlify).

*Локальная версия:*
http://localhost:3000

*Инструкция по деплою:*
Смотри файл INSTALLATION.md в репозитории

После деплоя здесь будет кнопка для открытия магазина прямо в Telegram!
    `.trim();
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '« Назад', callback_data: 'back' }
        ]
      ]
    };
    
    bot.editMessageText(shopMessage, {
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
