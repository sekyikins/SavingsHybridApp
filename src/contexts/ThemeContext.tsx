import { createContext, useState, useEffect, useContext } from 'react';

declare global {
  interface Window {
    __theme?: string;
    __setTheme?: (theme: string) => void;
  }
}

type ThemeContextType = {
  darkMode: boolean;
  toggleDarkMode: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return;

    // Get the saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Determine the initial theme
    const initialTheme = window.__theme || savedTheme || 
      (prefersDark.matches ? 'dark' : 'light');
    
    const initialDarkMode = initialTheme === 'dark';
    console.log('Initializing theme:', initialTheme);
    
    // Update state and apply theme
    setDarkMode(initialDarkMode);
    
    // Apply the theme to the document
    const applyTheme = (isDark: boolean) => {
      const theme = isDark ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', isDark);
      document.body.classList.toggle('dark', isDark);
      document.body.style.backgroundColor = isDark ? '#121212' : '#ffffff';
      
      // Update the theme color meta tag
      const themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor) {
        themeColor.setAttribute('content', isDark ? '#121212' : '#ffffff');
      }
      
      return theme;
    };
    
    // Apply the initial theme
    const appliedTheme = applyTheme(initialDarkMode);
    
    // Save the theme to localStorage if it's different from the saved one
    if (savedTheme !== appliedTheme) {
      localStorage.setItem('theme', appliedTheme);
    }
    
    // Set up system theme change listener (only if using system preference)
    if (!savedTheme) {
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        const isDark = e.matches;
        console.log('System theme changed to:', isDark ? 'dark' : 'light');
        setDarkMode(isDark);
        applyTheme(isDark);
      };
      
      prefersDark.addEventListener('change', handleSystemThemeChange);
      return () => {
        prefersDark.removeEventListener('change', handleSystemThemeChange);
      };
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    console.log('Toggling theme to:', newDarkMode ? 'dark' : 'light');
    
    // Update state
    setDarkMode(newDarkMode);
    
    // Save preference
    const theme = newDarkMode ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    
    // Apply the theme
    document.documentElement.classList.toggle('dark', newDarkMode);
    document.body.classList.toggle('dark', newDarkMode);
    document.body.style.backgroundColor = newDarkMode ? '#121212' : '#ffffff';
    
    // Update the theme color meta tag
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute('content', newDarkMode ? '#121212' : '#ffffff');
    }
    
    // Dispatch event for any components that might be listening
    window.dispatchEvent(new Event('theme-changed'));
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
