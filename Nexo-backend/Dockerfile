# ============================================================================
# Backend de Nexo (NestJS + Prisma) — build multi-stage
#
#   deps    → instala todas las dependencias (incluidas las de desarrollo)
#   dev     → objetivo de desarrollo, con hot-reload (usado por el override)
#   builder → compila TypeScript a dist/
#   runtime → objetivo por defecto: solo dependencias de producción + dist/
#
# `openssl` va en toda etapa que ejecute Prisma: los query engines lo enlazan
# dinámicamente y las imágenes `slim` no lo traen.
# ============================================================================

# ── deps ────────────────────────────────────────────────────────────────────
FROM node:22-slim AS deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# El schema se copia ANTES de `npm ci`: el postinstall de @prisma/client corre
# `prisma generate` y necesita encontrarlo.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci


# ── dev ─────────────────────────────────────────────────────────────────────
FROM node:22-slim AS dev
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# El override bind-montea ./prisma, así que el schema del host puede diferir
# del que se usó en `deps`. Regenerar acá mantiene la imagen coherente; tras
# editar el schema en caliente hay que correr `npm run prisma:generate` dentro
# del contenedor (o reconstruir).
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "run", "start:dev"]


# ── builder ─────────────────────────────────────────────────────────────────
FROM node:22-slim AS builder
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build


# ── runtime ─────────────────────────────────────────────────────────────────
FROM node:22-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
# --ignore-scripts: sin el CLI de `prisma` (devDependency) el postinstall de
# @prisma/client no puede generar nada. El cliente ya generado se copia desde
# `builder` en la línea siguiente.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=builder /app/dist ./dist

# `node` es el usuario sin privilegios que ya trae la imagen oficial.
USER node

EXPOSE 3001
CMD ["node", "dist/main.js"]
