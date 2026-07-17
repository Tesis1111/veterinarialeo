import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface SuccessPopupContextType {
  showSuccess: (message: string) => void;
}

const SuccessPopupContext = createContext<SuccessPopupContextType | undefined>(undefined);

export const useSuccessPopup = () => {
  const context = useContext(SuccessPopupContext);
  if (!context) {
    throw new Error('useSuccessPopup must be used within a SuccessPopupProvider');
  }
  return context;
};

export const SuccessPopupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  const showSuccess = (msg: string) => {
    setMessage(msg);
    setIsOpen(true);
    // Auto-close after 2.5 seconds
    setTimeout(() => {
      setIsOpen(false);
    }, 2500);
  };

  return (
    <SuccessPopupContext.Provider value={{ showSuccess }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col items-center text-center relative">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-500 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">¡Éxito!</h3>
            <p className="text-gray-600 font-medium">
              {message}
            </p>
          </div>
        </div>
      )}
    </SuccessPopupContext.Provider>
  );
};
