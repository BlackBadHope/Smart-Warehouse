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
  },

  // Theme for children with minimal UI elements
  kids: {
    id: 'kids',
    name: 'Kids Friendly',
    description: 'Simple, colorful interface for children',
    colors: {
      primary: '#ff6b6b',
      secondary: '#4ecdc4',
      accent: '#45b7d1',
      background: '#fff9e6',
      surface: '#ffffff',
      text: '#2c3e50',
      textSecondary: '#7f8c8d',
      border: '#bdc3c7',
      success: '#2ecc71',
      warning: '#f39c12',
      error: '#e74c3c',
      info: '#3498db'
    },
    typography: {
      fontFamily: 'Comic Sans MS, cursive',
      fontSize: {
        xs: '14px',
        sm: '16px',
        base: '18px',
        lg: '22px',
        xl: '26px'
      }
    },
    spacing: {
      xs: '6px',
      sm: '12px',
      md: '20px',
      lg: '28px',
      xl: '36px'
    },
    borderRadius: {
      none: '0px',
      sm: '12px',
      md: '16px',
      lg: '20px',
      full: '9999px'
    },
    shadows: {
      sm: '0 2px 4px rgba(255, 107, 107, 0.2)',
      md: '0 4px 8px rgba(255, 107, 107, 0.3)',
      lg: '0 8px 16px rgba(255, 107, 107, 0.4)'
    }
  },

  // Theme for managers with efficiency focus
  manager: {
    id: 'manager',
    name: 'Manager Pro',
    description: 'Professional, efficient interface for managers',
    colors: {
      primary: '#2c3e50',
      secondary: '#34495e',
      accent: '#3498db',
      background: '#ecf0f1',
      surface: '#ffffff',
      text: '#2c3e50',
      textSecondary: '#7f8c8d',
      border: '#bdc3c7',
      success: '#27ae60',
      warning: '#f39c12',
      error: '#e74c3c',
      info: '#2980b9'
    },
    typography: {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: {
        xs: '11px',
        sm: '13px',
        base: '15px',
        lg: '17px',
        xl: '19px'
      }
    },
    spacing: {
      xs: '3px',
      sm: '6px',
      md: '12px',
      lg: '18px',
      xl: '24px'
    },
    borderRadius: {
      none: '0px',
      sm: '2px',
      md: '4px',
      lg: '6px',
      full: '9999px'
    },
    shadows: {
      sm: '0 1px 3px rgba(52, 73, 94, 0.1)',
      md: '0 2px 6px rgba(52, 73, 94, 0.15)',
      lg: '0 4px 12px rgba(52, 73, 94, 0.2)'
    }
  },

  // Theme for developers with code-like aesthetics
  developer: {
    id: 'developer',
    name: 'Developer Mode',
    description: 'Code editor inspired dark theme',
    colors: {
      primary: '#1e1e1e',
      secondary: '#2d2d30',
      accent: '#569cd6',
      background: '#0d1117',
      surface: '#161b22',
      text: '#f0f6fc',
      textSecondary: '#7d8590',
      border: '#30363d',
      success: '#238636',
      warning: '#d29922',
      error: '#da3633',
      info: '#0969da'
    },
    typography: {
      fontFamily: 'Fira Code, Consolas, Monaco, monospace',
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
      sm: '3px',
      md: '6px',
      lg: '8px',
      full: '9999px'
    },
    shadows: {
      sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
      md: '0 2px 4px rgba(0, 0, 0, 0.4)',
      lg: '0 4px 8px rgba(0, 0, 0, 0.5)'
    }
  },

  // High contrast theme for accessibility
  highContrast: {
    id: 'highContrast',
    name: 'High Contrast',
    description: 'Maximum readability with high contrast',
    colors: {
      primary: '#000000',
      secondary: '#1a1a1a',
      accent: '#ffff00',
      background: '#ffffff',
      surface: '#f8f8f8',
      text: '#000000',
      textSecondary: '#333333',
      border: '#000000',
      success: '#008000',
      warning: '#ff8000',
      error: '#ff0000',
      info: '#0000ff'
    },
    typography: {
      fontFamily: 'Arial, sans-serif',
      fontSize: {
        xs: '14px',
        sm: '16px',
        base: '18px',
        lg: '20px',
        xl: '24px'
      }
    },
    spacing: {
      xs: '6px',
      sm: '12px',
      md: '18px',
      lg: '24px',
      xl: '30px'
    },
    borderRadius: {
      none: '0px',
      sm: '2px',
      md: '4px',
      lg: '6px',
      full: '9999px'
    },
    shadows: {
      sm: '0 2px 4px rgba(0, 0, 0, 0.8)',
      md: '0 4px 8px rgba(0, 0, 0, 0.8)',
      lg: '0 8px 16px rgba(0, 0, 0, 0.8)'
    }
  },

  // Retro gaming theme
  retro: {
    id: 'retro',
    name: 'Retro Gaming',
    description: '8-bit pixel art inspired theme',
    colors: {
      primary: '#2a2a2a',
      secondary: '#4a4a4a',
      accent: '#00ff41',
      background: '#0f0f23',
      surface: '#1a1a1a',
      text: '#00ff41',
      textSecondary: '#00aa2a',
      border: '#006622',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0040',
      info: '#00aaff'
    },
    typography: {
      fontFamily: 'Courier New, monospace',
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
      sm: '1px',
      md: '2px',
      lg: '3px',
      full: '4px'
    },
    shadows: {
      sm: '2px 2px 0px #006622',
      md: '4px 4px 0px #006622',
      lg: '6px 6px 0px #006622'
    }
  }
};