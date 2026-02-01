# Используем Node.js 18
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем весь код
COPY . .

# Открываем порт для Web App
EXPOSE 3000

# Команда по умолчанию - запуск бота
CMD ["node", "bot/index.js"]
