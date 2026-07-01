# ─── Stage 1: Build Frontend ────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/Frontend

# Copy and install frontend dependencies
COPY Frontend/package*.json ./
RUN npm ci

# Copy frontend source and build
COPY Frontend/ ./
RUN npm run build

# ─── Stage 2: Production Backend ────────────────────────────────────────────
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy and install backend dependencies (production only)
COPY Backend/package*.json ./Backend/
RUN cd Backend && npm ci --omit=dev

# Copy backend source
COPY Backend/ ./Backend/

# Copy built frontend from stage 1 into expected path
COPY --from=frontend-build /app/Frontend/dist ./Frontend/dist

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Run as non-root user for security
USER node

# Use dumb-init to properly handle signals
CMD ["dumb-init", "node", "Backend/src/index.js"]
