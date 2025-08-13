export type VibeType = 
  | 'terminal'      // Current ASCII terminal style  
  | 'neon'          // Cyberpunk neon colors
  | 'forest'        // Natural green/brown palette
  | 'ocean'         // Deep blue/teal palette
  | 'sunset'        // Warm orange/red palette
  | 'minimal'       // Clean white/gray
  | 'dark'          // Pure dark mode
  | 'candy'         // Playful bright colors
  | 'retro'         // 80s vintage colors
  | 'monochrome'    // Black/white only
  | 'kids'          // Child-friendly colorful interface
  | 'manager'       // Professional efficient interface
  | 'developer'     // Code editor inspired theme
  | 'highContrast'; // High contrast for accessibility

export interface VibeConfig {
  id: VibeType;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

export interface ElementCustomization {
  elementId: string;
  customStyles: {
    background?: string;
    color?: string;
    borderColor?: string;
    borderWidth?: string;
    borderRadius?: string;
    padding?: string;
    margin?: string;
    fontSize?: string;
    fontWeight?: string;
    boxShadow?: string;
    opacity?: string;
    transform?: string;
  };
}

export interface UserThemePreferences {
  userId: string;
  currentVibe: VibeType;
  customElements: ElementCustomization[];
  designerModeEnabled: boolean;
  lastModified: string;
}