require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { handleStart, handleHelp, handleShop, handleCallbackQuery } = require('./handlers');
const { handlePreCheckoutQuery, handleSuccessfulPayment } = require('./payments');
const { 
    handleAdminCommand, 
    handleAdminCallback, 
    handleAddKeyCommand,
    handleSetPriceCommand,
    handleSetDiscountCommand,
    handleBulkPriceCommand,
    handleBulkDiscountCommand,
    handleResetDiscountsCommand,
    handleBannersCommand,
    handleBannerCallback
} = require('./adminHandlers');

// Проверка наличия токена
if (!process.env.BOT_TOKEN) {
  console.error('❌ Ошибка: BOT_TOKEN не найден в .env файле');
  process.exit(1);
}

// Создаем бота
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Устанавливаем Menu Button для быстрого доступа к магазину
bot.setChatMenuButton({
  menu_button: {
    type: 'web_app',
    text: '🛍 Магазин',
    web_app: { url: process.env.WEBAPP_URL }
  }
}).then(() => {
  console.log('✅ Menu Button установлена');
}).catch(err => {
  console.error('❌ Ошибка установки Menu Button:', err.message);
});

console.log('🤖 Бот запущен!');

// Обработка команды /start
bot.onText(/\/start/, (msg) => handleStart(bot, msg));

// Обработка команды /help
bot.onText(/\/help/, (msg) => handleHelp(bot, msg));

// Обработка команды /shop
bot.onText(/\/shop/, (msg) => handleShop(bot, msg));

// Обработка команды /admin
bot.onText(/\/admin/, (msg) => handleAdminCommand(bot, msg));

// Обработка команды /addkey
bot.onText(/\/addkey/, (msg) => handleAddKeyCommand(bot, msg));

// Обработка команды /setprice
bot.onText(/\/setprice/, (msg) => handleSetPriceCommand(bot, msg));

// Обработка команды /setdiscount
bot.onText(/\/setdiscount/, (msg) => handleSetDiscountCommand(bot, msg));

// Обработка команды /bulkprice
bot.onText(/\/bulkprice/, (msg) => handleBulkPriceCommand(bot, msg));

// Обработка команды /bulkdiscount
bot.onText(/\/bulkdiscount/, (msg) => handleBulkDiscountCommand(bot, msg));

// Обработка команды /resetdiscounts
bot.onText(/\/resetdiscounts/, (msg) => handleResetDiscountsCommand(bot, msg));

// Обработка команды /banners
bot.onText(/\/banners/, (msg) => handleBannersCommand(bot, msg));

// Обработка callback кнопок
bot.on('callback_query', async (query) => {
  // Проверяем, это админский callback или обычный
  if (query.data.startsWith('admin_') || query.data.startsWith('edit_product_') || 
      query.data.startsWith('banner_') || query.data === 'noop') {
    if (query.data.startsWith('banner_')) {
      await handleBannerCallback(bot, query);
    } else {
      await handleAdminCallback(bot, query);
    }
  } else {
    handleCallbackQuery(bot, query);
  }
});

// Обработка pre-checkout запросов (перед оплатой)
bot.on('pre_checkout_query', (query) => handlePreCheckoutQuery(bot, query));

// Обработка успешной оплаты
bot.on('successful_payment', (msg) => handleSuccessfulPayment(bot, msg));

// Обработка Web App Data (для keyboard button mini apps)
bot.on('web_app_data', (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const data = JSON.parse(msg.web_app_data.data);
    console.log('📱 Web App Data получена:', data);
    
    // Обработка данных из webapp
    if (data.type === 'order') {
      const itemsList = data.items.map(item => 
        `• ${item.name} x${item.quantity} - ${item.price * item.quantity}₽`
      ).join('\n');
      
      const orderMessage = `
✅ *Заказ получен!*

📦 *Товары:*
${itemsList}

💰 *Итого:* ${data.total}₽
📧 *Email:* ${data.email}

⏳ Ожидайте подтверждение оплаты...
      `.trim();
      
      bot.sendMessage(chatId, orderMessage, { parse_mode: 'Markdown' });
      
      // Здесь будет интеграция с ЮКасса
      console.log('💳 Создание платежа для заказа:', data);
    }
  } catch (error) {
    console.error('❌ Ошибка обработки web_app_data:', error);
    bot.sendMessage(chatId, '❌ Ошибка обработки заказа. Попробуйте снова.');
  }
});

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error('❌ Ошибка polling:', error.message);
});

module.exports = bot;
