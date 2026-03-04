import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Don't show if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if dismissed recently
    const dismissed = localStorage.getItem('install-prompt-dismissed');
    if (dismissed) {
      const daysSince = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 10000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // For iOS, show prompt after 30 seconds if on mobile
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      setTimeout(() => setShow(true), 30000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) {
      alert(
        'To install MotoRate:\n\n' +
        '1. Tap the Share button\n' +
        '2. Select "Add to Home Screen"\n' +
        '3. Tap "Add"'
      );
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShow(false);
    }

    setDeferredPrompt(null);
  }

  function handleDismiss() {
    localStorage.setItem('install-prompt-dismissed', Date.now().toString());
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl shadow-2xl p-4 z-50 animate-slide-up max-w-md mx-auto">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded transition-colors"
        aria-label="Dismiss install prompt"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <Download className="w-6 h-6 flex-shrink-0 mt-1" />
        <div>
          <h3 className="font-bold mb-1 text-lg">Install MotoRate</h3>
          <p className="text-sm text-orange-100 mb-3">
            Get the full app experience! Add MotoRate to your home screen for quick access.
          </p>
          <button
            onClick={handleInstall}
            className="px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 font-bold text-sm transition-colors active:scale-95"
          >
            Install App
          </button>
        </div>
      </div>
    </div>
  );
}
