# server/Dockerfile - multi-stage build for production
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json tsconfig.json ./

# Install all deps (including dev)
RUN npm ci --silent

# Copy source + prisma schema
COPY src ./src

# Generate Prisma client
RUN npx prisma generate --schema=src/prisma/schema.prisma

# Build TypeScript
RUN npm run build

# ─── Production stage ───────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Copy prisma schema + generated client
COPY --from=builder /app/src/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Install production deps only
RUN npm ci --omit=dev --silent

EXPOSE 3000
CMD ["node", "dist/app.js"]
