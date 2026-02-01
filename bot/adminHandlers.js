const fs = require('fs');
const path = require('path');

// Admin ID - добавьте свой Telegram ID
const ADMIN_ID = process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID) : null;

// Check if user is admin
function isAdmin(userId) {
    if (!ADMIN_ID) {
        console.warn('⚠️ ADMIN_ID не установлен в .env файле');
        return false;
    }
    return userId === ADMIN_ID;
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
                    { text: '📢 Баннеры', callback_data: 'admin_banners' }
                ],
                [
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
async function handleProductsAdmin(bot, chatId, userId) {
    requireAdmin(bot, chatId, userId, async () => {
        const productsPath = path.join(__dirname, '..', 'data', 'products.json');
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        
        let message = '📦 *Управление товарами*\n\n';
        
        if (products.length === 0) {
            message += 'Товары не найдены\n\n';
        } else {
            message += `Всего товаров: ${products.length}\n\n`;
            products.slice(0, 5).forEach(p => {
                message += `• ${p.name} - ${p.price}₽\n`;
            });
            if (products.length > 5) {
                message += `\n... и еще ${products.length - 5} товаров\n`;
            }
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
                    { text: '« Назад', callback_data: 'admin_back' }
                ]
            ]
        };
        
        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    });
}

// Keys management
async function handleKeysAdmin(bot, chatId, userId) {
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
        
        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    });
}

// Orders management
async function handleOrdersAdmin(bot, chatId, userId) {
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
        
        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    });
}

// Banners management
async function handleBannersAdmin(bot, chatId, userId) {
    requireAdmin(bot, chatId, userId, async () => {
        const message = '📢 *Управление баннерами*\n\n' +
                       'Здесь вы можете управлять промо-баннерами в приложении.\n\n' +
                       '⚠️ Функция в разработке';
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '« Назад', callback_data: 'admin_back' }
                ]
            ]
        };
        
        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    });
}

// Settings
async function handleSettingsAdmin(bot, chatId, userId) {
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
        
        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
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

// Handle admin callbacks
async function handleAdminCallback(bot, query) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
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
            await handleAdminCommand(bot, query.message);
            break;
        case 'admin_products':
            await handleProductsAdmin(bot, chatId, userId);
            break;
        case 'admin_keys':
            await handleKeysAdmin(bot, chatId, userId);
            break;
        case 'admin_orders':
            await handleOrdersAdmin(bot, chatId, userId);
            break;
        case 'admin_banners':
            await handleBannersAdmin(bot, chatId, userId);
            break;
        case 'admin_settings':
            await handleSettingsAdmin(bot, chatId, userId);
            break;
        case 'admin_add_keys':
            await handleAddKeys(bot, chatId, userId);
            break;
        case 'admin_add_product':
        case 'admin_edit_product':
        case 'admin_delete_product':
        case 'admin_view_keys':
        case 'admin_view_orders':
            await bot.sendMessage(chatId, '⚠️ Функция в разработке', {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '« Назад', callback_data: 'admin_back' }
                    ]]
                }
            });
            break;
    }
}

module.exports = {
    handleAdminCommand,
    handleAdminCallback,
    handleAddKeyCommand,
    isAdmin
};
