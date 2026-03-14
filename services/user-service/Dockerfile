# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --production   # only install runtime deps

# ---- Runtime stage ----
# Using a separate stage keeps the final image small (~50MB vs ~300MB)
FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Don't run as root — security best practice
USER node

EXPOSE 3001
CMD ["node", "app.js"]
