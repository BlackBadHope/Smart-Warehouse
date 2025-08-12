import { VibeType, UserThemePreferences, ElementCustomization, VibeConfig } from '../types/theme';
import { VIBES } from '../constants/vibes';
import userService from './userService';
import debugService from './debugService';

class ThemeService {
  private currentVibe: VibeType = 'terminal';
  private designerModeEnabled = false;
  private customElements: ElementCustomization[] = [];
  private styleElement: HTMLStyleElement | null = null;

  constructor() {
    this.initializeStyleElement();
    this.loadUserTheme();
  }

  private initializeStyleElement() {
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'inventory-os-theme';
    document.head.appendChild(this.styleElement);
  }

  getCurrentVibe(): VibeType {
    return this.currentVibe;
  }

  getVibeConfig(vibeId?: VibeType): VibeConfig {
    return VIBES[vibeId || this.currentVibe];
  }

  getAllVibes(): VibeConfig[] {
    return Object.values(VIBES);
  }

  setVibe(vibeId: VibeType) {
    this.currentVibe = vibeId;
    this.applyTheme();
    this.saveUserTheme();
    
    // Force re-render by dispatching custom event
    const event = new CustomEvent('themeChanged', { detail: { vibeId } });
    document.dispatchEvent(event);
    
    debugService.info('ThemeService: Vibe changed', { vibeId });
  }

  isDesignerModeEnabled(): boolean {
    return this.designerModeEnabled;
  }

  toggleDesignerMode() {
    const newMode = !this.designerModeEnabled;
    this.designerModeEnabled = newMode;
    this.saveUserTheme();
    
    if (newMode) {
      this.enableDesignerMode();
      debugService.info('ThemeService: Designer mode enabled');
    } else {
      this.disableDesignerMode();
      debugService.info('ThemeService: Designer mode disabled');
    }
    
    return newMode; // Return the new state
  }

  private enableDesignerMode() {
    // Add designer mode styles and event listeners
    document.body.classList.add('designer-mode');
    
    // Add click handlers to all elements for customization
    document.addEventListener('click', this.handleDesignerClick);
  }

