# server/Dockerfile - multi-stage build for production
FROM node:20-alpine AS builder
WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json tsconfig.json ./

# Install all deps (including dev)
RUN npm install --silent

# Copy source + prisma schema
COPY src ./src

# Generate Prisma client (with linux-musl-openssl-3.0.x target)
RUN npx prisma generate --schema=src/prisma/schema.prisma

# Build TypeScript
RUN npm run build

# ─── Production stage ───────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

# Install openssl for Prisma runtime
RUN apk add --no-cache openssl

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Copy prisma schema + generated client
COPY --from=builder /app/src/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Install production deps only
RUN npm install --omit=dev --silent

EXPOSE 3000
CMD ["node", "dist/app.js"]
