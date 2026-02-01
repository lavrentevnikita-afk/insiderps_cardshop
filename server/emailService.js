// Email Service для отправки ключей на почту
// TODO: Интегрировать с реальным сервисом (Nodemailer, SendGrid, etc.)

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
  
  console.log('\n📌 Примечание: Для реальной отправки настройте email-сервис');
  console.log('========================================\n');
  
  // В продакшене здесь будет настоящая отправка через:
  // - Nodemailer (SMTP)
  // - SendGrid
  // - Mailgun
  // - AWS SES
  // и т.д.
  
  return {
    success: true,
    message: 'Email отправлен (в логи)'
  };
}

/**
 * Пример настройки Nodemailer (раскомментировать при настройке)
 */
/*
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendKeysEmail(email, keys, total) {
  const itemsList = keys.map((item, index) => 
    `${index + 1}. ${item.product}\n   🔑 Код: ${item.key}`
  ).join('\n\n');
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@psshop.com',
    to: email,
    subject: '🎮 Ваши коды активации PlayStation',
    text: `
Здравствуйте!

Спасибо за покупку в нашем магазине PlayStation Cards!

Ваши коды активации:

${itemsList}

Итого: ${total}₽

Инструкция по активации:
1. Зайдите в PlayStation Store
2. Выберите "Погасить коды"
3. Введите код активации
4. Наслаждайтесь покупками!

По всем вопросам: @insider_mngr
Наш канал: @insider_playstation

С уважением,
Команда PlayStation Cards Shop
    `,
    html: `
      <h2>🎮 Ваши коды активации PlayStation</h2>
      <p>Спасибо за покупку в нашем магазине!</p>
      
      <h3>Ваши коды:</h3>
      <ul>
        ${keys.map(item => `
          <li>
            <strong>${item.product}</strong><br>
            🔑 Код: <code style="background:#f5f5f5;padding:5px;border-radius:3px;">${item.key}</code>
          </li>
        `).join('')}
      </ul>
      
      <p><strong>Итого: ${total}₽</strong></p>
      
      <hr>
      <h4>Инструкция по активации:</h4>
      <ol>
        <li>Зайдите в PlayStation Store</li>
        <li>Выберите "Погасить коды"</li>
        <li>Введите код активации</li>
        <li>Наслаждайтесь покупками!</li>
      </ol>
      
      <p>
        По всем вопросам: <a href="https://t.me/insider_mngr">@insider_mngr</a><br>
        Наш канал: <a href="https://t.me/insider_playstation">@insider_playstation</a>
      </p>
    `
  };
  
  const info = await transporter.sendMail(mailOptions);
  console.log('✅ Email отправлен:', info.messageId);
  
  return {
    success: true,
    messageId: info.messageId
  };
}
*/

module.exports = {
  sendKeysEmail
};
