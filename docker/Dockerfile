# Multi-stage build for Inventory OS Home
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S inventory -u 1001

# Copy built application
COPY --from=builder --chown=inventory:nodejs /app/dist ./dist
COPY --from=builder --chown=inventory:nodejs /app/server.js ./
COPY --from=builder --chown=inventory:nodejs /app/package*.json ./

# Install only production dependencies for server
RUN npm ci --only=production && npm cache clean --force

# Create data directory for SQLite
RUN mkdir -p /app/data && chown inventory:nodejs /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/inventory.db

# Expose ports
EXPOSE 3001 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Switch to non-root user
USER inventory

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]