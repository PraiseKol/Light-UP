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
    <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white shadow-xl">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6 py-2 flex items-center justify-between gap-2 sm:gap-3">
        
        {/* Left section */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-md p-1 shadow-md flex-shrink-0">
            <img src="/logo192.jpg" alt="Light UP" className="w-full h-full object-contain" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[11px] sm:text-sm md:text-base leading-tight">
              Install Light UP App
            </h3>
            <p className="text-[9px] sm:text-xs opacity-90 line-clamp-1">
              Quick access, offline play & notifications
            </p>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <Button
            onClick={handleInstall}
            className="bg-white text-blue-600 hover:bg-blue-50 font-bold 
                       px-2.5 sm:px-4 md:px-5 
                       py-1 sm:py-2 md:py-2.5 
                       rounded-md shadow-lg 
                       text-[10px] sm:text-xs md:text-sm"
          >
            Install
          </Button>

          <button
            onClick={handleDismiss}
            className="p-1 sm:p-1.5 hover:bg-white/20 rounded-md transition-colors 
                       flex items-center justify-center"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

}
