import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';

export const useNetwork = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [networkType, setNetworkType] = useState<string>('unknown');

  useEffect(() => {
    // Initial check
    const checkNetworkStatus = async () => {
      const status = await Network.getStatus();
      setIsOnline(status.connected);
      setNetworkType(status.connectionType);
    };

    checkNetworkStatus();

    let listener: any;

    // Listen for network status changes
    const setupListener = async () => {
      listener = await Network.addListener('networkStatusChange', (status) => {
        setIsOnline(status.connected);
        setNetworkType(status.connectionType);
      });
    };
    
    setupListener();

    // Cleanup
    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, []);

  return {
    isOnline,
    networkType,
    isCellular: networkType === 'cellular',
    isWifi: networkType === 'wifi',
    isOffline: !isOnline,
  };
};

export default useNetwork;
