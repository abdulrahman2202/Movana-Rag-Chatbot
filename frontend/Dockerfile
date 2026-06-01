# Set Node 20 LTS Alpine base
FROM node:20-alpine AS builder

WORKDIR /app

# Ingest package configurations
COPY package*.json ./
RUN npm ci

# Copy frontend source configurations
COPY . .

# Set environment to build safely in Docker
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Compile production-ready bundle
RUN npm run build

# Runner environment stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

# Start production Next.js App Router server
CMD ["npm", "start"]
