FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies including dev dependencies for build
COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Generate Prisma Client (needed for runtime)
RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "start"]
