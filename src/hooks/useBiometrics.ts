import { useState, useEffect, useCallback } from 'react';
import { biometricsService, BiometricCapabilities, DeviceSession } from '../services/biometricsService';
import { BiometryType } from '@capgo/capacitor-native-biometric';
import { useAuth } from './useAuth';
import { logger } from '../utils/debugLogger';

export interface UseBiometricsReturn {
  // State
  isInitialized: boolean;
  capabilities: BiometricCapabilities | null;
  isEnabled: boolean;
  devices: DeviceSession[];
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  checkCapabilities: () => Promise<BiometricCapabilities>;
  authenticate: (reason?: string) => Promise<boolean>;
  enableBiometrics: () => Promise<boolean>;
  disableBiometrics: () => Promise<boolean>;
  registerDevice: () => Promise<DeviceSession | null>;
  refreshDevices: () => Promise<void>;
  clearError: () => void;
}

export const useBiometrics = (): UseBiometricsReturn => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      await biometricsService.initialize();
      setIsInitialized(true);
      
      logger.auth('Biometrics hook initialized');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize biometrics';
      setError(errorMessage);
      logger.error('Failed to initialize biometrics hook', err instanceof Error ? err : undefined);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const checkCapabilities = useCallback(async (): Promise<BiometricCapabilities> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const caps = await biometricsService.checkBiometricCapabilities();
      setCapabilities(caps);
      
      return caps;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check biometric capabilities';
      setError(errorMessage);
      logger.error('Failed to check capabilities', err instanceof Error ? err : undefined);
      
      const fallbackCaps: BiometricCapabilities = {
        isAvailable: false,
        biometryType: BiometryType.NONE,
        reason: errorMessage
      };
      setCapabilities(fallbackCaps);
      return fallbackCaps;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const authenticate = useCallback(async (reason?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await biometricsService.authenticateWithBiometrics(reason);
      
      if (!result) {
        setError('Biometric authentication failed');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      logger.error('Biometric authentication failed', err instanceof Error ? err : undefined);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const enableBiometrics = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setError('User not authenticated');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await biometricsService.enableBiometrics(user.id);
      
      if (result) {
        setIsEnabled(true);
        logger.auth('Biometrics enabled successfully');
      } else {
        setError('Failed to enable biometrics');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enable biometrics';
      setError(errorMessage);
      logger.error('Failed to enable biometrics', err instanceof Error ? err : undefined);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const disableBiometrics = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setError('User not authenticated');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await biometricsService.disableBiometrics(user.id);
      
      if (result) {
        setIsEnabled(false);
        logger.auth('Biometrics disabled successfully');
      } else {
        setError('Failed to disable biometrics');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable biometrics';
      setError(errorMessage);
      logger.error('Failed to disable biometrics', err instanceof Error ? err : undefined);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const registerDevice = useCallback(async (): Promise<DeviceSession | null> => {
    if (!user?.id) {
      setError('User not authenticated');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const session = await biometricsService.registerDevice(user.id);
      
      if (!session) {
        setError('Failed to register device');
      } else {
        // Refresh devices list
        await refreshDevices();
      }
      
      return session;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register device';
      setError(errorMessage);
      logger.error('Failed to register device', err instanceof Error ? err : undefined);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const refreshDevices = useCallback(async (): Promise<void> => {
    if (!user?.id) return;

    try {
      setError(null);
      
      const userDevices = await biometricsService.getUserDevices(user.id);
      setDevices(userDevices);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh devices';
      setError(errorMessage);
      logger.error('Failed to refresh devices', err instanceof Error ? err : undefined);
    }
  }, [user?.id]);

  // Check if biometrics is enabled for current user
  const checkBiometricStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      const enabled = await biometricsService.isBiometricEnabledForUser(user.id);
      setIsEnabled(enabled);
    } catch (err) {
      logger.error('Failed to check biometric status', err instanceof Error ? err : undefined);
    }
  }, [user?.id]);

  // Initialize on mount and when user changes
  useEffect(() => {
    if (user?.id && !isInitialized) {
      initialize();
    }
  }, [user?.id, isInitialized, initialize]);

  // Check capabilities and status when initialized
  useEffect(() => {
    if (isInitialized && user?.id) {
      checkCapabilities();
      checkBiometricStatus();
      refreshDevices();
    }
  }, [isInitialized, user?.id, checkCapabilities, checkBiometricStatus, refreshDevices]);

  return {
    // State
    isInitialized,
    capabilities,
    isEnabled,
    devices,
    isLoading,
    error,

    // Actions
    initialize,
    checkCapabilities,
    authenticate,
    enableBiometrics,
    disableBiometrics,
    registerDevice,
    refreshDevices,
    clearError
  };
};
