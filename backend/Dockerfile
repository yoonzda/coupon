FROM node:20-slim

WORKDIR /app

# 의존성 설치를 위해 package.json 복사
COPY package*.json ./
RUN npm install --production

# 소스 코드 복사
COPY . .

# 포트 개방
EXPOSE 3010

# 실행 (도커 내부에서는 PM2 대신 직접 실행하거나 pm2-runtime 사용)
CMD ["node", "src/app.js"]
