FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/ca.pem ./ca.pem
COPY --from=builder /app/knexfile.cjs ./knexfile.cjs
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/wards.json ./wards.json

EXPOSE 3000

CMD ["node", "dist/server.js"]
