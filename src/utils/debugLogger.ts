/**
 * Comprehensive debugging utility for the Savings Mobile App
 * Provides structured logging with different levels and context tracking
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogContext {
  component?: string;
  function?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
  [key: string]: any;
}

class DebugLogger {
  private static instance: DebugLogger;
  private logLevel: LogLevel = LogLevel.DEBUG;
  private isProduction = process.env.NODE_ENV === 'production';

  private constructor() {}

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel && !this.isProduction;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${levelStr}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message, context));
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext) {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = error ? { ...context, error: error.message, stack: error.stack } : context;
      console.error(this.formatMessage(LogLevel.ERROR, message, errorContext));
    }
  }

  // Specialized logging methods for different app areas
  auth(message: string, context?: LogContext) {
    this.info(`[AUTH] ${message}`, { ...context, module: 'authentication' });
  }

  navigation(message: string, context?: LogContext) {
    this.debug(`[NAV] ${message}`, { ...context, module: 'navigation' });
  }

  data(message: string, context?: LogContext) {
    this.debug(`[DATA] ${message}`, { ...context, module: 'data-flow' });
  }

  supabase(message: string, context?: LogContext) {
    this.info(`[SUPABASE] ${message}`, { ...context, module: 'supabase' });
  }

  transaction(message: string, context?: LogContext) {
    this.debug(`[TRANSACTION] ${message}`, { ...context, module: 'transactions' });
  }

  // Performance tracking
  startTimer(label: string): () => void {
    const start = performance.now();
    this.debug(`Timer started: ${label}`);
    
    return () => {
      const end = performance.now();
      const duration = end - start;
      this.info(`Timer completed: ${label} - ${duration.toFixed(2)}ms`);
    };
  }

  // Component lifecycle tracking
  componentMount(componentName: string, props?: any) {
    this.debug(`Component mounted: ${componentName}`, { 
      component: componentName, 
      props: props ? Object.keys(props) : undefined 
    });
  }

  componentUnmount(componentName: string) {
    this.debug(`Component unmounted: ${componentName}`, { component: componentName });
  }

  // API call tracking
  apiCall(method: string, endpoint: string, payload?: any) {
    this.info(`API Call: ${method} ${endpoint}`, { 
      method, 
      endpoint, 
      hasPayload: !!payload 
    });
  }

  apiResponse(method: string, endpoint: string, status: number, duration?: number) {
    this.info(`API Response: ${method} ${endpoint} - ${status}`, { 
      method, 
      endpoint, 
      status, 
      duration 
    });
  }

  // State changes
  stateChange(component: string, stateName: string, oldValue: any, newValue: any) {
    this.debug(`State change in ${component}: ${stateName}`, {
      component,
      stateName,
      oldValue: typeof oldValue === 'object' ? JSON.stringify(oldValue) : oldValue,
      newValue: typeof newValue === 'object' ? JSON.stringify(newValue) : newValue
    });
  }
}

export const logger = DebugLogger.getInstance();

// Helper hook for React components
export const useDebugLogger = (componentName: string) => {
  const componentLogger = {
    debug: (message: string, context?: any) => 
      logger.debug(message, { component: componentName, ...context }),
    info: (message: string, context?: any) => 
      logger.info(message, { component: componentName, ...context }),
    warn: (message: string, context?: any) => 
      logger.warn(message, { component: componentName, ...context }),
    error: (message: string, error?: Error, context?: any) => 
      logger.error(message, error, { component: componentName, ...context }),
    mount: (props?: any) => logger.componentMount(componentName, props),
    unmount: () => logger.componentUnmount(componentName),
    stateChange: (stateName: string, oldValue: any, newValue: any) =>
      logger.stateChange(componentName, stateName, oldValue, newValue)
  };

  return componentLogger;
};

export default logger;
