FROM node:22-bookworm-slim AS deps
WORKDIR /app
# Toolchain for compiling better-sqlite3 if no prebuilt binary is available.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATABASE_PATH=/data/bumblebee.db
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Mount a persistent volume here so the database survives redeploys.
RUN mkdir -p /data
EXPOSE 3000
CMD ["node", "server.js"]
