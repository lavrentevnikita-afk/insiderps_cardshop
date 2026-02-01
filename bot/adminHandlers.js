const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Admin ID - добавьте свой Telegram ID
const ADMIN_ID = process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID) : null;

// User states for multi-step operations
const userStates = new Map();

// Check if user is admin
function isAdmin(userId) {
    if (!ADMIN_ID) {
        console.warn('⚠️ ADMIN_ID не установлен в .env файле');
        return false;
    }
    return userId === ADMIN_ID;
}

// Auto-commit and push changes to GitHub
async function syncToGitHub(message) {
    try {
        const githubToken = process.env.GITHUB_TOKEN;
        const githubRepo = process.env.GITHUB_REPO || 'lavrentevnikita-afk/insiderps_cardshop';
        
        if (!githubToken) {
            console.error('⚠️ GITHUB_TOKEN не установлен в .env');
            return false;
        }
        
        // Настройка remote URL с токеном
        const remoteUrl = `https://${githubToken}@github.com/${githubRepo}.git`;
        
        const { stdout, stderr } = await execPromise(
            `cd /app && git remote set-url origin "${remoteUrl}" && git add data/products.json && git commit -m "${message}" && git push`,
            { cwd: '/app' }
        );
        console.log('✅ Изменения запушены в GitHub:', message);
        return true;
    } catch (error) {
        // Игнорируем ошибку если нет изменений
        if (error.message.includes('nothing to commit')) {
            console.log('ℹ️ Нет изменений для коммита');
            return true;
        }
        console.error('⚠️ Ошибка git push:', error.message);
        return false;
    }
}

// Log admin actions
function logAction(action, userId, details) {
    try {
        const logsPath = path.join(__dirname, '..', 'data', 'logs.json');
        let logs = [];
        
        if (fs.existsSync(logsPath)) {
            logs = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
        }
        
        logs.push({
            timestamp: new Date().toISOString(),
            action,
            userId,
            details
        });
        
        // Храним только последние 500 записей
        if (logs.length > 500) {
            logs = logs.slice(-500);
        }
        
        fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('Ошибка записи лога:', error);
    }
}

// Send notification to admin about new order
async function notifyAdminNewOrder(bot, orderData) {
    if (!ADMIN_ID) return;
    
    try {
        let message = '🔔 *Новый заказ!*\n\n';
        message += `📧 Email: ${orderData.email}\n`;
        message += `💰 Сумма: ${orderData.total}₽\n\n`;
        message += `📦 Товары:\n`;
        
        orderData.items.forEach((item, index) => {
            message += `${index + 1}. ${item.name} x${item.quantity} - ${item.price * item.quantity}₽\n`;
        });
        
        message += `\n🕒 ${new Date().toLocaleString('ru-RU')}`;
        
        if (orderData.telegram_user) {
            message += `\n👤 Пользователь: @${orderData.telegram_user.username || orderData.telegram_user.first_name}`;
        }
        
        await bot.sendMessage(ADMIN_ID, message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Ошибка отправки уведомления админу:', error);
    }
}

// Middleware to check admin access
function requireAdmin(bot, chatId, userId, callback) {
    if (!isAdmin(userId)) {
        bot.sendMessage(chatId, '❌ У вас нет доступа к админ-панели');
        return false;
    }
    callback();
    return true;
}

// Admin main menu
async function handleAdminCommand(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    requireAdmin(bot, chatId, userId, () => {
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '📦 Товары', callback_data: 'admin_products' },
                    { text: '🔑 Ключи', callback_data: 'admin_keys' }
                ],
                [
                    { text: '📊 Заказы', callback_data: 'admin_orders' },
                    { text: '� Статистика', callback_data: 'admin_stats' }
                ],
                [
                    { text: '📢 Баннеры', callback_data: 'admin_banners' },
                    { text: '📝 Шаблоны', callback_data: 'admin_templates' }
                ],
                [
                    { text: '📋 Логи', callback_data: 'admin_logs' },
                    { text: '⚙️ Настройки', callback_data: 'admin_settings' }
                ]
            ]
        };
        
        bot.sendMessage(chatId, 
            '🔧 *Админ-панель*\n\nВыберите раздел для управления:',
            { 
                parse_mode: 'Markdown',
                reply_markup: keyboard 
            }
        );
    });
}

// Products management
async function handleProductsAdmin(bot, chatId, userId, messageId = null) {
    requireAdmin(bot, chatId, userId, async () => {
        const productsPath = path.join(__dirname, '..', 'data', 'products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        
        let message = '📦 *Управление товарами*\n\n';
        
        if (products.length === 0) {
            message += 'Товары не найдены\n\n';
        } else {
            message += `Всего товаров: ${products.length}\n\n`;
            
            // Группируем по регионам
            const regions = {
                'USA': { name: '🇺🇸 США', products: [] },
                'India': { name: '🇮🇳 Индия', products: [] },
                'Poland': { name: '🇵🇱 Польша', products: [] },
                'Turkey': { name: '🇹🇷 Турция', products: [] }
            };
            
            products.forEach(p => {
                if (regions[p.region]) {
                    regions[p.region].products.push(p);
                }
            });
            
            Object.keys(regions).forEach(regionKey => {
                const region = regions[regionKey];
                if (region.products.length > 0) {
                    message += `${region.name}:\n`;
                    region.products.forEach(p => {
                        const discount = p.discount > 0 ? ` (-${p.discount}%)` : '';
                        message += `  • ${p.name} - ${p.price}₽${discount}\n`;
                    });
                    message += '\n';
                }
            });
        }
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '➕ Добавить товар', callback_data: 'admin_add_product' }
                ],
                [
                    { text: '✏️ Редактировать', callback_data: 'admin_edit_product' },
                    { text: '🗑 Удалить', callback_data: 'admin_delete_product' }
                ],
                [
                    { text: '📋 Массовые операции', callback_data: 'admin_bulk_operations' }
                ],
                [
                    { text: '« Назад', callback_data: 'admin_back' }
                ]
            ]
        };
        
        if (messageId) {
            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } else {
            await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }
    });
}

// Keys management
async function handleKeysAdmin(bot, chatId, userId, messageId = null) {
    requireAdmin(bot, chatId, userId, async () => {
        const keysPath = path.join(__dirname, '..', 'data', 'keys.json');
        const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
        
        let message = '🔑 *Управление ключами*\n\n';
        
        const productKeys = Object.keys(keys);
        if (productKeys.length === 0) {
            message += 'Ключи не найдены\n\n';
        } else {
            message += 'Наличие ключей по товарам:\n\n';
            productKeys.forEach(productId => {
                const count = keys[productId]?.length || 0;
                const status = count === 0 ? '❌' : count < 5 ? '⚠️' : '✅';
                message += `${status} ${productId}: ${count} шт.\n`;
            });
        }
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '➕ Добавить ключи', callback_data: 'admin_add_keys' }
                ],
                [
                    { text: '📋 Просмотр всех', callback_data: 'admin_view_keys' }
                ],
                [
                    { text: '« Назад', callback_data: 'admin_back' }
                ]
            ]
        };
        
        if (messageId) {
            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } else {
            await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }
    });
}

