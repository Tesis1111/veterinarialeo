# 🚀 Guía de Despliegue - VetCare PWA

Esta guía te ayudará a desplegar VetCare en diferentes plataformas de hosting.

---

## 📋 Pre-requisitos

Antes de desplegar, asegúrate de:

1. ✅ Tener todos los iconos generados en `/public/icons/`
2. ✅ Haber configurado el `manifest.json` con tus datos
3. ✅ Haber ejecutado `npm run build` localmente para verificar que no hay errores
4. ✅ Tener HTTPS configurado (requerido para PWA en producción)

---

## 🎯 Plataformas de Despliegue Recomendadas

### 1️⃣ Vercel (Recomendado - Más Fácil)

**Paso 1: Instalar Vercel CLI**
```bash
npm install -g vercel
```

**Paso 2: Desplegar**
```bash
# Desde la raíz de tu proyecto
vercel

# Para producción
vercel --prod
```

**Paso 3: Configurar proyecto**
- Framework: Vite (o el que uses)
- Build Command: `npm run build`
- Output Directory: `dist` (o `build` según tu configuración)

**Ventajas:**
- ✅ HTTPS automático
- ✅ Despliegue con un comando
- ✅ Actualizaciones automáticas con Git
- ✅ CDN global incluido

---

### 2️⃣ Netlify

**Opción A: Desde la interfaz web**

