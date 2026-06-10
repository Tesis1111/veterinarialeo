# 🔧 Configuración del index.html para PWA

## 📝 Instrucciones

El archivo `index.html` de tu proyecto debe incluir las siguientes meta tags y enlaces para que la PWA funcione correctamente.

Busca tu archivo `index.html` (normalmente en `/public/index.html` o `/index.html`) y agrega las siguientes líneas en la sección `<head>`:

---

## ✅ Código a Agregar

### 1. Meta Tags Básicas de PWA

Agrega después de las meta tags existentes:

```html
<!-- PWA Meta Tags -->
<meta name="application-name" content="VetCare">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="VetCare">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#f97316">
```

### 2. Enlace al Manifest

Agrega en el `<head>`:

```html
<!-- Manifest -->
<link rel="manifest" href="/manifest.json">
```

### 3. Favicon e Iconos

Agrega en el `<head>`:

```html
<!-- Favicon -->
<link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-72x72.png">
<link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-72x72.png">
<link rel="shortcut icon" href="/icons/icon-72x72.png">
```

### 4. Iconos de Apple (iOS)

Agrega en el `<head>`:

```html
<!-- iOS Icons -->
<link rel="apple-touch-icon" href="/icons/icon-152x152.png">
<link rel="apple-touch-icon" sizes="72x72" href="/icons/icon-72x72.png">
<link rel="apple-touch-icon" sizes="96x96" href="/icons/icon-96x96.png">
<link rel="apple-touch-icon" sizes="128x128" href="/icons/icon-128x128.png">
<link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144x144.png">
<link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png">
<link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png">
<link rel="apple-touch-icon" sizes="384x384" href="/icons/icon-384x384.png">
<link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png">
```

### 5. Microsoft Tiles

Agrega en el `<head>`:

```html
<!-- Microsoft -->
<meta name="msapplication-TileColor" content="#f97316">
<meta name="msapplication-TileImage" content="/icons/icon-144x144.png">
<meta name="msapplication-config" content="/browserconfig.xml">
```

---

## 📄 Ejemplo Completo de index.html

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Título y descripción -->
  <title>VetCare - Sistema de Gestión Veterinaria</title>
  <meta name="description" content="Sistema completo de gestión veterinaria con módulos de clientes, mascotas, atención médica, turnos y auditoría">
  
  <!-- PWA Meta Tags -->
  <meta name="application-name" content="VetCare">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="VetCare">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="theme-color" content="#f97316">
  
  <!-- Manifest -->
  <link rel="manifest" href="/manifest.json">
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-72x72.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-72x72.png">
  <link rel="shortcut icon" href="/icons/icon-72x72.png">
  
  <!-- iOS Icons -->
  <link rel="apple-touch-icon" href="/icons/icon-152x152.png">
  <link rel="apple-touch-icon" sizes="72x72" href="/icons/icon-72x72.png">
  <link rel="apple-touch-icon" sizes="96x96" href="/icons/icon-96x96.png">
  <link rel="apple-touch-icon" sizes="128x128" href="/icons/icon-128x128.png">
  <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144x144.png">
  <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png">
  <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png">
  <link rel="apple-touch-icon" sizes="384x384" href="/icons/icon-384x384.png">
  <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png">
  
  <!-- Microsoft -->
  <meta name="msapplication-TileColor" content="#f97316">
  <meta name="msapplication-TileImage" content="/icons/icon-144x144.png">
  <meta name="msapplication-config" content="/browserconfig.xml">
</head>
<body>
  <noscript>
    <div style="text-align: center; padding: 40px; font-family: Arial, sans-serif;">
      <h1 style="color: #f97316;">VetCare</h1>
      <p>Esta aplicación requiere JavaScript para funcionar.</p>
      <p>Por favor, habilita JavaScript en tu navegador.</p>
    </div>
  </noscript>
  
  <div id="root"></div>
  
  <!-- Tu framework inyectará el script aquí -->
  <!-- Por ejemplo, Vite agrega: <script type="module" src="/src/main.tsx"></script> -->
</body>
</html>
```

---

## 🎯 Ubicación del index.html según el Framework

### Vite (React + TypeScript)
```
/index.html (en la raíz del proyecto)
```

### Create React App
```
/public/index.html
```

### Next.js
Next.js genera automáticamente el HTML, pero puedes personalizar usando `_document.tsx`:
```tsx
// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        <meta name="application-name" content="VetCare" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="VetCare" />
        <meta name="theme-color" content="#f97316" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon-72x72.png" />
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
```

---

## ✅ Verificación

Después de agregar estas líneas:

1. **Reinicia el servidor de desarrollo**
   ```bash
   npm run dev
   ```

2. **Abre DevTools (F12)**
   - Pestaña **Elements** → revisa el `<head>`
   - Verifica que todas las meta tags estén presentes

3. **Pestaña Application**
   - **Manifest:** Debe mostrarse correctamente
   - **Icons:** Deben listarse todos los tamaños

4. **Pestaña Console**
   - No debe haber errores 404 de archivos faltantes

---

## 🚨 Errores Comunes

### ❌ Error: "Manifest: Line 1, column 1, Syntax error"

**Causa:** El archivo manifest.json tiene errores de sintaxis

**Solución:** Verifica que `/public/manifest.json` sea JSON válido (sin comas extra, comillas correctas)

### ❌ Error: "No matching service worker detected"

**Causa:** El service worker no está registrado o tiene errores

**Solución:** 
- Verifica que `/public/sw.js` exista
- Revisa que se esté registrando en `App.tsx`
- Solo funciona en HTTPS o localhost

### ❌ Error: "Failed to load resource: the server responded with a status of 404"

**Causa:** Archivos faltantes (iconos, manifest, etc.)

**Solución:**
- Verifica que `/public/icons/` exista y tenga todos los iconos
- Verifica que `/public/manifest.json` exista
- Verifica que las rutas en el HTML coincidan con las ubicaciones reales

---

## 📱 Prueba Visual

Para verificar que todo está correcto:

1. **Chrome/Edge Desktop:**
   - Deberías ver un ícono **+ Instalar** en la barra de direcciones
   
2. **Chrome Android:**
   - Deberías ver un banner de instalación
   
3. **Safari iOS:**
   - Compartir → "Agregar a inicio" debería mostrar el icono y nombre correctos

---

## 🎨 Personalización

### Cambiar color del tema

En todas las meta tags, cambia `#f97316` (naranja) por tu color preferido:

```html
<meta name="theme-color" content="#TU_COLOR_AQUI">
<meta name="msapplication-TileColor" content="#TU_COLOR_AQUI">
```

También actualiza en `/public/manifest.json`:
```json
{
  "theme_color": "#TU_COLOR_AQUI"
}
```

### Cambiar título

```html
<title>Tu Título Aquí</title>
<meta name="apple-mobile-web-app-title" content="Título Corto">
```

También actualiza en `/public/manifest.json`:
```json
{
  "name": "Tu Nombre Largo",
  "short_name": "Nombre Corto"
}
```

---

## 🎉 ¡Listo!

Una vez que hayas agregado estas líneas a tu `index.html`, tu PWA estará completamente configurada.

**Siguiente paso:** Genera los iconos siguiendo [README_PWA.md](./README_PWA.md)

---

**VetCare - Sistema de Gestión Veterinaria** 🐕