// Orders management
async function handleOrdersAdmin(bot, chatId, userId, messageId = null) {
    requireAdmin(bot, chatId, userId, async () => {
        const ordersPath = path.join(__dirname, '..', 'data', 'orders.json');
        let orders = [];
        
        if (fs.existsSync(ordersPath)) {
            orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
        }
        
        let message = '📊 *Статистика заказов*\n\n';
        
        if (orders.length === 0) {
            message += 'Заказов пока нет\n\n';
        } else {
            const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
            const todayOrders = orders.filter(order => {
                const orderDate = new Date(order.timestamp);
                const today = new Date();
                return orderDate.toDateString() === today.toDateString();
            });
            
            message += `📦 Всего заказов: ${orders.length}\n`;
            message += `💰 Общая выручка: ${totalRevenue}₽\n`;
            message += `📅 Заказов сегодня: ${todayOrders.length}\n\n`;
            
            message += '🕐 Последние 3 заказа:\n\n';
            orders.slice(-3).reverse().forEach((order, index) => {
                const date = new Date(order.timestamp).toLocaleString('ru-RU');
                message += `${index + 1}. ${order.total}₽ - ${date}\n`;
                if (order.telegram_user) {
                    message += `   Telegram: @${order.telegram_user.username || 'без username'}\n`;
                } else if (order.email) {
                    message += `   Email: ${order.email}\n`;
                }
            });
        }
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '📋 Все заказы', callback_data: 'admin_view_orders' }
                ],
                [
                    { text: '« Назад', callback_data: 'admin_back' }
                ]
            ]
        };
        
        if (messageId) {
            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } else {
            await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }
    });
}

// Banners management
async function handleBannersAdmin(bot, chatId, userId, messageId = null) {
    requireAdmin(bot, chatId, userId, async () => {
        // Удаляем старое сообщение и вызываем полноценную систему баннеров
        if (messageId) {
            await bot.deleteMessage(chatId, messageId);
        }
        handleBannersCommand(bot, { chat: { id: chatId }, from: { id: userId } });
    });
}

// Settings
async function handleSettingsAdmin(bot, chatId, userId, messageId = null) {
    requireAdmin(bot, chatId, userId, async () => {
        const message = '⚙️ *Настройки*\n\n' +
                       `👤 Admin ID: ${ADMIN_ID}\n` +
                       `🤖 Bot работает\n\n` +
                       '💡 Для изменения настроек отредактируйте .env файл';
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '« Назад', callback_data: 'admin_back' }
                ]
            ]
        };
        
        if (messageId) {
            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } else {
            await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }
    });
}

// Add keys handler
async function handleAddKeys(bot, chatId, userId) {
    requireAdmin(bot, chatId, userId, async () => {
        const message = '🔑 *Добавление ключей*\n\n' +
                       'Для добавления ключей отправьте сообщение в формате:\n\n' +
                       '`/addkey PRODUCT_ID`\n' +
                       '`KEY1-XXXX-YYYY-ZZZZ`\n' +
                       '`KEY2-XXXX-YYYY-ZZZZ`\n' +
                       '`KEY3-XXXX-YYYY-ZZZZ`\n\n' +
                       'Пример:\n' +
                       '`/addkey us_5`\n' +
                       '`USA5-1234-5678-9012`\n' +
                       '`USA5-2345-6789-0123`';
        
        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown'
        });
    });
}

// Add key command
async function handleAddKeyCommand(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    requireAdmin(bot, chatId, userId, () => {
        const text = msg.text.split('\n');
        const firstLine = text[0].split(' ');
        
        if (firstLine.length < 2) {
            bot.sendMessage(chatId, '❌ Формат: /addkey PRODUCT_ID\nКлюч1\nКлюч2...');
            return;
        }
        
        const productId = firstLine[1];
        const newKeys = text.slice(1).filter(k => k.trim());
        
        if (newKeys.length === 0) {
            bot.sendMessage(chatId, '❌ Не указаны ключи');
            return;
        }
        
        const keysPath = path.join(__dirname, '..', 'data', 'keys.json');
        const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
        
        if (!keys[productId]) {
            keys[productId] = [];
        }
        
        keys[productId].push(...newKeys);
        
        fs.writeFileSync(keysPath, JSON.stringify(keys, null, 2));
        
        bot.sendMessage(chatId, 
            `✅ Добавлено ${newKeys.length} ключей для товара ${productId}\n\n` +
            `Всего ключей: ${keys[productId].length}`
        );
    });
}

