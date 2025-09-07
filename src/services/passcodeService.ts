import { supabase, tables } from '../config/supabase';
import { logger } from '../utils/debugLogger';
import { databaseService } from '../services/databaseService'; // Import the databaseService

export interface PasscodeVerificationResult {
  success: boolean;
  isLocked?: boolean;
  attemptsRemaining?: number;
  lockoutTimeRemaining?: number;
  error?: string;
}

export interface PasscodeSetupResult {
  success: boolean;
  error?: string;
}

class PasscodeService {
  
  async hasPasscode(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(tables.user_passcodes)
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        logger.error('Failed to check passcode existence', error instanceof Error ? error : new Error(String(error)));
        return false;
      }

      return !!data;
    } catch (error) {
      logger.error('Failed to check passcode existence', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  async setupPasscode(userId: string, passcode: string): Promise<PasscodeSetupResult> {
    try {
      // Validate passcode format
      if (!this.isValidPasscode(passcode)) {
        return {
          success: false,
          error: 'Passcode must be exactly 6 digits'
        };
      }

      // Check if user already has a passcode
      const hasExisting = await this.hasPasscode(userId);
      if (hasExisting) {
        return {
          success: false,
          error: 'User already has a passcode. Use changePasscode instead.'
        };
      }

      // Use databaseService to set passcode
      await databaseService.setUserPasscode(userId, passcode);

      logger.auth('Passcode setup successfully', { userId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to setup passcode', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: 'Failed to setup passcode'
      };
    }
  }

  async changePasscode(userId: string, currentPasscode: string, newPasscode: string): Promise<PasscodeSetupResult> {
    try {
      // Validate new passcode format
      if (!this.isValidPasscode(newPasscode)) {
        return {
          success: false,
          error: 'New passcode must be exactly 6 digits'
        };
      }

      // Verify current passcode first using databaseService
      const verification = await databaseService.verifyUserPasscode(userId, currentPasscode);
      if (!verification.success) {
        return {
          success: false,
          error: verification.error || 'Current passcode is incorrect'
        };
      }

      // Set new passcode using databaseService
      await databaseService.setUserPasscode(userId, newPasscode);

      logger.auth('Passcode changed successfully', { userId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to change passcode', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: 'Failed to change passcode'
      };
    }
  }

  async verifyPasscode(userId: string, passcode: string): Promise<PasscodeVerificationResult> {
    try {
      // Use the databaseService method instead of direct RPC calls
      const result = await databaseService.verifyUserPasscode(userId, passcode);
      
      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          isLocked: result.locked,
          error: result.error
        };
      }
    } catch (error) {
      logger.error('Failed to verify passcode', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: 'Failed to verify passcode'
      };
    }
  }

  async resetPasscode(userId: string): Promise<PasscodeSetupResult> {
    try {
      // This would typically require additional verification (email, security questions, etc.)
      // For now, we'll just remove the existing passcode
      const { error } = await supabase
        .from(tables.user_passcodes)
        .delete()
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to reset passcode', error instanceof Error ? error : new Error(String(error)));
        return {
          success: false,
          error: 'Failed to reset passcode'
        };
      }

      logger.auth('Passcode reset successfully', { userId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to reset passcode', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: 'Failed to reset passcode'
      };
    }
  }

  async getPasscodeStatus(userId: string): Promise<{
    hasPasscode: boolean;
    isLocked: boolean;
    failedAttempts: number;
    attemptsRemaining: number;
  }> {
    try {
      const hasPasscode = await this.hasPasscode(userId);
      
      if (!hasPasscode) {
        return {
          hasPasscode: false,
          isLocked: false,
          failedAttempts: 0,
          attemptsRemaining: 5
        };
      }

      // Check lock status
      const { data: lockData } = await supabase.rpc('is_passcode_locked', {
        p_user_id: userId
      });

      // Get failed attempts
      const { data: passcodeData } = await supabase
        .from(tables.user_passcodes)
        .select('failed_attempts')
        .eq('user_id', userId)
        .single();

      const failedAttempts = passcodeData?.failed_attempts || 0;
      const attemptsRemaining = Math.max(0, 5 - failedAttempts);

      return {
        hasPasscode: true,
        isLocked: !!lockData,
        failedAttempts,
        attemptsRemaining
      };
    } catch (error) {
      logger.error('Failed to get passcode status', error instanceof Error ? error : new Error(String(error)));
      return {
        hasPasscode: false,
        isLocked: false,
        failedAttempts: 0,
        attemptsRemaining: 5
      };
    }
  }

  private isValidPasscode(passcode: string): boolean {
    return /^\d{6}$/.test(passcode);
  }
}

export const passcodeService = new PasscodeService();
