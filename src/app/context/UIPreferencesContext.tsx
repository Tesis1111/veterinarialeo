import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface UIPreferences {
  compactMode: boolean;
  showAvatars: boolean;
  tableViewMode: "compact" | "comfortable" | "expanded";
  fontSize: "small" | "medium" | "large";
  animationsEnabled: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  cardSpacing: "tight" | "normal" | "relaxed";
}

interface UIPreferencesContextType {
  preferences: UIPreferences;
  updatePreference: <K extends keyof UIPreferences>(key: K, value: UIPreferences[K]) => void;
  resetPreferences: () => void;
}

const defaultPreferences: UIPreferences = {
  compactMode: false,
  showAvatars: true,
  tableViewMode: "comfortable",
  fontSize: "medium",
  animationsEnabled: true,
  highContrast: false,
  reduceMotion: false,
  cardSpacing: "normal"
};

const UIPreferencesContext = createContext<UIPreferencesContextType | undefined>(undefined);

export function UIPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UIPreferences>(() => {
    const saved = localStorage.getItem("veterinaria_ui_preferences");
    return saved ? JSON.parse(saved) : defaultPreferences;
  });

  // Aplicar preferencias al DOM
  useEffect(() => {
    const root = document.documentElement;
    
    // Tamaño de fuente
    root.classList.remove('font-small', 'font-medium', 'font-large');
    root.classList.add(`font-${preferences.fontSize}`);
    
    // Modo compacto
    if (preferences.compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }
    
    // Alto contraste
    if (preferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Reducir movimiento
    if (preferences.reduceMotion || !preferences.animationsEnabled) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
    
    // Mostrar avatares
    if (preferences.showAvatars) {
      root.classList.add('show-avatars');
    } else {
      root.classList.remove('show-avatars');
    }
    
    // Espaciado de tarjetas
    root.classList.remove('card-tight', 'card-normal', 'card-relaxed');
    root.classList.add(`card-${preferences.cardSpacing}`);
    
    // Vista de tablas
    root.classList.remove('table-compact', 'table-comfortable', 'table-expanded');
    root.classList.add(`table-${preferences.tableViewMode}`);
    
  }, [preferences]);

  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem("veterinaria_ui_preferences", JSON.stringify(preferences));
  }, [preferences]);

  const updatePreference = <K extends keyof UIPreferences>(key: K, value: UIPreferences[K]) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
  };

  return (
    <UIPreferencesContext.Provider value={{ preferences, updatePreference, resetPreferences }}>
      {children}
    </UIPreferencesContext.Provider>
  );
}

export function useUIPreferences() {
  const context = useContext(UIPreferencesContext);
  if (!context) {
    throw new Error("useUIPreferences debe usarse dentro de UIPreferencesProvider");
  }
  return context;
}