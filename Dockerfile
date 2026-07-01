# ─── Stage 1: Build Frontend ────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/Frontend

# Copy and install frontend dependencies
COPY Frontend/package*.json ./
RUN npm ci

# Copy frontend source
COPY Frontend/ ./

# Build Vite app — VITE_API_BASE_URL is empty so all API calls are relative
# (the Express backend serves both the API and the static files)
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ─── Stage 2: Production Backend ────────────────────────────────────────────
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory and set ownership
WORKDIR /app

# Copy and install backend production dependencies
COPY Backend/package*.json ./Backend/
RUN cd Backend && npm ci --omit=dev

# Copy backend source
COPY Backend/ ./Backend/

# Copy built frontend from stage 1 into the path the Express server expects
COPY --from=frontend-build /app/Frontend/dist ./Frontend/dist

# Runtime environment defaults (override via Railway Variables)
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Use dumb-init to properly handle OS signals (SIGTERM etc.)
CMD ["dumb-init", "node", "Backend/src/index.js"]