  private disableDesignerMode() {
    document.body.classList.remove('designer-mode');
    document.removeEventListener('click', this.handleDesignerClick);
    // Remove outline styles from all elements
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      (el as HTMLElement).style.removeProperty('outline');
      (el as HTMLElement).style.removeProperty('outline-offset');
    });
  }

  private handleDesignerClick = (event: Event) => {
    if (!this.designerModeEnabled) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const target = event.target as HTMLElement;
    if (!target.id) {
      // Generate ID if element doesn't have one
      target.id = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    this.showElementCustomizer(target);
  };

  private showElementCustomizer(element: HTMLElement) {
    // This will trigger the ElementCustomizer modal
    const customEvent = new CustomEvent('showElementCustomizer', {
      detail: { elementId: element.id, element }
    });
    document.dispatchEvent(customEvent);
  }

  customizeElement(elementId: string, styles: ElementCustomization['customStyles']) {
    const existingIndex = this.customElements.findIndex(el => el.elementId === elementId);
    
    if (existingIndex >= 0) {
      this.customElements[existingIndex].customStyles = { ...this.customElements[existingIndex].customStyles, ...styles };
    } else {
      this.customElements.push({ elementId, customStyles: styles });
    }
    
    this.applyElementCustomization(elementId, styles);
    this.saveUserTheme();
    debugService.info('ThemeService: Element customized', { elementId, styles });
  }

  private applyElementCustomization(elementId: string, styles: ElementCustomization['customStyles']) {
    const element = document.getElementById(elementId);
    if (!element) return;

    Object.entries(styles).forEach(([property, value]) => {
      if (value) {
        element.style.setProperty(property.replace(/([A-Z])/g, '-$1').toLowerCase(), value);
      }
    });
  }

  removeElementCustomization(elementId: string) {
    this.customElements = this.customElements.filter(el => el.elementId !== elementId);
    this.saveUserTheme();
    
    // Reset element styles
    const element = document.getElementById(elementId);
    if (element) {
      element.removeAttribute('style');
    }
  }

  private applyTheme() {
    const vibe = this.getVibeConfig();
    
    if (!this.styleElement) return;

    // Generate comprehensive CSS that overrides Tailwind classes
    const themeCSS = `
      :root {
        --io-color-primary: ${vibe.colors.primary};
        --io-color-secondary: ${vibe.colors.secondary};
        --io-color-accent: ${vibe.colors.accent};
        --io-color-background: ${vibe.colors.background};
        --io-color-surface: ${vibe.colors.surface};
        --io-color-text: ${vibe.colors.text};
        --io-color-text-secondary: ${vibe.colors.textSecondary};
        --io-color-border: ${vibe.colors.border};
        --io-color-success: ${vibe.colors.success};
        --io-color-warning: ${vibe.colors.warning};
        --io-color-error: ${vibe.colors.error};
        --io-color-info: ${vibe.colors.info};
        
        --io-font-family: ${vibe.typography.fontFamily};
        --io-border-radius: ${vibe.borderRadius.md};
        --io-shadow: ${vibe.shadows.md};
      }
      
      /* Override body and main containers */
      body, .min-h-screen {
        font-family: var(--io-font-family) !important;
        background-color: var(--io-color-background) !important;
        color: var(--io-color-text) !important;
      }
      
      /* Override specific Tailwind classes with theme colors */
      .bg-black { background-color: var(--io-color-background) !important; }
      .bg-gray-800 { background-color: var(--io-color-surface) !important; }
      .bg-gray-900 { background-color: var(--io-color-primary) !important; }
      .bg-zinc-900 { background-color: var(--io-color-surface) !important; }
      
      .text-yellow-400 { color: var(--io-color-text) !important; }
      .text-orange-400 { color: var(--io-color-accent) !important; }
      .text-white { color: var(--io-color-text) !important; }
      
      .border-yellow-500, .border-yellow-600, .border-yellow-700 { 
        border-color: var(--io-color-border) !important; 
      }
      
      .hover\\:bg-gray-700:hover { background-color: var(--io-color-secondary) !important; }
      
      /* Button styling */
      button, .btn {
        border-radius: var(--io-border-radius) !important;
        transition: all 0.2s ease !important;
      }
      
      /* Success/Error colors */
      .bg-green-800 { background-color: var(--io-color-success) !important; }
      .bg-red-800 { background-color: var(--io-color-error) !important; }
      .text-green-200 { color: var(--io-color-text) !important; }
      .text-red-200 { color: var(--io-color-text) !important; }
      
      /* Designer mode styles */
      .designer-mode * {
        outline: 2px dashed var(--io-color-accent) !important;
        outline-offset: 2px !important;
        cursor: pointer !important;
        position: relative !important;
      }
      
      .designer-mode *:hover {
        outline-color: var(--io-color-accent) !important;
        background-color: rgba(${this.hexToRgb(vibe.colors.accent)}, 0.1) !important;
      }
      
      /* Special styling for current vibe */
      .vibe-${vibe.id} {
        box-shadow: var(--io-shadow) !important;
      }
    `;

    this.styleElement.textContent = themeCSS;
    
    // Apply current vibe class to body
    document.body.className = document.body.className.replace(/vibe-\w+/g, '');
    document.body.classList.add(`vibe-${vibe.id}`);
    
    // Apply custom element styles
    this.customElements.forEach(customElement => {
      this.applyElementCustomization(customElement.elementId, customElement.customStyles);
    });
  }

  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 0, 0';
  }

  private saveUserTheme() {
    const currentUser = userService.getCurrentUser();
    if (!currentUser) return;

    const preferences: UserThemePreferences = {
      userId: currentUser.id,
      currentVibe: this.currentVibe,
      customElements: this.customElements,
      designerModeEnabled: this.designerModeEnabled,
      lastModified: new Date().toISOString()
    };

    localStorage.setItem(`inventory-os-theme-${currentUser.id}`, JSON.stringify(preferences));
  }

  private loadUserTheme() {
    const currentUser = userService.getCurrentUser();
    if (!currentUser) return;

    const savedTheme = localStorage.getItem(`inventory-os-theme-${currentUser.id}`);
    if (savedTheme) {
      try {
        const preferences: UserThemePreferences = JSON.parse(savedTheme);
        this.currentVibe = preferences.currentVibe;
        this.customElements = preferences.customElements || [];
        // Always disable designer mode on load for safety
        this.designerModeEnabled = false;
        
        this.applyTheme();
        
        // Designer mode should only be enabled manually via UI
        this.disableDesignerMode();
      } catch (error) {
        debugService.error('ThemeService: Failed to load user theme', error);
      }
    } else {
      this.applyTheme();
    }
  }

  // Method to be called when user switches
  onUserChanged() {
    // Disable designer mode by default on user change
    if (this.designerModeEnabled) {
      this.disableDesignerMode();
      this.designerModeEnabled = false;
    }
    this.loadUserTheme();
  }

  // Export theme for sharing
  exportTheme(): string {
    const currentUser = userService.getCurrentUser();
    if (!currentUser) return '';

    const themeData = {
      vibe: this.currentVibe,
      customElements: this.customElements,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString()
    };

    return btoa(JSON.stringify(themeData));
  }

  // Import theme from another user
  importTheme(themeData: string): boolean {
    try {
      const decodedData = JSON.parse(atob(themeData));
      
      if (decodedData.vibe && VIBES[decodedData.vibe as VibeType]) {
        this.currentVibe = decodedData.vibe;
        this.customElements = decodedData.customElements || [];
        this.applyTheme();
        this.saveUserTheme();
        return true;
      }
    } catch (error) {
      debugService.error('ThemeService: Failed to import theme', error);
    }
    return false;
  }
}

export default new ThemeService();