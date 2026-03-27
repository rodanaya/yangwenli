# RUBLI Frontend - Multi-stage Docker Build
# Stage 1: Build the React app
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Type-check and build
RUN npx tsc --noEmit && npx vite build

# Stage 2: Serve with nginx
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Entrypoint script: injects runtime config into index.html at container startup.
# This avoids baking sensitive values (e.g. RUBLI_WRITE_KEY) into the JS bundle
# at build time, where they would be visible to any visitor via browser devtools.
# The script replaces the placeholder comment in index.html with a <script> block
# containing window.__RUBLI_CONFIG__ populated from the container's environment.
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

# Entrypoint injects runtime config, then hands off to nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