// Set product price
async function handleSetPriceCommand(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    requireAdmin(bot, chatId, userId, async () => {
        const parts = msg.text.split(' ');
        
        if (parts.length < 3) {
            bot.sendMessage(chatId, '❌ Формат: /setprice PRODUCT_ID ЦЕНА\nПример: /setprice us_5 500');
            return;
        }
        
        const productId = parts[1];
        const newPrice = parseInt(parts[2]);
        
        if (isNaN(newPrice) || newPrice <= 0) {
            bot.sendMessage(chatId, '❌ Цена должна быть положительным числом');
            return;
        }
        
        const productsPath = path.join(__dirname, '..', 'data', 'products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        const productIndex = products.findIndex(p => p.id === productId);
        
        if (productIndex === -1) {
            bot.sendMessage(chatId, '❌ Товар не найден');
            return;
        }
        
        const oldPrice = products[productIndex].price;
        products[productIndex].price = newPrice;
        
        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
        
        // Логируем действие
        logAction('SET_PRICE', userId, { productId, oldPrice, newPrice });
        
        // Синхронизируем с GitHub
        const synced = await syncToGitHub(`Обновлена цена ${productId}: ${oldPrice}₽ → ${newPrice}₽`);
        const syncStatus = synced ? '\n\n🔄 Изменения синхронизированы с сайтом!' : '\n\n⚠️ Изменения сохранены локально';
        
        bot.sendMessage(chatId, 
            `✅ Цена товара обновлена!\n\n` +
            `📦 ${products[productIndex].name}\n` +
            `💰 Старая цена: ${oldPrice}₽\n` +
            `💰 Новая цена: ${newPrice}₽` +
            syncStatus
        );
    });
}

// Set product discount
async function handleSetDiscountCommand(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    requireAdmin(bot, chatId, userId, async () => {
        const parts = msg.text.split(' ');
        
        if (parts.length < 3) {
            bot.sendMessage(chatId, '❌ Формат: /setdiscount PRODUCT_ID СКИДКА\nПример: /setdiscount us_5 15');
            return;
        }
        
        const productId = parts[1];
        const newDiscount = parseInt(parts[2]);
        
        if (isNaN(newDiscount) || newDiscount < 0 || newDiscount > 100) {
            bot.sendMessage(chatId, '❌ Скидка должна быть от 0 до 100');
            return;
        }
        
        const productsPath = path.join(__dirname, '..', 'data', 'products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        const productIndex = products.findIndex(p => p.id === productId);
        
        if (productIndex === -1) {
            bot.sendMessage(chatId, '❌ Товар не найден');
            return;
        }
        
        const oldDiscount = products[productIndex].discount;
        products[productIndex].discount = newDiscount;
        
        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
        
        // Логируем действие
        logAction('SET_DISCOUNT', userId, { productId, oldDiscount, newDiscount });
        
        // Синхронизируем с GitHub
        const synced = await syncToGitHub(`Обновлена скидка ${productId}: ${oldDiscount}% → ${newDiscount}%`);
        const syncStatus = synced ? '\n\n🔄 Изменения синхронизированы с сайтом!' : '\n\n⚠️ Изменения сохранены локально';
        
        bot.sendMessage(chatId, 
            `✅ Скидка обновлена!\n\n` +
            `📦 ${products[productIndex].name}\n` +
            `🏷 Старая скидка: ${oldDiscount}%\n` +
            `🏷 Новая скидка: ${newDiscount}%\n` +
            `💰 Цена со скидкой: ${products[productIndex].price}₽` +
            syncStatus
        );
    });
}

// Handle admin callbacks
async function handleAdminCallback(bot, query) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const messageId = query.message.message_id;
    const data = query.data;
    
    if (!isAdmin(userId)) {
        await bot.answerCallbackQuery(query.id, {
            text: '❌ У вас нет доступа',
            show_alert: true
        });
        return;
    }
    
    await bot.answerCallbackQuery(query.id);
    
    switch(data) {
        case 'admin_back':
            // Редактируем сообщение для возврата в главное меню
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '📦 Товары', callback_data: 'admin_products' },
                        { text: '🔑 Ключи', callback_data: 'admin_keys' }
                    ],
                    [
                        { text: '📊 Заказы', callback_data: 'admin_orders' },
                        { text: '� Статистика', callback_data: 'admin_stats' }
                    ],
                    [
                        { text: '📢 Баннеры', callback_data: 'admin_banners' },
                        { text: '📝 Шаблоны', callback_data: 'admin_templates' }
                    ],
                    [
                        { text: '📋 Логи', callback_data: 'admin_logs' },
                        { text: '⚙️ Настройки', callback_data: 'admin_settings' }
                    ]
                ]
            };
            
            await bot.editMessageText(
                '🔧 *Админ-панель*\n\nВыберите раздел для управления:',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                }
            );
            break;
        case 'admin_products':
            await handleProductsAdmin(bot, chatId, userId, messageId);
            break;
        case 'admin_keys':
            await handleKeysAdmin(bot, chatId, userId, messageId);
            break;
        case 'admin_orders':
            await handleOrdersAdmin(bot, chatId, userId, messageId);
            break;
        case 'admin_banners':
            await handleBannersAdmin(bot, chatId, userId, messageId);
            break;
        case 'admin_settings':
            await handleSettingsAdmin(bot, chatId, userId, messageId);
            break;
        case 'admin_stats':
            await handleStatsAdmin(bot, chatId, userId, messageId);
            break;
        case 'admin_templates':
            await handleTemplatesAdmin(bot, chatId, userId, messageId);
            break;
        case 'admin_logs':
            await handleLogsAdmin(bot, chatId, userId, messageId);
            break;
        case 'admin_bulk_operations':
            await handleBulkOperations(bot, chatId, userId, messageId);
            break;
        case 'admin_add_keys':
            await handleAddKeys(bot, chatId, userId);
            break;
        case 'admin_edit_product':
            await handleEditProductList(bot, chatId, userId, messageId);
            break;
        case 'admin_add_product':
        case 'admin_delete_product':
        case 'admin_view_keys':
        case 'admin_view_orders':
            await bot.editMessageText('⚠️ Функция в разработке', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: [[
                        { text: '« Назад', callback_data: 'admin_back' }
                    ]]
                }
            });
            break;
        case 'noop':
            // Игнорируем заголовки регионов
            await bot.answerCallbackQuery(query.id);
            break;
        default:
            // Обработка редактирования конкретного товара
            if (data.startsWith('edit_product_')) {
                const productId = data.replace('edit_product_', '');
                userStates.delete(userId); // Сброс состояния
                await handleEditProductForm(bot, chatId, userId, productId, messageId);
            }
            // Обработка изменения цены товара
            else if (data.startsWith('product_price_')) {
                const productId = data.replace('product_price_', '');
                handleProductPriceEdit(bot, query, productId);
            }
            // Обработка изменения скидки товара
            else if (data.startsWith('product_discount_')) {
                const productId = data.replace('product_discount_', '');
                handleProductDiscountEdit(bot, query, productId);
            }
            break;
    }
}

// Show list of products to edit
async function handleEditProductList(bot, chatId, userId, messageId = null) {
    requireAdmin(bot, chatId, userId, async () => {
        const productsPath = path.join(__dirname, '..', 'data', 'products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        
        const keyboard = {
            inline_keyboard: []
        };
        
        // Группируем по регионам
        const regions = {
            'USA': { name: '🇺🇸 США', products: [] },
            'India': { name: '🇮🇳 Индия', products: [] },
            'Poland': { name: '🇵🇱 Польша', products: [] },
            'Turkey': { name: '🇹🇷 Турция', products: [] }
        };
        
        products.forEach(p => {
            if (regions[p.region]) {
                regions[p.region].products.push(p);
            }
        });
        
        Object.keys(regions).forEach(regionKey => {
            const region = regions[regionKey];
            if (region.products.length > 0) {
                // Заголовок региона
                keyboard.inline_keyboard.push([
                    { text: region.name, callback_data: 'noop' }
                ]);
                // Товары региона
                region.products.forEach(p => {
                    const discount = p.discount > 0 ? ` (-${p.discount}%)` : '';
                    keyboard.inline_keyboard.push([
                        { text: `${p.name} - ${p.price}₽${discount}`, callback_data: `edit_product_${p.id}` }
                    ]);
                });
            }
        });
        
        keyboard.inline_keyboard.push([
            { text: '« Назад', callback_data: 'admin_products' }
        ]);
        
        if (messageId) {
            await bot.editMessageText('✏️ *Выберите товар для редактирования:*', {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } else {
            await bot.sendMessage(chatId, 
                '✏️ *Выберите товар для редактирования:*',
                {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                }
            );
        }
    });
}

// Show edit form for specific product
async function handleEditProductForm(bot, chatId, userId, productId, messageId = null) {
    requireAdmin(bot, chatId, userId, async () => {
        const productsPath = path.join(__dirname, '..', 'data', 'products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            await bot.sendMessage(chatId, '❌ Товар не найден');
            return;
        }
        
        const finalPrice = Math.round(product.price * (1 - product.discount / 100));
        
        const message = `✏️ *Редактирование товара*\n\n` +
                       `📦 *Товар:* ${product.name}\n` +
                       `🌍 *Регион:* ${product.region}\n` +
                       `💵 *Валюта:* ${product.currency}\n\n` +
                       `💰 *Цена:* ${product.price}₽\n` +
                       `🏷 *Скидка:* ${product.discount}%\n` +
                       `💳 *Итоговая цена:* ${finalPrice}₽`;
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '💰 Изменить цену', callback_data: `product_price_${productId}` },
                    { text: '🏷 Изменить скидку', callback_data: `product_discount_${productId}` }
                ],
                [
                    { text: '« К списку товаров', callback_data: 'admin_edit_product' }
                ],
                [
                    { text: '« Назад', callback_data: 'admin_products' }
                ]
            ]
        };
        
        if (messageId) {
            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } else {
            await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }
    });
}

