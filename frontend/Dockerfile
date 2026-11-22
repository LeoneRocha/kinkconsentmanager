# ==============================================================================
# ESTÁGIO 1: Build (Compilação da Aplicação Angular 22)
# ==============================================================================
FROM node:24-alpine AS build

WORKDIR /app/frontend

# Copia manifests primeiro para otimizar cache de camadas do Docker
COPY package*.json ./
RUN npm ci

# Copia restante do codigo-fonte e gera build minificado de producao
COPY . .
RUN npm run build:prod

# ==============================================================================
# ESTÁGIO DEV: Servidor de Desenvolvimento (docker compose --profile dev)
# ==============================================================================
FROM node:24-alpine AS development

WORKDIR /app/frontend

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 4200
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "4200"]

# ==============================================================================
# ESTÁGIO 2: Produção (Nginx Alpine servindo SPA 100% client-side)
# ==============================================================================
FROM nginx:mainline-alpine-slim AS production

# Remove pagina padrao do Nginx para evitar fallback indevido
RUN rm -rf /usr/share/nginx/html/*

# Configuracao SPA + gzip + security headers + healthcheck
COPY nginx.conf /etc/nginx/nginx.conf

# Builder @angular/build:application gera artefatos em dist/<projeto>/browser/
COPY --from=build /app/frontend/dist/kinkconsentmanager/browser /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:80/health || exit 1

EXPOSE 80
EXPOSE 4200
EXPOSE 8082

CMD ["nginx", "-g", "daemon off;"]
