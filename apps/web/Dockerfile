# Multi-stage production Dockerfile for @sdms/web Next.js frontend with non-root security
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root monorepo manifests
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared-types ./packages/shared-types
COPY packages/verifier ./packages/verifier
COPY apps/web ./apps/web

# Install dependencies and build
RUN npm ci
RUN npm run build --workspace=@sdms/shared-types
RUN npm run build --workspace=@sdms/verifier
RUN npm run build --workspace=@sdms/web

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Create dedicated non-root user
USER node

# Copy built artifacts and static files
COPY --chown=node:node --from=builder /app/apps/web/public ./apps/web/public
COPY --chown=node:node --from=builder /app/apps/web/.next ./apps/web/.next
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/apps/web/package.json ./apps/web/package.json

EXPOSE 3000

WORKDIR /app/apps/web
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