// Statistics handler
async function handleStatsAdmin(bot, chatId, userId, messageId = null) {
    requireAdmin(bot, chatId, userId, async () => {
        const ordersPath = path.join(__dirname, '..', 'data', 'orders.json');
        const productsPath = path.join(__dirname, '..', 'data', 'products.json');
        
        let orders = [];
        if (fs.existsSync(ordersPath)) {
            orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
        }
        
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        
        // Общая статистика
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const avgOrder = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;
        
        // Статистика за сегодня
        const today = new Date();
        const todayOrders = orders.filter(order => {
            const orderDate = new Date(order.timestamp);
            return orderDate.toDateString() === today.toDateString();
        });
        const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        
        // Статистика за неделю
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weekOrders = orders.filter(order => new Date(order.timestamp) >= weekAgo);
        const weekRevenue = weekOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        
        // Топ товаров
        const productSales = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                if (!productSales[item.id]) {
                    productSales[item.id] = {
                        name: item.name,
                        count: 0,
                        revenue: 0
                    };
                }
                productSales[item.id].count += item.quantity;
                productSales[item.id].revenue += item.price * item.quantity;
            });
        });
        
        const topProducts = Object.entries(productSales)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5);
        
        let message = '📈 *Статистика продаж*\n\n';
        message += '💰 *Общая статистика:*\n';
        message += `📦 Всего заказов: ${orders.length}\n`;
        message += `💵 Общая выручка: ${totalRevenue}₽\n`;
        message += `📊 Средний чек: ${avgOrder}₽\n\n`;
        
        message += '📅 *За сегодня:*\n';
        message += `📦 Заказов: ${todayOrders.length}\n`;
        message += `💵 Выручка: ${todayRevenue}₽\n\n`;
        
        message += '📊 *За неделю:*\n';
        message += `📦 Заказов: ${weekOrders.length}\n`;
        message += `💵 Выручка: ${weekRevenue}₽\n\n`;
        
        if (topProducts.length > 0) {
            message += '🏆 *Топ товаров:*\n';
            topProducts.forEach((item, index) => {
                const [id, data] = item;
                message += `${index + 1}. ${data.name}\n`;
                message += `   Продано: ${data.count} шт. | ${data.revenue}₽\n`;
            });
        }
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '« Назад', callback_data: 'admin_back' }
                ]
            ]
        };
        
        if (messageId) {
            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } else {
            await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }
    });
}

// Templates handler
async function handleTemplatesAdmin(bot, chatId, userId, messageId = null) {
    requireAdmin(bot, chatId, userId, async () => {
        const templates = {
            'psn_card': {
                name: 'PSN карта',
                description: 'Карта пополнения PlayStation Store на {VALUE} для аккаунта региона {REGION}. Моментальная доставка после оплаты.'
            },
            'game_code': {
                name: 'Код игры',
                description: 'Цифровой код активации игры для PlayStation {CONSOLE}. Регион: {REGION}. Активация сразу после покупки.'
            },
            'subscription': {
                name: 'Подписка',
                description: 'Подписка PlayStation Plus на {DURATION}. Регион: {REGION}. Все преимущества PS Plus.'
            }
        };
        
        let message = '📝 *Шаблоны описаний*\n\n';
        message += 'Доступные шаблоны для быстрого создания товаров:\n\n';
        
        Object.keys(templates).forEach(key => {
            const template = templates[key];
            message += `*${template.name}* (\`${key}\`)\n`;
            message += `${template.description}\n\n`;
        });
        
        message += 'Используйте команду:\n';
        message += '`/usetemplate TEMPLATE_ID`\n\n';
        message += 'Переменные:\n';
        message += '`{VALUE}` - номинал\n';
        message += '`{REGION}` - регион\n';
        message += '`{CONSOLE}` - консоль\n';
        message += '`{DURATION}` - длительность';
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '« Назад', callback_data: 'admin_back' }
                ]
            ]
        };
        
        if (messageId) {
            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } else {
            await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }
    });
}

// Logs handler
async function handleLogsAdmin(bot, chatId, userId, messageId = null) {
    requireAdmin(bot, chatId, userId, async () => {
        const logsPath = path.join(__dirname, '..', 'data', 'logs.json');
        let logs = [];
        
        if (fs.existsSync(logsPath)) {
            logs = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
        }
        
        let message = '📋 *Логи действий администратора*\n\n';
        
        if (logs.length === 0) {
            message += 'Логи пусты\n';
        } else {
            // Последние 10 действий
            const recentLogs = logs.slice(-10).reverse();
            
            recentLogs.forEach(log => {
                const date = new Date(log.timestamp).toLocaleString('ru-RU');
                message += `🕒 ${date}\n`;
                message += `👤 Админ: ${log.userId}\n`;
                message += `🔧 Действие: ${log.action}\n`;
                
                if (log.details) {
                    if (log.details.productId) message += `📦 Товар: ${log.details.productId}\n`;
                    if (log.details.oldPrice !== undefined) message += `💰 ${log.details.oldPrice}₽ → ${log.details.newPrice}₽\n`;
                    if (log.details.oldDiscount !== undefined) message += `🏷 ${log.details.oldDiscount}% → ${log.details.newDiscount}%\n`;
                }
                
                message += '\n';
            });
            
            message += `\nВсего записей: ${logs.length}`;
        }
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '🗑 Очистить логи', callback_data: 'admin_clear_logs' }
                ],
                [
                    { text: '« Назад', callback_data: 'admin_back' }
                ]
            ]
        };
        
        if (messageId) {
            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } else {
            await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }
    });
}

