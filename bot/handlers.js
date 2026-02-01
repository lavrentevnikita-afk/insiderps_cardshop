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
1️⃣ Нажми кнопку "🛍 Открыть магазин"
2️⃣ Выбери нужный товар
3️⃣ Нажми "Купить"
4️⃣ Оплати через Telegram Payments
5️⃣ Получи свой ключ автоматически!

*Доступные команды:*
/start - Начать работу сботом
/shop - Открыть магазин
/help - Показать эту справку

*Поддержка:*
Если возникли проблемы, напиши @support (замените на ваш контакт)
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
  
  if (query.data === 'help') {
    handleHelp(bot, { chat: { id: chatId } });
  } else if (query.data === 'shop') {
    handleShop(bot, { chat: { id: chatId } });
  }
  
  bot.answerCallbackQuery(query.id);
}

module.exports = {
  handleStart,
  handleHelp,
  handleShop,
  handleCallbackQuery
};
