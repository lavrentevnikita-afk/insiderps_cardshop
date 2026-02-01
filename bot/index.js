require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { handleStart, handleHelp, handleShop, handleCallbackQuery } = require('./handlers');
const { handlePreCheckoutQuery, handleSuccessfulPayment } = require('./payments');

// Проверка наличия токена
if (!process.env.BOT_TOKEN) {
  console.error('❌ Ошибка: BOT_TOKEN не найден в .env файле');
  process.exit(1);
}

// Создаем бота
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

console.log('🤖 Бот запущен!');

// Обработка команды /start
bot.onText(/\/start/, (msg) => handleStart(bot, msg));

// Обработка команды /help
bot.onText(/\/help/, (msg) => handleHelp(bot, msg));

// Обработка команды /shop
bot.onText(/\/shop/, (msg) => handleShop(bot, msg));

// Обработка callback кнопок
bot.on('callback_query', (query) => handleCallbackQuery(bot, query));

// Обработка pre-checkout запросов (перед оплатой)
bot.on('pre_checkout_query', (query) => handlePreCheckoutQuery(bot, query));

// Обработка успешной оплаты
bot.on('successful_payment', (msg) => handleSuccessfulPayment(bot, msg));

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error('❌ Ошибка polling:', error.message);
});

module.exports = bot;