// Bulk operations handler
async function handleBulkOperations(bot, chatId, userId, messageId = null) {
    requireAdmin(bot, chatId, userId, async () => {
        let message = '📋 *Массовые операции*\n\n';
        message += 'Доступные операции:\n\n';
        message += '1️⃣ *Массовое изменение цен*\n';
        message += 'Команда: `/bulkprice REGION MULTIPLIER`\n';
        message += 'Пример: `/bulkprice USA 1.1` (цены +10%)\n\n';
        
        message += '2️⃣ *Массовая скидка*\n';
        message += 'Команда: `/bulkdiscount REGION DISCOUNT`\n';
        message += 'Пример: `/bulkdiscount India 15` (скидка 15%)\n\n';
        
        message += '3️⃣ *Сброс всех скидок*\n';
        message += 'Команда: `/resetdiscounts`\n\n';
        
        message += 'Регионы: `USA`, `India`, `Poland`, `Turkey` или `ALL`';
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '« Назад', callback_data: 'admin_products' }
                ]
            ]
        };
        
        if (messageId) {
            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } else {
            await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }
    });
}

// Bulk price change
async function handleBulkPriceCommand(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    requireAdmin(bot, chatId, userId, async () => {
        const parts = msg.text.split(' ');
        
        if (parts.length < 3) {
            bot.sendMessage(chatId, '❌ Формат: /bulkprice REGION MULTIPLIER\nПример: /bulkprice USA 1.1');
            return;
        }
        
        const region = parts[1].toUpperCase();
        const multiplier = parseFloat(parts[2]);
        
        if (isNaN(multiplier) || multiplier <= 0) {
            bot.sendMessage(chatId, '❌ Множитель должен быть положительным числом');
            return;
        }
        
        const productsPath = path.join(__dirname, '..', 'data', 'products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        
        let updatedCount = 0;
        products.forEach(product => {
            if (region === 'ALL' || product.region === region) {
                product.price = Math.round(product.price * multiplier);
                updatedCount++;
            }
        });
        
        if (updatedCount === 0) {
            bot.sendMessage(chatId, '❌ Товары для указанного региона не найдены');
            return;
        }
        
        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
        
        // Логируем действие
        logAction('BULK_PRICE', userId, { region, multiplier, count: updatedCount });
        
        // Синхронизируем с GitHub
        const change = multiplier > 1 ? `+${Math.round((multiplier - 1) * 100)}%` : `-${Math.round((1 - multiplier) * 100)}%`;
        await syncToGitHub(`Массовое изменение цен ${region}: ${change}`);
        
        bot.sendMessage(chatId, 
            `✅ Цены обновлены!\n\n` +
            `🌍 Регион: ${region}\n` +
            `📊 Изменение: ${change}\n` +
            `📦 Обновлено товаров: ${updatedCount}\n\n` +
            `🔄 Изменения синхронизированы с сайтом!`
        );
    });
}

// Bulk discount change
async function handleBulkDiscountCommand(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    requireAdmin(bot, chatId, userId, async () => {
        const parts = msg.text.split(' ');
        
        if (parts.length < 3) {
            bot.sendMessage(chatId, '❌ Формат: /bulkdiscount REGION DISCOUNT\nПример: /bulkdiscount India 15');
            return;
        }
        
        const region = parts[1].toUpperCase();
        const discount = parseInt(parts[2]);
        
        if (isNaN(discount) || discount < 0 || discount > 100) {
            bot.sendMessage(chatId, '❌ Скидка должна быть от 0 до 100');
            return;
        }
        
        const productsPath = path.join(__dirname, '..', 'data', 'products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        
        let updatedCount = 0;
        products.forEach(product => {
            if (region === 'ALL' || product.region === region) {
                product.discount = discount;
                updatedCount++;
            }
        });
        
        if (updatedCount === 0) {
            bot.sendMessage(chatId, '❌ Товары для указанного региона не найдены');
            return;
        }
        
        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
        
        // Логируем действие
        logAction('BULK_DISCOUNT', userId, { region, discount, count: updatedCount });
        
        // Синхронизируем с GitHub
        await syncToGitHub(`Массовая установка скидок ${region}: ${discount}%`);
        
        bot.sendMessage(chatId, 
            `✅ Скидки обновлены!\n\n` +
            `🌍 Регион: ${region}\n` +
            `🏷 Скидка: ${discount}%\n` +
            `📦 Обновлено товаров: ${updatedCount}\n\n` +
            `🔄 Изменения синхронизированы с сайтом!`
        );
    });
}

// Reset all discounts
async function handleResetDiscountsCommand(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    requireAdmin(bot, chatId, userId, async () => {
        const productsPath = path.join(__dirname, '..', 'data', 'products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        
        products.forEach(product => {
            product.discount = 0;
        });
        
        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
        
        // Логируем действие
        logAction('RESET_DISCOUNTS', userId, { count: products.length });
        
        // Синхронизируем с GitHub
        await syncToGitHub('Сброс всех скидок');
        
        bot.sendMessage(chatId, 
            `✅ Все скидки сброшены!\n\n` +
            `📦 Обновлено товаров: ${products.length}\n\n` +
            `🔄 Изменения синхронизированы с сайтом!`
        );
    });
}

// ============================================
// BANNER MANAGEMENT
// ============================================

const BANNERS_FILE = path.join(__dirname, '../data/banners.json');

// Load banners
function loadBanners() {
    try {
        if (!fs.existsSync(BANNERS_FILE)) {
            fs.writeFileSync(BANNERS_FILE, JSON.stringify([], null, 2));
            return [];
        }
        const data = fs.readFileSync(BANNERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Ошибка загрузки баннеров:', error);
        return [];
    }
}

// Save banners
function saveBanners(banners) {
    try {
        fs.writeFileSync(BANNERS_FILE, JSON.stringify(banners, null, 2));
        return true;
    } catch (error) {
        console.error('Ошибка сохранения баннеров:', error);
        return false;
    }
}

// Handle /banners command
function handleBannersCommand(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!isAdmin(userId)) {
        bot.sendMessage(chatId, '⛔ У вас нет доступа к этой команде');
        return;
    }
    
    const banners = loadBanners();
    
    if (banners.length === 0) {
        bot.sendMessage(chatId, 
            '📋 Список баннеров пуст\n\n' +
            'Используйте /addbanner для создания нового баннера',
            {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '➕ Добавить баннер', callback_data: 'banner_add' }
                    ]]
                }
            }
        );
        return;
    }
    
    let message = '🎨 *Управление баннерами*\n\n';
    
    banners.forEach((banner, index) => {
        const status = banner.enabled ? '🟢' : '🔴';
        message += `${status} *Баннер #${banner.id}*\n`;
        message += `📝 ${banner.title}\n`;
        message += `📄 ${banner.subtitle}\n`;
        if (banner.image) message += `🖼️ Изображение: есть\n`;
        if (banner.link) message += `🔗 Ссылка: ${banner.link}\n`;
        message += `📊 Порядок: ${banner.order}\n`;
        message += '\n';
    });
    
    const keyboard = [];
    
    // Кнопки для каждого баннера
    banners.forEach(banner => {
        const status = banner.enabled ? '🟢' : '🔴';
        keyboard.push([
            { text: `${status} Баннер #${banner.id}`, callback_data: `banner_view_${banner.id}` }
        ]);
    });
    
    // Кнопка добавления нового
    keyboard.push([
        { text: '➕ Добавить новый баннер', callback_data: 'banner_add' }
    ]);
    
    bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: keyboard
        }
    });
}

