import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      // Don't show immediately if they've dismissed it recently
      const lastDismissed = localStorage.getItem('pwa_banner_dismissed');
      if (!lastDismissed || Date.now() - Number(lastDismissed) > 86400000) { // 24 hours
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="bg-indigo-600 text-white px-4 py-3 shadow-md flex items-center justify-between sm:px-6 lg:px-8 z-50 fixed bottom-0 left-0 right-0 sm:bottom-4 sm:left-4 sm:right-auto sm:rounded-xl sm:max-w-sm ml-auto mr-auto">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-lg shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Install SmartCart</span>
          <span className="text-xs text-indigo-100">Add to home screen for quick access</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="bg-white text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-indigo-200 hover:text-white rounded-md bg-transparent transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
