import { toast } from "sonner";

export function registerServiceWorker() {
  // Solo registrar el Service Worker en producción. En desarrollo/preview evita
  // cachear contenido obsoleto e interferir con el hot-reload de Vite.
  if (!import.meta.env.PROD) return;
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Verificar actualizaciones cada hora
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);

          // Escuchar por actualizaciones
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Nueva versión disponible: toast no bloqueante con acción
                  toast.info("Nueva versión disponible", {
                    description: "Actualizá para obtener las últimas mejoras.",
                    duration: Infinity,
                    action: {
                      label: "Actualizar",
                      onClick: () => {
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                      },
                    },
                  });
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Error al registrar Service Worker:', error);
        });

      // Recargar cuando el nuevo service worker toma control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }
}
