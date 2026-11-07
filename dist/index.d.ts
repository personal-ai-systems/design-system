// GENERATED FILE — DO NOT EDIT. Regenerate: node scripts/build.mjs

export type ThemeName = "light" | "dark";
export type ColorRole = "primary" | "on-primary" | "primary-container" | "on-primary-container" | "secondary" | "on-secondary" | "tertiary" | "on-tertiary" | "surface" | "on-surface" | "surface-container" | "on-surface-muted" | "outline" | "error" | "on-error" | "focus" | "primary-hover" | "surface-hover" | "success" | "warning" | "on-image" | "image-scrim";
export type TypographyRole = "hero" | "interface" | "display" | "heading-1" | "heading-2" | "heading-3" | "body" | "small" | "label" | "code";

export interface Dimension {
  value: number;
  unit: 'px' | 'rem';
}

export interface Duration {
  value: number;
  unit: 'ms' | 's';
}

export interface TypographyStyle {
  fontFamily: string;
  fontSize: Dimension;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: Dimension;
}

export interface ShadowLayerValue {
  color: string;
  offsetX: Dimension;
  offsetY: Dimension;
  blur: Dimension;
  spread: Dimension;
}

export declare const tokens: {
  meta: {
    name: string;
    namespace: string;
    version: string;
    status: string;
    format: string;
    brandApproval: string;
    referenceUnit: string;
    letterSpacingPolicy: number;
    generatedFrom: string[];
  };
  typography: Record<TypographyRole, TypographyStyle>;
  space: Record<string, Dimension>;
  spaceRoles: Record<string, Dimension>;
  radius: Record<string, Dimension>;
  border: Record<string, Dimension>;
  size: Record<string, Dimension>;
  opacity: Record<string, number>;
  motion: { duration: Record<string, Duration>; easing: Record<string, number[]> };
  elevation: Record<string, ShadowLayerValue[]>;
  themes: Record<ThemeName, { name: ThemeName; label: string; status: string; brandApproval: string; colors: Record<ColorRole, string> }>;
};

export declare const meta: typeof tokens.meta;
export declare const themes: typeof tokens.themes;
export declare const defaultThemeName: ThemeName;
export declare function themeColors(name?: ThemeName): Record<ColorRole, string>;
