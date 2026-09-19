# ---- Build stage: full deps (needed for tsc/vite) to produce the frontend bundle ----
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime stage: production deps only + built frontend + server code ----
# node:24-slim (glibc, not musl/alpine) matches the prebuilt binaries better-sqlite3
# ships, so no C++ build toolchain is needed in this image.
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist

# SQLite data lives here -- mount a volume at this path so it survives
# container restarts/redeploys instead of being lost with the container.
VOLUME /app/server/data

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.js"]