1. Ve a [netlify.com](https://netlify.com)
2. Arrastra la carpeta `dist` (después de `npm run build`)
3. ¡Listo!

**Opción B: Con Netlify CLI**

```bash
# Instalar CLI
npm install -g netlify-cli

# Login
netlify login

# Desplegar
netlify deploy

# Para producción
netlify deploy --prod
```

**Configuración en netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/manifest.json"
  [headers.values]
    Content-Type = "application/manifest+json"
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/sw.js"
  [headers.values]
    Content-Type = "application/javascript"
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/icons/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

---

### 3️⃣ GitHub Pages

**Paso 1: Configurar vite.config.ts**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/nombre-repositorio/', // Nombre de tu repositorio
})
```

**Paso 2: Instalar gh-pages**
```bash
npm install --save-dev gh-pages
```

**Paso 3: Agregar scripts en package.json**
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

**Paso 4: Desplegar**
```bash
npm run deploy
```

**Paso 5: Configurar GitHub**
- Ve a Settings → Pages
- Selecciona branch: `gh-pages`
- ¡Listo!

---

### 4️⃣ Servidor Propio (VPS/Dedicado)

#### Con Nginx

**Paso 1: Build**
```bash
npm run build
```

**Paso 2: Copiar archivos al servidor**
```bash
scp -r dist/* usuario@tuservidor:/var/www/vetcare/
```

**Paso 3: Configurar Nginx**
```nginx
server {
    listen 80;
    server_name tudominio.com;
    
    # Redirigir a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tudominio.com;

    # Certificados SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;

    root /var/www/vetcare;
    index index.html;

    # Comprimir archivos
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    # Cache para recursos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # No cachear el service worker ni manifest
    location ~* (sw.js|manifest.json)$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Manifest con el tipo correcto
    location = /manifest.json {
        add_header Content-Type application/manifest+json;
        add_header Cache-Control "no-cache";
    }

    # Service Worker
    location = /sw.js {
        add_header Content-Type application/javascript;
        add_header Cache-Control "no-cache";
        add_header Service-Worker-Allowed "/";
    }

    # SPA - todas las rutas van a index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Paso 4: Obtener certificado SSL**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com
```

**Paso 5: Reiniciar Nginx**
```bash
sudo systemctl restart nginx
```

#### Con Apache

```apache
<VirtualHost *:443>
    ServerName tudominio.com
    DocumentRoot /var/www/vetcare

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/tudominio.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/tudominio.com/privkey.pem

    <Directory /var/www/vetcare>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # SPA routing
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Cache headers
    <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$">
        Header set Cache-Control "max-age=31536000, public, immutable"
    </FilesMatch>

    <FilesMatch "(sw.js|manifest.json)$">
        Header set Cache-Control "no-cache, no-store, must-revalidate"
    </FilesMatch>
</VirtualHost>
```

---

### 5️⃣ Docker

**Dockerfile:**
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copiar archivos build
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~* (sw.js|manifest.json)$ {
        expires -1;
        add_header Cache-Control "no-cache";
    }
}
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  vetcare:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
```

**Comandos:**
```bash
# Build
docker build -t vetcare-pwa .

# Run
docker run -d -p 80:80 vetcare-pwa

# Con docker-compose
docker-compose up -d
```

---

## ✅ Checklist Post-Despliegue

Después de desplegar, verifica:

- [ ] La app se carga correctamente
- [ ] HTTPS está funcionando (candado verde en el navegador)
- [ ] El manifest.json se carga (abre: https://tudominio.com/manifest.json)
- [ ] Los iconos están accesibles (abre: https://tudominio.com/icons/icon-192x192.png)
- [ ] El Service Worker se registra (DevTools → Application → Service Workers)
- [ ] Aparece el prompt de instalación
- [ ] La app funciona offline después de instalar
- [ ] Las rutas SPA funcionan correctamente (no error 404 al recargar)

---

## 🔍 Pruebas de PWA

### Chrome DevTools Lighthouse

1. Abre DevTools (F12)
2. Pestaña "Lighthouse"
3. Selecciona "Progressive Web App"
4. Click en "Generate report"
5. Objetivo: **90+ puntos**

### PWA Builder

1. Ve a [pwabuilder.com](https://www.pwabuilder.com/)
2. Ingresa tu URL
3. Revisa las recomendaciones

### Otros Checks

- [web.dev/measure](https://web.dev/measure/) - Análisis completo
- [webhint.io](https://webhint.io/) - Recomendaciones
- Chrome DevTools → Application → Manifest
- Chrome DevTools → Application → Service Workers

---

## 🔄 Actualizaciones

### Incrementar versión del Service Worker

Cada vez que hagas cambios, actualiza la versión en `/public/sw.js`:

```javascript
const CACHE_NAME = 'vetcare-v2'; // Cambiar v1 → v2 → v3, etc.
```

### Despliegue de actualizaciones

```bash
# Build
npm run build

# Desplegar según tu plataforma
vercel --prod          # Vercel
netlify deploy --prod  # Netlify
npm run deploy         # GitHub Pages
```

Los usuarios recibirán un prompt automático para actualizar.

---

## 🐛 Troubleshooting

### Service Worker no se actualiza

```bash
# Limpiar cache del navegador
# DevTools → Application → Clear Storage → Clear site data

# Incrementar versión en sw.js
# Redesplegar
```

### Error 404 en rutas

Asegúrate de que tu servidor redirija todas las rutas a `index.html` (configuración SPA).

### Manifest no se carga

Verifica:
- Content-Type: `application/manifest+json`
- La ruta es correcta: `/manifest.json`
- No hay errores de CORS

### HTTPS no funciona

- Usa Certbot para Let's Encrypt (gratis)
- O usa plataformas que incluyan HTTPS (Vercel, Netlify)

---

## 📊 Monitoreo

### Google Analytics (opcional)

```typescript
// En tu archivo principal
import ReactGA from 'react-ga4';

ReactGA.initialize('TU-MEASUREMENT-ID');

// Track page views
ReactGA.send({ hitType: "pageview", page: window.location.pathname });
```

### Sentry (opcional)

```bash
npm install @sentry/react
```

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "TU-SENTRY-DSN",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

---

## 🎉 ¡Listo!

Tu aplicación VetCare ya está desplegada como una PWA completamente funcional.

**Siguiente paso:** Comparte el enlace con tus usuarios y guíalos usando la [GUIA_INSTALACION_USUARIO.md](./GUIA_INSTALACION_USUARIO.md)

---

**VetCare - Sistema de Gestión Veterinaria** 🐕
