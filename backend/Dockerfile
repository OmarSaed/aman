FROM node:20-alpine AS builder
# Install openssl for prisma generate
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
# Need full devDependencies for prisma generate
RUN npm ci
COPY . .
RUN npx prisma generate

FROM node:20-alpine
# Install openssl for prisma engines
RUN apk add --no-cache openssl
WORKDIR /app
# Copy only the necessary files for production
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 5000
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
