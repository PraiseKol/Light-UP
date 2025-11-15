import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone;
    
    // Check if user dismissed before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    
    if (isInstalled || dismissed) {
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after 3 seconds
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] animate-slide-down">
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white shadow-2xl">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 bg-white rounded-xl p-2 shadow-lg flex-shrink-0">
              <img src="/logo192.jpg" alt="Light UP" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm md:text-base">Install Light UP App</h3>
              <p className="text-xs md:text-sm opacity-90 truncate">
                Get quick access, offline play & notifications
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={handleInstall}
              className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-4 py-2 rounded-lg shadow-lg text-sm md:text-base"
            >
              Install
            </Button>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
