FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src/ ./src/
EXPOSE 3000
CMD ["npx", "ts-node", "src/server.ts"]
