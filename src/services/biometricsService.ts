import { NativeBiometric, BiometryType, BiometryErrorType } from '@capgo/capacitor-native-biometric';
import { Device, DeviceInfo } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';
import { supabase, tables } from '../config/supabase';
import { logger } from '../utils/debugLogger';

export interface BiometricCapabilities {
  isAvailable: boolean;
  biometryType: BiometryType;
  errorType?: BiometryErrorType;
  reason?: string;
}

export interface DeviceSession {
  id?: string;
  user_id: string;
  device_id: string;
  device_name?: string;
  device_type: 'mobile' | 'tablet' | 'desktop' | 'web';
  platform?: string;
  app_version?: string;
  biometric_type: 'fingerprint' | 'face_id' | 'voice' | 'none';
  biometric_enabled: boolean;
  is_trusted_device: boolean;
  last_active: string;
}

class BiometricsService {
  private deviceInfo: DeviceInfo | null = null;
  private currentSession: DeviceSession | null = null;

  async initialize(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        this.deviceInfo = await Device.getInfo();
        logger.auth('Device info loaded', this.deviceInfo);
      } else {
        // Web fallback
        this.deviceInfo = {
          name: 'Web Browser',
          model: navigator.userAgent,
          platform: 'web',
          operatingSystem: 'unknown',
          osVersion: 'unknown',
          manufacturer: 'unknown',
          isVirtual: false,
          webViewVersion: 'unknown'
        };
      }
    } catch (error) {
      logger.error('Failed to initialize biometrics service', error);
      throw error;
    }
  }

  async checkBiometricCapabilities(): Promise<BiometricCapabilities> {
    try {
      if (!Capacitor.isNativePlatform()) {
        return {
          isAvailable: false,
          biometryType: BiometryType.NONE,
          reason: 'Biometrics not available on web platform'
        };
      }

      const result = await NativeBiometric.isAvailable();
      
      logger.auth('Biometric capabilities checked', result);
      
      return {
        isAvailable: result.isAvailable,
        biometryType: result.biometryType,
        errorType: result.errorType,
        reason: result.errorType ? `Error: ${result.errorType}` : undefined
      };
    } catch (error) {
      logger.error('Failed to check biometric capabilities', error);
      return {
        isAvailable: false,
        biometryType: BiometryType.NONE,
        reason: 'Error checking biometric capabilities'
      };
    }
  }

  async authenticateWithBiometrics(reason: string = 'Authenticate to access your savings'): Promise<boolean> {
    try {
      const capabilities = await this.checkBiometricCapabilities();
      
      if (!capabilities.isAvailable) {
        logger.auth('Biometric authentication not available', { reason: capabilities.reason });
        return false;
      }

      await NativeBiometric.verifyIdentity({
        reason,
        title: 'Biometric Authentication',
        subtitle: 'Use your biometric to authenticate',
        description: 'Access your savings account securely'
      });

      logger.auth('Biometric authentication successful');
      await this.updateLastActive();
      return true;
    } catch (error) {
      logger.error('Biometric authentication failed', error);
      return false;
    }
  }

  async registerDevice(userId: string): Promise<DeviceSession | null> {
    try {
      if (!this.deviceInfo) {
        await this.initialize();
      }

      const capabilities = await this.checkBiometricCapabilities();
      const deviceId = await this.getDeviceId();
      
      const biometricType = this.mapBiometryType(capabilities.biometryType);
      
      const sessionData = {
        user_id: userId,
        device_id: deviceId,
        device_name: this.deviceInfo?.name || 'Unknown Device',
        device_type: this.getDeviceType(),
        platform: this.deviceInfo?.platform || 'unknown',
        app_version: '1.0.0', // You can get this from your app config
        biometric_type: biometricType,
        biometric_enabled: capabilities.isAvailable,
        is_trusted_device: false,
        last_active: new Date().toISOString()
      };

      // Register device in database
      const { data, error } = await supabase.rpc('register_device_session', {
        p_user_id: userId,
        p_device_id: deviceId,
        p_device_name: sessionData.device_name,
        p_device_type: sessionData.device_type,
        p_platform: sessionData.platform,
        p_biometric_type: biometricType,
        p_biometric_enabled: capabilities.isAvailable
      });

      if (error) {
        logger.error('Failed to register device session', error);
        return null;
      }

      this.currentSession = sessionData;
      logger.auth('Device registered successfully', { deviceId, biometricType });
      
      return sessionData;
    } catch (error) {
      logger.error('Failed to register device', error);
      return null;
    }
  }

  async enableBiometrics(userId: string): Promise<boolean> {
    try {
      const capabilities = await this.checkBiometricCapabilities();
      
      if (!capabilities.isAvailable) {
        throw new Error('Biometric authentication is not available on this device');
      }

      // Test biometric authentication
      const authResult = await this.authenticateWithBiometrics('Enable biometric authentication for your savings app');
      
      if (!authResult) {
        return false;
      }

      // Update device session
      const deviceId = await this.getDeviceId();
      const { error } = await supabase
        .from(tables.device_sessions)
        .update({
          biometric_enabled: true,
          biometric_type: this.mapBiometryType(capabilities.biometryType),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('device_id', deviceId);

      if (error) {
        logger.error('Failed to enable biometrics in database', error);
        return false;
      }

      // Update user settings
      const { error: settingsError } = await supabase
        .from(tables.user_settings)
        .update({
          biometrics_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (settingsError) {
        logger.error('Failed to update user settings for biometrics', settingsError);
      }

      logger.auth('Biometrics enabled successfully');
      return true;
    } catch (error) {
      logger.error('Failed to enable biometrics', error);
      return false;
    }
  }

  async disableBiometrics(userId: string): Promise<boolean> {
    try {
      const deviceId = await this.getDeviceId();
      
      // Update device session
      const { error } = await supabase
        .from(tables.device_sessions)
        .update({
          biometric_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('device_id', deviceId);

      if (error) {
        logger.error('Failed to disable biometrics in database', error);
        return false;
      }

      // Update user settings
      const { error: settingsError } = await supabase
        .from(tables.user_settings)
        .update({
          biometrics_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (settingsError) {
        logger.error('Failed to update user settings for biometrics', settingsError);
      }

      logger.auth('Biometrics disabled successfully');
      return true;
    } catch (error) {
      logger.error('Failed to disable biometrics', error);
      return false;
    }
  }

  async isBiometricEnabledForUser(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(tables.user_settings)
        .select('biometrics_enabled')
        .eq('user_id', userId)
        .single();

      if (error) {
        logger.error('Failed to check biometric settings', error);
        return false;
      }

      return data?.biometrics_enabled || false;
    } catch (error) {
      logger.error('Failed to check biometric settings', error);
      return false;
    }
  }

  async getUserDevices(userId: string): Promise<DeviceSession[]> {
    try {
      const { data, error } = await supabase
        .from(tables.device_sessions)
        .select('*')
        .eq('user_id', userId)
        .order('last_active', { ascending: false });

      if (error) {
        logger.error('Failed to get user devices', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get user devices', error);
      return [];
    }
  }

  async updateLastActive(): Promise<void> {
    try {
      if (!this.currentSession) return;

      const { error } = await supabase
        .from(tables.device_sessions)
        .update({
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('device_id', this.currentSession.device_id);

      if (error) {
        logger.error('Failed to update last active', error);
      }
    } catch (error) {
      logger.error('Failed to update last active', error);
    }
  }

  private async getDeviceId(): Promise<string> {
    try {
      if (Capacitor.isNativePlatform()) {
        const deviceId = await Device.getId();
        return deviceId.identifier;
      } else {
        // Web fallback - generate a persistent ID
        let webDeviceId = localStorage.getItem('web_device_id');
        if (!webDeviceId) {
          webDeviceId = 'web_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
          localStorage.setItem('web_device_id', webDeviceId);
        }
        return webDeviceId;
      }
    } catch (error) {
      logger.error('Failed to get device ID', error);
      return 'unknown_device_' + Date.now();
    }
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' | 'web' {
    if (!Capacitor.isNativePlatform()) {
      return 'web';
    }

    if (!this.deviceInfo) {
      return 'mobile';
    }

    // Simple device type detection based on platform
    switch (this.deviceInfo.platform) {
      case 'ios':
      case 'android':
        // Could be enhanced to detect tablet vs phone based on screen size
        return 'mobile';
      case 'web':
        return 'web';
      default:
        return 'mobile';
    }
  }

  private mapBiometryType(biometryType: BiometryType): 'fingerprint' | 'face_id' | 'voice' | 'none' {
    switch (biometryType) {
      case BiometryType.TOUCH_ID:
      case BiometryType.FINGERPRINT:
        return 'fingerprint';
      case BiometryType.FACE_ID:
      case BiometryType.FACE:
        return 'face_id';
      case BiometryType.IRIS:
        return 'voice'; // Map iris to voice as closest alternative
      default:
        return 'none';
    }
  }
}

export const biometricsService = new BiometricsService();
