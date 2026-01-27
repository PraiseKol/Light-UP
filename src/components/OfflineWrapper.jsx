// src/components/OfflineWrapper.jsx
import { useEffect, useRef } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import OfflinePage from '@/components/OfflinePage';
import toast from 'react-hot-toast';

export default function OfflineWrapper({ children }) {
  const isOnline = useOnlineStatus();
  const wasOffline = useRef(false);

  // Show toast when coming back online
  useEffect(() => {
    if (isOnline && wasOffline.current) {
      toast.success("You're back online!", {
        icon: '🌐',
        duration: 3000,
      });
    }
    wasOffline.current = !isOnline;
  }, [isOnline]);

  if (!isOnline) {
    return <OfflinePage />;
  }

  return children;
}
