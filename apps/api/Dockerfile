# Multi-stage production Dockerfile for @sdms/api with non-root security
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy root monorepo manifests
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared-types ./packages/shared-types
COPY packages/verifier ./packages/verifier
COPY apps/api ./apps/api

# Install dependencies and build
RUN npm ci
RUN npm run build --workspace=@sdms/shared-types
RUN npm run build --workspace=@sdms/verifier
RUN npm run build --workspace=@sdms/api

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install runtime dependencies for sharp / tesseract
RUN apk add --no-cache vips tesseract-ocr

# Create dedicated non-root user
USER node

# Copy built artifacts and production node_modules
COPY --chown=node:node --from=builder /app/package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --chown=node:node --from=builder /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --chown=node:node --from=builder /app/packages/verifier/dist ./packages/verifier/dist
COPY --chown=node:node --from=builder /app/packages/verifier/package.json ./packages/verifier/package.json
COPY --chown=node:node --from=builder /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --chown=node:node --from=builder /app/apps/api/prisma ./apps/api/prisma

EXPOSE 4000

CMD ["node", "apps/api/dist/src/main.js"]