// Handle banner view
function handleBannerView(bot, query, bannerId) {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const userId = query.from.id;
    
    if (!isAdmin(userId)) {
        bot.answerCallbackQuery(query.id, { text: '⛔ Нет доступа' });
        return;
    }
    
    const banners = loadBanners();
    const banner = banners.find(b => b.id === parseInt(bannerId));
    
    if (!banner) {
        bot.answerCallbackQuery(query.id, { text: '❌ Баннер не найден' });
        return;
    }
    
    const status = banner.enabled ? '🟢 Активен' : '🔴 Отключен';
    
    let message = `🎨 *Баннер #${banner.id}*\n\n`;
    message += `📝 *Заголовок:* ${banner.title}\n`;
    message += `📄 *Подзаголовок:* ${banner.subtitle}\n`;
    message += `🔘 *Статус:* ${status}\n`;
    message += `📊 *Порядок:* ${banner.order}\n`;
    if (banner.image) message += `🖼️ *Изображение:* установлено\n`;
    if (banner.link) message += `🔗 *Ссылка:* ${banner.link}\n`;
    
    const keyboard = [
        [
            { text: banner.enabled ? '❌ Отключить' : '✅ Включить', 
              callback_data: `banner_toggle_${banner.id}` }
        ],
        [
            { text: '✏️ Редактировать', callback_data: `banner_edit_${banner.id}` },
            { text: '🖼️ Изменить фото', callback_data: `banner_photo_${banner.id}` }
        ],
        [
            { text: '🔗 Изменить ссылку', callback_data: `banner_link_${banner.id}` },
            { text: '📊 Изменить порядок', callback_data: `banner_order_${banner.id}` }
        ],
        [
            { text: '🗑️ Удалить баннер', callback_data: `banner_delete_${banner.id}` }
        ],
        [
            { text: '« Назад к списку', callback_data: 'banner_list' }
        ]
    ];
    
    if (banner.image) {
        // Если есть изображение, отправим его
        bot.editMessageText(message, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    } else {
        bot.editMessageText(message, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }
    
    bot.answerCallbackQuery(query.id);
}

// Handle banner toggle
function handleBannerToggle(bot, query, bannerId) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    
    if (!isAdmin(userId)) {
        bot.answerCallbackQuery(query.id, { text: '⛔ Нет доступа' });
        return;
    }
    
    const banners = loadBanners();
    const banner = banners.find(b => b.id === parseInt(bannerId));
    
    if (!banner) {
        bot.answerCallbackQuery(query.id, { text: '❌ Баннер не найден' });
        return;
    }
    
    banner.enabled = !banner.enabled;
    saveBanners(banners);
    
    logAction('TOGGLE_BANNER', userId, { 
        bannerId: banner.id, 
        enabled: banner.enabled 
    });
    
    // Синхронизируем с GitHub
    syncToGitHub(`${banner.enabled ? 'Включен' : 'Отключен'} баннер #${banner.id}`);
    
    const statusText = banner.enabled ? '✅ включен' : '❌ отключен';
    bot.answerCallbackQuery(query.id, { 
        text: `Баннер ${statusText}`,
        show_alert: false
    });
    
    // Обновляем отображение
    handleBannerView(bot, query, bannerId);
}

// Handle add banner
function handleAddBanner(bot, query) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    
    if (!isAdmin(userId)) {
        bot.answerCallbackQuery(query.id, { text: '⛔ Нет доступа' });
        return;
    }
    
    // Устанавливаем состояние
    userStates.set(userId, { 
        action: 'banner_add_title',
        menuMessageId: query.message.message_id,
        messagesToDelete: []
    });
    
    bot.editMessageText(
        '➕ *Создание нового баннера*\n\n' +
        '📝 Отправьте заголовок для нового баннера\n' +
        '_(например: "СКИДКИ ДО 50%")_',
        {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: '❌ Отмена', callback_data: 'banner_cancel' }
                ]]
            }
        }
    );
    
    bot.answerCallbackQuery(query.id);
}

