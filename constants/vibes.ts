import { VibeConfig, VibeType } from '../types/theme';

export const VIBES: Record<VibeType, VibeConfig> = {
  terminal: {
    id: 'terminal',
    name: 'Terminal',
    description: 'Classic ASCII terminal aesthetic',
    colors: {
      primary: '#1a1a1a',
      secondary: '#333333',
      accent: '#ffcc00',
      background: '#000000',
      surface: '#1a1a1a',
      text: '#ffffff',
      textSecondary: '#cccccc',
      border: '#444444',
      success: '#00ff00',
      warning: '#ffaa00',
      error: '#ff0000',
      info: '#00aaff'
    },
    typography: {
      fontFamily: 'monospace',
      fontSize: {
        xs: '12px',
        sm: '14px', 
        base: '16px',
        lg: '18px',
        xl: '20px'
      }
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    },
    borderRadius: {
      none: '0px',
      sm: '2px',
      md: '4px',
      lg: '6px',
      full: '9999px'
    },
    shadows: {
      sm: '0 1px 2px rgba(255, 204, 0, 0.1)',
      md: '0 4px 8px rgba(255, 204, 0, 0.15)',
      lg: '0 8px 16px rgba(255, 204, 0, 0.2)'
    }
  },

  neon: {
    id: 'neon',
    name: 'Neon City',
    description: 'Cyberpunk neon glow vibes',
    colors: {
      primary: '#0f0f23',
      secondary: '#1a1a3e',
      accent: '#ff006e',
      background: '#000814',
      surface: '#001d3d',
      text: '#ffffff',
      textSecondary: '#b19cd9',
      border: '#8338ec',
      success: '#06ffa5',
      warning: '#ffb700',
      error: '#ff0054',
      info: '#1be7ff'
    },
    typography: {
      fontFamily: 'system-ui, sans-serif',
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px', 
        lg: '18px',
        xl: '20px'
      }
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    },
    borderRadius: {
      none: '0px',
      sm: '4px',
      md: '8px',
      lg: '12px',
      full: '9999px'
    },
    shadows: {
      sm: '0 0 5px rgba(255, 0, 110, 0.3)',
      md: '0 0 10px rgba(255, 0, 110, 0.4)',
      lg: '0 0 20px rgba(255, 0, 110, 0.5)'
    }
  },

  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Natural earthy tones',
    colors: {
      primary: '#2d5016',
      secondary: '#3d6b2c',
      accent: '#8bc34a',
      background: '#1b2f0f',
      surface: '#2e4020',
      text: '#e8f5e8',
      textSecondary: '#a3d982',
      border: '#4a7c59',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      info: '#2196f3'
    },
    typography: {
      fontFamily: 'Georgia, serif',
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px', 
        xl: '20px'
      }
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    },
    borderRadius: {
      none: '0px',
      sm: '6px',
      md: '10px',
      lg: '14px',
      full: '9999px'
    },
    shadows: {
      sm: '0 2px 4px rgba(0, 0, 0, 0.2)',
      md: '0 4px 8px rgba(0, 0, 0, 0.3)',
      lg: '0 8px 16px rgba(0, 0, 0, 0.4)'
    }
  },

  ocean: {
    id: 'ocean',
    name: 'Ocean Depths',
    description: 'Deep blue underwater feel',
    colors: {
      primary: '#003d5c',
      secondary: '#0066a0',
      accent: '#00b4d8',
      background: '#001d3d',
      surface: '#003566',
      text: '#ffffff',
      textSecondary: '#90e0ef',
      border: '#0077b6',
      success: '#06ffa5',
      warning: '#ffd60a',
      error: '#e63946',
      info: '#48cae4'
    },
    typography: {
      fontFamily: 'system-ui, sans-serif',
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px'
      }
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    },
    borderRadius: {
      none: '0px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      full: '9999px'
    },
    shadows: {
      sm: '0 2px 4px rgba(0, 180, 216, 0.1)',
      md: '0 4px 8px rgba(0, 180, 216, 0.2)',
      lg: '0 8px 16px rgba(0, 180, 216, 0.3)'
    }
  },

  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    description: 'Warm orange and red tones',
    colors: {
      primary: '#8b2635',
      secondary: '#d35269',
      accent: '#f72585',
      background: '#2d1b20',
      surface: '#4c2a3d',
      text: '#fff0f3',
      textSecondary: '#f8b9b9',
      border: '#a663cc',
      success: '#06d6a0',
      warning: '#f77f00',
      error: '#d90429',
      info: '#4cc9f0'
    },
    typography: {
      fontFamily: 'system-ui, sans-serif',
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px'
      }
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    },
    borderRadius: {
      none: '0px',
      sm: '6px',
      md: '10px',
      lg: '14px',
      full: '9999px'
    },
    shadows: {
      sm: '0 2px 4px rgba(247, 37, 133, 0.2)',
      md: '0 4px 8px rgba(247, 37, 133, 0.3)', 
      lg: '0 8px 16px rgba(247, 37, 133, 0.4)'
    }
  },

  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and simple design',
    colors: {
      primary: '#ffffff',
      secondary: '#f8f9fa',
      accent: '#6c757d',
      background: '#ffffff',
      surface: '#f8f9fa',
      text: '#212529',
      textSecondary: '#6c757d',
      border: '#dee2e6',
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
      info: '#17a2b8'
    },
    typography: {
      fontFamily: 'system-ui, sans-serif',
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px'
      }
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    },
    borderRadius: {
      none: '0px',
      sm: '4px',
      md: '8px',
      lg: '12px',
      full: '9999px'
    },
    shadows: {
      sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
      md: '0 2px 4px rgba(0, 0, 0, 0.1)',
      lg: '0 4px 8px rgba(0, 0, 0, 0.15)'
    }
  },

  dark: {
    id: 'dark',
    name: 'Pure Dark',
    description: 'Sleek dark interface',
    colors: {
      primary: '#000000',
      secondary: '#1a1a1a',
      accent: '#ffffff',
      background: '#000000',
      surface: '#1a1a1a',
      text: '#ffffff',
      textSecondary: '#b3b3b3',
      border: '#333333',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    },
    typography: {
      fontFamily: 'system-ui, sans-serif',
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px'
      }
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    },
    borderRadius: {
      none: '0px',
      sm: '4px',
      md: '8px',
      lg: '12px',
      full: '9999px'
    },
    shadows: {
      sm: '0 1px 2px rgba(255, 255, 255, 0.1)',
      md: '0 2px 4px rgba(255, 255, 255, 0.15)',
      lg: '0 4px 8px rgba(255, 255, 255, 0.2)'
    }
  },

  candy: {
    id: 'candy',
    name: 'Candy Shop',
    description: 'Sweet playful colors',
    colors: {
      primary: '#ff6b9d',
      secondary: '#ffc9de',
      accent: '#ff8cc8',
      background: '#fff0f7',
      surface: '#ffe0ec',
      text: '#2d1b69',
      textSecondary: '#7209b7',
      border: '#ff8cc8',
      success: '#06d6a0',
      warning: '#f77f00',
      error: '#f72585',
      info: '#4cc9f0'
    },
    typography: {
      fontFamily: 'system-ui, sans-serif',
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px'
      }
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    },
    borderRadius: {
      none: '0px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      full: '9999px'
    },
    shadows: {
      sm: '0 2px 4px rgba(255, 107, 157, 0.2)',
      md: '0 4px 8px rgba(255, 107, 157, 0.3)',
      lg: '0 8px 16px rgba(255, 107, 157, 0.4)'
    }
  },

  retro: {
    id: 'retro',
    name: 'Retro Wave',
    description: '80s vintage aesthetic',
    colors: {
      primary: '#240046',
      secondary: '#3c096c',
      accent: '#ff006e',
      background: '#10002b',
      surface: '#240046',
      text: '#ffffff',
      textSecondary: '#c77dff',
      border: '#7209b7',
      success: '#06ffa5',
      warning: '#ffb700',
      error: '#ff006e',
      info: '#1be7ff'
    },
    typography: {
      fontFamily: 'monospace',
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px'
      }
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    },
    borderRadius: {
      none: '0px',
      sm: '2px',
      md: '4px',
      lg: '6px',
      full: '9999px'
    },
    shadows: {
      sm: '0 0 5px rgba(255, 0, 110, 0.3)',
      md: '0 0 10px rgba(255, 0, 110, 0.4)',
      lg: '0 0 20px rgba(255, 0, 110, 0.5)'
    }
  },

  monochrome: {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Pure black and white',
    colors: {
      primary: '#000000',
      secondary: '#404040',
      accent: '#808080',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#000000',
      textSecondary: '#666666',
      border: '#cccccc',
      success: '#333333',
      warning: '#666666',
      error: '#000000',
      info: '#999999'
    },
    typography: {
      fontFamily: 'monospace',
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px'
      }
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    },
    borderRadius: {
      none: '0px',
      sm: '0px',
      md: '0px',
      lg: '0px',
      full: '0px'
    },
    shadows: {
      sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
      md: '0 2px 4px rgba(0, 0, 0, 0.3)',
      lg: '0 4px 8px rgba(0, 0, 0, 0.4)'
    }
  }
};