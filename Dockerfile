# ─── Stage 1: Build ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (leverage Docker cache)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source & build
COPY index.html vite.config.js ./
COPY src/ ./src/
COPY public/ ./public/

# Build args for env variables at build time
ARG VITE_OLLAMA_BASE_URL=/api/ollama
ARG VITE_DEFAULT_MODEL=llama3.2:1b
ARG VITE_OPENCLAW_BASE_URL=http://127.0.0.1:7654
ARG VITE_OPENCLAW_TOKEN=
ARG VITE_APP_NAME="NARA AI Assistant"
ARG VITE_APP_VERSION=1.0.0

ENV VITE_OLLAMA_BASE_URL=$VITE_OLLAMA_BASE_URL
ENV VITE_DEFAULT_MODEL=$VITE_DEFAULT_MODEL
ENV VITE_OPENCLAW_BASE_URL=$VITE_OPENCLAW_BASE_URL
ENV VITE_OPENCLAW_TOKEN=$VITE_OPENCLAW_TOKEN
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION

RUN npm run build

# ─── Stage 2: Serve ────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8391

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8391/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
