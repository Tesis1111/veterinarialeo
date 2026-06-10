import { useState, useEffect } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { Badge } from './ui/badge';

export default function PWAStatus() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [displayMode, setDisplayMode] = useState<'browser' | 'standalone'>('browser');

  useEffect(() => {
    // Detectar si la app está instalada
    const checkInstallStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      
      if (isStandalone || isIOSStandalone) {
        setIsInstalled(true);
        setDisplayMode('standalone');
      }
    };

    checkInstallStatus();

    // Escuchar cambios en el modo de visualización
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setDisplayMode('standalone');
      } else {
        setIsInstalled(false);
        setDisplayMode('browser');
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      }
    };
  }, []);

  // Solo mostrar en modo desarrollo (puedes quitar esto en producción)
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <Badge 
        variant={isInstalled ? "default" : "secondary"}
        className={isInstalled ? "bg-green-600" : "bg-gray-500"}
      >
        {displayMode === 'standalone' ? (
          <>
            <Smartphone className="h-3 w-3 mr-1" />
            PWA Instalada
          </>
        ) : (
          <>
            <Monitor className="h-3 w-3 mr-1" />
            Navegador
          </>
        )}
      </Badge>
    </div>
  );
}
