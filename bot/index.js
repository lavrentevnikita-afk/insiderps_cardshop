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
    handleBannerCallback,
    handleBannerInput,
    handleCheckStockCommand,
    handleBulkImportCommand,
    userStates
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

// Обработка команды /checkstock
bot.onText(/\/checkstock/, (msg) => handleCheckStockCommand(bot, msg));

// Обработка команды /bulkimport
bot.onText(/\/bulkimport/, (msg) => handleBulkImportCommand(bot, msg));

// Обработка callback кнопок
bot.on('callback_query', async (query) => {
  // Проверяем, это админский callback или обычный
  if (query.data.startsWith('admin_') || query.data.startsWith('edit_product_') || 
      query.data.startsWith('banner_') || query.data.startsWith('stats_') || query.data === 'noop') {
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

// Обработка обычных текстовых сообщений (для состояний)
bot.on('message', (msg) => {
  // Пропускаем команды и другие типы сообщений
  if (msg.text && msg.text.startsWith('/')) return;
  if (msg.web_app_data) return;
  if (msg.successful_payment) return;
  if (msg.document) {
    // Обработка файлов для массового импорта
    handleDocumentMessage(bot, msg);
    return;
  }
  
  // Проверяем, есть ли активное состояние у пользователя
  const userId = msg.from.id;
  if (userStates.has(userId)) {
    handleBannerInput(bot, msg);
  }
});

// Handle document uploads for bulk import
async function handleDocumentMessage(bot, msg) {
  const userId = msg.from.id;
  const state = userStates.get(userId);
  
  if (!state || state.action !== 'bulk_import_keys') {
    return;
  }
  
  const fs = require('fs');
  const path = require('path');
  const https = require('https');
  const http = require('http');
  
  try {
    const file = await bot.getFile(msg.document.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    
    // Download file
    const protocol = fileUrl.startsWith('https') ? https : http;
    
    protocol.get(fileUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Parse keys from file
        const keys = data.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        if (keys.length === 0) {
          bot.sendMessage(msg.chat.id, '❌ Файл пуст или не содержит ключей');
          userStates.delete(userId);
          return;
        }
        
        // Add keys to product
        const keysPath = path.join(__dirname, '..', 'data', 'keys.json');
        let allKeys = {};
        
        if (fs.existsSync(keysPath)) {
          allKeys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
        }
        
        if (!allKeys[state.productId]) {
          allKeys[state.productId] = [];
        }
        
        const beforeCount = allKeys[state.productId].length;
        allKeys[state.productId].push(...keys);
        const afterCount = allKeys[state.productId].length;
        
        fs.writeFileSync(keysPath, JSON.stringify(allKeys, null, 2));
        
        bot.sendMessage(msg.chat.id, 
          `✅ *Импорт завершен!*\n\n` +
          `📦 Товар: ${state.productName}\n` +
          `➕ Добавлено: ${keys.length} ключей\n` +
          `📊 Было: ${beforeCount} | Стало: ${afterCount}`,
          { parse_mode: 'Markdown' }
        );
        
        userStates.delete(userId);
      });
    }).on('error', (err) => {
      console.error('Error downloading file:', err);
      bot.sendMessage(msg.chat.id, '❌ Ошибка загрузки файла');
      userStates.delete(userId);
    });
    
  } catch (error) {
    console.error('Error processing document:', error);
    bot.sendMessage(msg.chat.id, '❌ Ошибка обработки файла');
    userStates.delete(userId);
  }
}

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
