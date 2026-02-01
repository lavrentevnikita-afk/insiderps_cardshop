# Используем Node.js 18
FROM node:18-alpine

# Устанавливаем git для автоматической синхронизации
RUN apk add --no-cache git

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем весь код
COPY . .

# Инициализируем git (если еще не инициализирован)
RUN git config --global user.email "bot@psshop.com" && \
    git config --global user.name "PSShop Bot" && \
    git config --global --add safe.directory /app

# Открываем порт для Web App
EXPOSE 3000

# Команда по умолчанию - запуск бота
CMD ["node", "bot/index.js"]
