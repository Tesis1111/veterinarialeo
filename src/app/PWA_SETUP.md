# 📱 Configuración PWA - VetCare

## ¿Qué es una PWA?

Una Progressive Web App (PWA) permite que tu aplicación web se comporte como una app nativa:
- ✅ Se puede instalar en dispositivos móviles y escritorio
- ✅ Funciona offline (sin conexión a internet)
- ✅ Aparece en la pantalla de inicio como una app nativa
- ✅ Se ejecuta en ventana completa sin la barra del navegador
- ✅ Recibe actualizaciones automáticas

## 🎨 Generación de Iconos

### Opción 1: Usar el generador automático (Recomendado)

1. Abre el archivo `/public/generate-icons.html` en tu navegador
2. Los iconos se generarán automáticamente
3. Haz clic derecho en cada icono → "Guardar imagen como..."
4. Guarda cada icono con el nombre exacto mostrado debajo (ej: `icon-72x72.png`)
5. Crea la carpeta `/public/icons/` en tu proyecto
6. Coloca todos los iconos descargados en esa carpeta

### Opción 2: Usar tus propios iconos

Si prefieres usar un logo personalizado:

1. Crea un diseño cuadrado (512x512px recomendado)
2. Usa una herramienta como [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator) o [RealFaviconGenerator](https://realfavicongenerator.net/)
3. Genera los siguientes tamaños: 72, 96, 128, 144, 152, 192, 384, 512
4. Guárdalos como `icon-{tamaño}x{tamaño}.png` en `/public/icons/`

## 📸 Screenshots (Opcional)

Para mejorar la experiencia de instalación:

1. Captura de pantalla de escritorio (1280x720px) → `screenshot-1.png`
2. Captura de pantalla móvil (750x1334px) → `screenshot-2.png`
3. Guárdalas en `/public/screenshots/`

## 🚀 Configuración del Servidor

### Desarrollo Local

Para probar la PWA en desarrollo:

```bash
# Si usas Vite
npm run build
npm run preview

# Si usas Create React App
npm run build
npx serve -s build
```

**IMPORTANTE:** Los Service Workers solo funcionan en:
- `https://` (producción)
- `http://localhost` (desarrollo local)

### Producción

Asegúrate de que tu servidor web:

1. **Sirva archivos estáticos correctamente:**
   - `/manifest.json`
   - `/sw.js`
   - `/icons/*`
   - `/screenshots/*`

2. **Configure HTTPS:** Las PWA requieren conexión segura en producción

3. **Headers correctos:**
   ```
   Content-Type: application/manifest+json (para manifest.json)
   Content-Type: application/javascript (para sw.js)
   ```

## 📱 Cómo Instalar la PWA

### En Android (Chrome/Edge)

1. Abre la aplicación en el navegador
2. Aparecerá un banner de instalación automáticamente
3. También puedes tocar el menú (⋮) → "Instalar aplicación" o "Agregar a inicio"
4. Confirma la instalación
5. La app aparecerá en tu pantalla de inicio

### En iOS (Safari)

1. Abre la aplicación en Safari
2. Toca el botón de compartir (□ con flecha hacia arriba)
3. Desplázate y selecciona "Agregar a inicio"
4. Confirma el nombre y toca "Agregar"
5. La app aparecerá en tu pantalla de inicio

### En Desktop (Chrome/Edge)

1. Abre la aplicación en el navegador
2. Busca el ícono de instalación (+ o ⊕) en la barra de direcciones
3. Haz clic en "Instalar"
4. La app se abrirá en una ventana independiente

## 🔧 Archivos de la PWA

```
/public/
├── manifest.json          # Configuración de la PWA
├── sw.js                  # Service Worker (caché y offline)
├── generate-icons.html    # Generador de iconos
├── icons/                 # Iconos de la app
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   └── icon-512x512.png
└── screenshots/           # Capturas (opcional)
    ├── screenshot-1.png
    └── screenshot-2.png

/components/
└── InstallPrompt.tsx      # Banner de instalación

/utils/
└── registerServiceWorker.ts  # Registro del SW
```

## ✅ Verificación

### 1. Chrome DevTools

1. Abre DevTools (F12)
2. Ve a la pestaña "Application"
3. En "Manifest" verifica que se cargue correctamente
4. En "Service Workers" verifica que esté registrado y activo

### 2. Lighthouse

1. Abre DevTools (F12)
2. Ve a la pestaña "Lighthouse"
3. Selecciona "Progressive Web App"
4. Haz clic en "Generate report"
5. Revisa la puntuación y sugerencias

### 3. PWA Builder

Visita [PWABuilder.com](https://www.pwabuilder.com/) y analiza tu URL para obtener recomendaciones.

## 🎨 Personalización

### Cambiar Colores

Edita `/public/manifest.json`:

```json
{
  "theme_color": "#f97316",        // Color de la barra de estado
  "background_color": "#ffffff"    // Color de splash screen
}
```

### Cambiar Nombre

Edita `/public/manifest.json`:

```json
{
  "name": "Tu Nombre Largo de la App",
  "short_name": "Nombre Corto"
}
```

### Estrategia de Caché

Edita `/public/sw.js` para cambiar qué archivos se cachean y la estrategia (Network First, Cache First, etc.)

## 🔄 Actualizaciones

El Service Worker se actualiza automáticamente:

1. Detecta nuevas versiones cada hora
2. Pregunta al usuario si desea actualizar
3. Aplica los cambios al confirmar

Para forzar una actualización, incrementa la versión en `/public/sw.js`:

```javascript
const CACHE_NAME = 'vetcare-v2';  // Cambiar v1 → v2
```

## 🐛 Troubleshooting

### La PWA no se puede instalar

- ✅ Verifica que uses HTTPS o localhost
- ✅ Confirma que manifest.json se carga correctamente
- ✅ Asegúrate de tener al menos los iconos 192x192 y 512x512
- ✅ Verifica que el Service Worker esté registrado

### El Service Worker no se actualiza

- Cierra todas las pestañas de la app
- Abre DevTools → Application → Service Workers
- Marca "Update on reload"
- Recarga la página

### Los iconos no aparecen

- Verifica que la ruta sea correcta: `/public/icons/icon-{size}x{size}.png`
- Confirma que los archivos existen
- Revisa la consola del navegador para errores 404

### El banner de instalación no aparece

- Espera 3 segundos después de cargar la página
- Verifica que no hayas rechazado la instalación recientemente
- Confirma que la app no esté ya instalada

## 📊 Monitoreo

Para ver cómo los usuarios usan tu PWA:

1. **Google Analytics:** Agrega eventos personalizados para instalación
2. **Service Worker:** Registra eventos de caché y offline
3. **DevTools:** Monitorea el rendimiento y errores

## 🎉 ¡Listo!

Tu aplicación VetCare ahora es una PWA completamente funcional. Los usuarios podrán:

- 📲 Instalarla en sus dispositivos
- 🔌 Usarla sin conexión
- ⚡ Disfrutar de tiempos de carga más rápidos
- 🎨 Experimentarla como una app nativa

---

**Desarrollado para VetCare - Sistema de Gestión Veterinaria** 🐕