// Handle admin text input (banners and products)
async function handleBannerInput(bot, msg) {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const state = userStates.get(userId);
    
    if (!state) return;
    if (!isAdmin(userId)) return;
    
    // Удаляем сообщение пользователя
    try {
        await bot.deleteMessage(chatId, msg.message_id);
    } catch (e) {}
    
    // PRODUCT HANDLERS
    if (state.action === 'product_edit_price') {
        const newPrice = parseInt(msg.text);
        const productId = state.productId;
        
        if (isNaN(newPrice) || newPrice <= 0) {
            await bot.editMessageText(
                '❌ *Ошибка!*\n\n' +
                'Цена должна быть положительным числом\n\n' +
                'Попробуйте еще раз:',
                {
                    chat_id: chatId,
                    message_id: state.menuMessageId,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '❌ Отмена', callback_data: `edit_product_${productId}` }
                        ]]
                    }
                }
            );
            return;
        }
        
        const productsPath = path.join(__dirname, '..', 'data', 'products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        const productIndex = products.findIndex(p => p.id === productId);
        
        if (productIndex !== -1) {
            const oldPrice = products[productIndex].price;
            products[productIndex].price = newPrice;
            fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
            
            logAction('SET_PRICE', userId, { productId, oldPrice, newPrice });
            await syncToGitHub(`Обновлена цена ${productId}: ${oldPrice}₽ → ${newPrice}₽`);
            
            userStates.delete(userId);
            
            await bot.editMessageText(
                `✅ *Цена обновлена!*\n\n` +
                `📦 ${products[productIndex].name}\n` +
                `💰 Старая цена: ${oldPrice}₽\n` +
                `💰 Новая цена: ${newPrice}₽\n\n` +
                `🔄 Изменения синхронизированы с сайтом!`,
                {
                    chat_id: chatId,
                    message_id: state.menuMessageId,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '« К товару', callback_data: `edit_product_${productId}` }
                        ]]
                    }
                }
            );
        }
        return;
    }
    
    if (state.action === 'product_edit_discount') {
        const newDiscount = parseInt(msg.text);
        const productId = state.productId;
        
        if (isNaN(newDiscount) || newDiscount < 0 || newDiscount > 100) {
            await bot.editMessageText(
                '❌ *Ошибка!*\n\n' +
                'Скидка должна быть от 0 до 100\n\n' +
                'Попробуйте еще раз:',
                {
                    chat_id: chatId,
                    message_id: state.menuMessageId,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '❌ Отмена', callback_data: `edit_product_${productId}` }
                        ]]
                    }
                }
            );
            return;
        }
        
        const productsPath = path.join(__dirname, '..', 'data', 'products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        const productIndex = products.findIndex(p => p.id === productId);
        
        if (productIndex !== -1) {
            const oldDiscount = products[productIndex].discount;
            products[productIndex].discount = newDiscount;
            fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
            
            logAction('SET_DISCOUNT', userId, { productId, oldDiscount, newDiscount });
            await syncToGitHub(`Обновлена скидка ${productId}: ${oldDiscount}% → ${newDiscount}%`);
            
            userStates.delete(userId);
            
            const finalPrice = Math.round(products[productIndex].price * (1 - newDiscount / 100));
            
            await bot.editMessageText(
                `✅ *Скидка обновлена!*\n\n` +
                `📦 ${products[productIndex].name}\n` +
                `🏷 Старая скидка: ${oldDiscount}%\n` +
                `🏷 Новая скидка: ${newDiscount}%\n` +
                `💳 Итоговая цена: ${finalPrice}₽\n\n` +
                `🔄 Изменения синхронизированы с сайтом!`,
                {
                    chat_id: chatId,
                    message_id: state.menuMessageId,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '« К товару', callback_data: `edit_product_${productId}` }
                        ]]
                    }
                }
            );
        }
        return;
    }
    
    // BANNER HANDLERS
    if (state.action === 'banner_add_title') {
        const title = msg.text;
        
        // Обновляем состояние
        userStates.set(userId, {
            action: 'banner_add_subtitle',
            title: title,
            menuMessageId: state.menuMessageId,
            messagesToDelete: state.messagesToDelete
        });
        
        // Обновляем сообщение
        await bot.editMessageText(
            '➕ *Создание нового баннера*\n\n' +
            `✅ Заголовок: *${title}*\n\n` +
            '📝 Теперь отправьте подзаголовок\n' +
            '_(например: "Только сегодня!")_',
            {
                chat_id: chatId,
                message_id: state.menuMessageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '❌ Отмена', callback_data: 'banner_cancel' }
                    ]]
                }
            }
        );
        
    } else if (state.action === 'banner_add_subtitle') {
        const subtitle = msg.text;
        const title = state.title;
        
        // Создаем новый баннер
        const banners = loadBanners();
        const newId = banners.length > 0 ? Math.max(...banners.map(b => b.id)) + 1 : 1;
        const newOrder = banners.length > 0 ? Math.max(...banners.map(b => b.order)) + 1 : 1;
        
        const newBanner = {
            id: newId,
            enabled: true,
            title: title,
            subtitle: subtitle,
            image: null,
            link: null,
            order: newOrder
        };
        
        banners.push(newBanner);
        saveBanners(banners);
        
        logAction('ADD_BANNER', userId, { bannerId: newId, title });
        await syncToGitHub(`Добавлен новый баннер #${newId}`);
        
        // Удаляем состояние
        userStates.delete(userId);
        
        // Обновляем сообщение
        await bot.editMessageText(
            `✅ *Баннер создан!*\n\n` +
            `📝 ${title}\n` +
            `📄 ${subtitle}\n\n` +
            `ID: #${newId} | Порядок: ${newOrder}`,
            {
                chat_id: chatId,
                message_id: state.menuMessageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '⚙️ Настроить баннер', callback_data: `banner_view_${newId}` }
                        ],
                        [
                            { text: '📋 К списку баннеров', callback_data: 'banner_list' }
                        ]
                    ]
                }
            }
        );
    } else if (state.action === 'banner_edit_link') {
        const link = msg.text;
        const bannerId = state.bannerId;
        
        const banners = loadBanners();
        const banner = banners.find(b => b.id === bannerId);
        
        if (banner) {
            banner.link = link;
            saveBanners(banners);
            
            logAction('EDIT_BANNER_LINK', userId, { bannerId, link });
            await syncToGitHub(`Обновлена ссылка баннера #${bannerId}`);
        }
        
        userStates.delete(userId);
        
        await bot.editMessageText(
            `✅ *Ссылка обновлена!*\n\n` +
            `🔗 ${link}`,
            {
                chat_id: chatId,
                message_id: state.menuMessageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '« К баннеру', callback_data: `banner_view_${bannerId}` }
                    ]]
                }
            }
        );
        
    } else if (state.action === 'banner_edit_order') {
        const order = parseInt(msg.text);
        const bannerId = state.bannerId;
        
        if (isNaN(order) || order < 1) {
            await bot.sendMessage(chatId, '❌ Порядок должен быть положительным числом', {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '« К баннеру', callback_data: `banner_view_${bannerId}` }
                    ]]
                }
            });
            userStates.delete(userId);
            return;
        }
        
        const banners = loadBanners();
        const banner = banners.find(b => b.id === bannerId);
        
        if (banner) {
            const oldOrder = banner.order;
            banner.order = order;
            saveBanners(banners);
            
            logAction('EDIT_BANNER_ORDER', userId, { bannerId, oldOrder, newOrder: order });
            await syncToGitHub(`Изменен порядок баннера #${bannerId}: ${oldOrder} → ${order}`);
        }
        
        userStates.delete(userId);
        
        await bot.editMessageText(
            `✅ *Порядок обновлен!*\n\n` +
            `📊 Новый порядок: ${order}`,
            {
                chat_id: chatId,
                message_id: state.menuMessageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '« К баннеру', callback_data: `banner_view_${bannerId}` }
                    ]]
                }
            }
        );
    }
}

// Handle delete banner
function handleBannerDelete(bot, query, bannerId) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    
    if (!isAdmin(userId)) {
        bot.answerCallbackQuery(query.id, { text: '⛔ Нет доступа' });
        return;
    }
    
    const banners = loadBanners();
    const bannerIndex = banners.findIndex(b => b.id === parseInt(bannerId));
    
    if (bannerIndex === -1) {
        bot.answerCallbackQuery(query.id, { text: '❌ Баннер не найден' });
        return;
    }
    
    const banner = banners[bannerIndex];
    
    bot.editMessageText(
        `🗑️ *Удаление баннера*\n\n` +
        `Вы действительно хотите удалить баннер?\n\n` +
        `📝 ${banner.title}\n` +
        `📄 ${banner.subtitle}`,
        {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Да, удалить', callback_data: `banner_delete_confirm_${bannerId}` },
                        { text: '❌ Отмена', callback_data: `banner_view_${bannerId}` }
                    ]
                ]
            }
        }
    );
    
    bot.answerCallbackQuery(query.id);
}

