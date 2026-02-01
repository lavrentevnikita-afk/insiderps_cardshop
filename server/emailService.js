// Email Service для отправки ключей на почту
const nodemailer = require('nodemailer');

// Создаем транспортер для отправки email
let transporter = null;

function createTransporter() {
  if (transporter) return transporter;
  
  // Проверяем наличие настроек SMTP в .env
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('📧 Используются настройки SMTP из .env');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465, // true для порта 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Используем Gmail по умолчанию (требуется пароль приложения)
    console.log('⚠️ SMTP не настроен в .env, используется тестовый режим');
    transporter = null;
  }
  
  return transporter;
}

/**
 * Отправляет ключи покупателю на email
 * @param {string} email - Email получателя
 * @param {Array} keys - Массив объектов {product, key}
 * @param {number} total - Итоговая сумма заказа
 */
async function sendKeysEmail(email, keys, total) {
  console.log('\n📧 ============ EMAIL ОТПРАВКА ============');
  console.log(`Получатель: ${email}`);
  console.log(`Сумма заказа: ${total}₽`);
  console.log('\nТовары и ключи:');
  
  keys.forEach((item, index) => {
    console.log(`${index + 1}. ${item.product}`);
    console.log(`   Код активации: ${item.key}`);
  });
  
  const emailTransporter = createTransporter();
  
  if (!emailTransporter) {
    console.log('\n⚠️ SMTP не настроен - коды только в логах');
    console.log('📝 Для настройки добавьте в .env:');
    console.log('SMTP_HOST=smtp.gmail.com');
    console.log('SMTP_PORT=587');
    console.log('SMTP_USER=your@gmail.com');
    console.log('SMTP_PASS=your_app_password');
    console.log('========================================\n');
    
    return {
      success: true,
      message: 'Email не отправлен (SMTP не настроен)'
    };
  }
  
  // Формируем список товаров для текстовой версии
  const itemsListText = keys.map((item, index) => 
    `${index + 1}. ${item.product}\n   🔑 Код: ${item.key}`
  ).join('\n\n');
  
  // Формируем список товаров для HTML версии
  const itemsListHtml = keys.map(item => `
    <div style="margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #0066cc;">
      <div style="font-weight: 600; color: #333; margin-bottom: 8px;">${item.product}</div>
      <div style="font-family: 'Courier New', monospace; background: #fff; padding: 10px; border-radius: 4px; font-size: 16px; color: #0066cc; letter-spacing: 1px;">
        🔑 ${item.key}
      </div>
    </div>
  `).join('');
  
  const mailOptions = {
    from: `"PlayStation Cards Shop" <${process.env.SMTP_USER || 'noreply@psshop.com'}>`,
    to: email,
    subject: '🎮 Ваши коды активации PlayStation',
    text: `
Здравствуйте!

Спасибо за покупку в нашем магазине PlayStation Cards!

ВАШИ КОДЫ АКТИВАЦИИ:

${itemsListText}

Итого: ${total}₽

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 ИНСТРУКЦИЯ ПО АКТИВАЦИИ:

1. Зайдите в PlayStation Store на вашей консоли
2. Выберите раздел "Погасить коды"
3. Введите код активации
4. Средства будут зачислены на ваш кошелек

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ ВАЖНО:
• Сохраните это письмо
• Коды одноразовые и не подлежат восстановлению
• Убедитесь, что регион вашего аккаунта совпадает с регионом карты

💬 Поддержка: @insider_mngr
📱 Наш канал: @insider_playstation
🌐 Сайт: insiderplaystation.ru

С уважением,
Команда PlayStation Cards Shop
    `,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0066cc 0%, #0047ab 100%); padding: 30px 20px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🎮 PlayStation Cards</h1>
      <p style="margin: 10px 0 0 0; color: #e0e9ff; font-size: 14px;">Ваши коды активации</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 30px 20px;">
      <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">Здравствуйте!</p>
      <p style="font-size: 16px; color: #333; margin: 0 0 30px 0;">
        Спасибо за покупку в нашем магазине! Ваши коды активации готовы к использованию:
      </p>
      
      <!-- Codes Section -->
      <div style="margin: 30px 0;">
        ${itemsListHtml}
      </div>
      
      <!-- Total -->
      <div style="text-align: right; font-size: 20px; font-weight: bold; color: #0066cc; margin: 20px 0;">
        Итого: ${total}₽
      </div>
      
      <!-- Instructions -->
      <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 30px 0;">
        <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📝 Инструкция по активации:</h3>
        <ol style="margin: 0; padding-left: 20px; color: #555; line-height: 1.8;">
          <li>Зайдите в PlayStation Store на вашей консоли</li>
          <li>Выберите раздел "Погасить коды"</li>
          <li>Введите код активации</li>
          <li>Средства будут зачислены на ваш кошелек</li>
        </ol>
      </div>
      
      <!-- Warning -->
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #856404; font-size: 14px;">
          <strong>⚠️ ВАЖНО:</strong><br>
          • Сохраните это письмо<br>
          • Коды одноразовые и не подлежат восстановлению<br>
          • Убедитесь, что регион вашего аккаунта совпадает с регионом карты
        </p>
      </div>
      
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
      <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
        💬 Поддержка: <a href="https://t.me/insider_mngr" style="color: #0066cc; text-decoration: none;">@insider_mngr</a><br>
        📱 Наш канал: <a href="https://t.me/insider_playstation" style="color: #0066cc; text-decoration: none;">@insider_playstation</a><br>
        🌐 Сайт: <a href="https://insiderplaystation.ru" style="color: #0066cc; text-decoration: none;">insiderplaystation.ru</a>
      </p>
      <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
        © 2026 PlayStation Cards Shop
      </p>
    </div>
    
  </div>
</body>
</html>
    `
  };
  
  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Email успешно отправлен:', info.messageId);
    console.log('========================================\n');
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ Ошибка отправки email:', error.message);
    console.log('========================================\n');
    
    return {
      success: false,
      error: error.message
    };
  }

module.exports = {
  sendKeysEmail
};