// Handle delete confirm
function handleBannerDeleteConfirm(bot, query, bannerId) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    
    if (!isAdmin(userId)) {
        bot.answerCallbackQuery(query.id, { text: '⛔ Нет доступа' });
        return;
    }
    
    const banners = loadBanners();
    const bannerIndex = banners.findIndex(b => b.id === parseInt(bannerId));
    
    if (bannerIndex === -1) {
        bot.answerCallbackQuery(query.id, { text: '❌ Баннер не найден' });
        return;
    }
    
    const banner = banners[bannerIndex];
    banners.splice(bannerIndex, 1);
    saveBanners(banners);
    
    logAction('DELETE_BANNER', userId, { bannerId: banner.id, title: banner.title });
    syncToGitHub(`Удален баннер #${bannerId}`);
    
    bot.answerCallbackQuery(query.id, { 
        text: '✅ Баннер удален',
        show_alert: false
    });
    
    // Возвращаемся к списку
    bot.editMessageText(
        '✅ Баннер успешно удален',
        {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: {
                inline_keyboard: [[
                    { text: '📋 К списку баннеров', callback_data: 'banner_list' }
                ]]
            }
        }
    );
}

// Handle banner callbacks
function handleBannerCallback(bot, query) {
    const data = query.data;
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    
    if (data === 'banner_list') {
        // Удаляем состояние если есть
        userStates.delete(userId);
        // Удаляем старое сообщение и отправляем новое
        bot.deleteMessage(chatId, query.message.message_id);
        handleBannersCommand(bot, { chat: query.message.chat, from: query.from });
        bot.answerCallbackQuery(query.id);
    } else if (data === 'banner_cancel') {
        // Отмена операции
        userStates.delete(userId);
        bot.deleteMessage(chatId, query.message.message_id);
        handleBannersCommand(bot, { chat: query.message.chat, from: query.from });
        bot.answerCallbackQuery(query.id, { text: '❌ Операция отменена' });
    } else if (data.startsWith('banner_view_')) {
        const bannerId = data.replace('banner_view_', '');
        userStates.delete(userId); // Сброс состояния
        handleBannerView(bot, query, bannerId);
    } else if (data.startsWith('banner_toggle_')) {
        const bannerId = data.replace('banner_toggle_', '');
        handleBannerToggle(bot, query, bannerId);
    } else if (data === 'banner_add') {
        handleAddBanner(bot, query);
    } else if (data.startsWith('banner_delete_confirm_')) {
        const bannerId = data.replace('banner_delete_confirm_', '');
        handleBannerDeleteConfirm(bot, query, bannerId);
    } else if (data.startsWith('banner_delete_')) {
        const bannerId = data.replace('banner_delete_', '');
        handleBannerDelete(bot, query, bannerId);
    } else if (data.startsWith('banner_link_')) {
        const bannerId = data.replace('banner_link_', '');
        handleBannerLinkEdit(bot, query, parseInt(bannerId));
    } else if (data.startsWith('banner_order_')) {
        const bannerId = data.replace('banner_order_', '');
        handleBannerOrderEdit(bot, query, parseInt(bannerId));
    }
}

// Handle banner link edit
function handleBannerLinkEdit(bot, query, bannerId) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    
    if (!isAdmin(userId)) {
        bot.answerCallbackQuery(query.id, { text: '⛔ Нет доступа' });
        return;
    }
    
    userStates.set(userId, {
        action: 'banner_edit_link',
        bannerId: bannerId,
        menuMessageId: query.message.message_id
    });
    
    bot.editMessageText(
        '🔗 *Изменение ссылки баннера*\n\n' +
        'Отправьте новую ссылку\n' +
        '_(например: https://insiderplaystation.ru/catalog)_\n\n' +
        'Или отправьте `-` чтобы удалить ссылку',
        {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: '❌ Отмена', callback_data: `banner_view_${bannerId}` }
                ]]
            }
        }
    );
    
    bot.answerCallbackQuery(query.id);
}

// Handle product price edit
function handleProductPriceEdit(bot, query, productId) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    
    if (!isAdmin(userId)) {
        bot.answerCallbackQuery(query.id, { text: '⛔ Нет доступа' });
        return;
    }
    
    const productsPath = path.join(__dirname, '..', 'data', 'products.json');
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        bot.answerCallbackQuery(query.id, { text: '❌ Товар не найден' });
        return;
    }
    
    userStates.set(userId, {
        action: 'product_edit_price',
        productId: productId,
        menuMessageId: query.message.message_id
    });
    
    bot.editMessageText(
        '💰 *Изменение цены товара*\n\n' +
        `📦 ${product.name}\n` +
        `Текущая цена: ${product.price}₽\n\n` +
        'Отправьте новую цену (только число)\n' +
        '_(например: 500)_',
        {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: '❌ Отмена', callback_data: `edit_product_${productId}` }
                ]]
            }
        }
    );
    
    bot.answerCallbackQuery(query.id);
}

// Handle product discount edit
function handleProductDiscountEdit(bot, query, productId) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    
    if (!isAdmin(userId)) {
        bot.answerCallbackQuery(query.id, { text: '⛔ Нет доступа' });
        return;
    }
    
    const productsPath = path.join(__dirname, '..', 'data', 'products.json');
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        bot.answerCallbackQuery(query.id, { text: '❌ Товар не найден' });
        return;
    }
    
    userStates.set(userId, {
        action: 'product_edit_discount',
        productId: productId,
        menuMessageId: query.message.message_id
    });
    
    bot.editMessageText(
        '🏷 *Изменение скидки товара*\n\n' +
        `📦 ${product.name}\n` +
        `Текущая скидка: ${product.discount}%\n\n` +
        'Отправьте новую скидку (от 0 до 100)\n' +
        '_(например: 15)_',
        {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: '❌ Отмена', callback_data: `edit_product_${productId}` }
                ]]
            }
        }
    );
    
    bot.answerCallbackQuery(query.id);
}

// Handle banner order edit
function handleBannerOrderEdit(bot, query, bannerId) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    
    if (!isAdmin(userId)) {
        bot.answerCallbackQuery(query.id, { text: '⛔ Нет доступа' });
        return;
    }
    
    const banners = loadBanners();
    const banner = banners.find(b => b.id === bannerId);
    
    if (!banner) {
        bot.answerCallbackQuery(query.id, { text: '❌ Баннер не найден' });
        return;
    }
    
    userStates.set(userId, {
        action: 'banner_edit_order',
        bannerId: bannerId,
        menuMessageId: query.message.message_id
    });
    
    bot.editMessageText(
        '📊 *Изменение порядка баннера*\n\n' +
        `Текущий порядок: ${banner.order}\n\n` +
        'Отправьте новый порядок (число)\n' +
        '_(чем меньше число, тем выше приоритет)_',
        {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: '❌ Отмена', callback_data: `banner_view_${bannerId}` }
                ]]
            }
        }
    );
    
    bot.answerCallbackQuery(query.id);
}

module.exports = {
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
    userStates,
    isAdmin,
    notifyAdminNewOrder,
    logAction
};
