// GENERATED FILE — DO NOT EDIT. Regenerate: node scripts/build.mjs

export type ThemeName = "light" | "dark";

export type ColorRole =
  | "primary"
  | "on-primary"
  | "primary-container"
  | "on-primary-container"
  | "secondary"
  | "on-secondary"
  | "tertiary"
  | "on-tertiary"
  | "surface"
  | "on-surface"
  | "surface-container"
  | "on-surface-muted"
  | "outline"
  | "error"
  | "on-error"
  | "focus";

export type TypographyRole = "display" | "heading-1" | "heading-2" | "heading-3" | "body" | "small" | "label" | "code";

export interface NativeTypographyStyle {
  /** null means "use the platform UI font"; never a CSS font stack. */
  fontFamily: string | null;
  fontSize: number;
  fontWeight: '400' | '500' | '600';
  lineHeight: number;
  letterSpacing: number;
  fontFamilyKey: string;
}

export interface ShadowLayer {
  color: string;
  /** Alpha extracted from the colour, for shadowOpacity on iOS. */
  opacity: number;
  offsetX: number;
  offsetY: number;
  blur: number;
  /** Reported because React Native cannot express it; see unsupportedFields. */
  spread: number;
}

export interface ThemeRecord {
  name: ThemeName;
  label: string;
  status: string;
  brandApproval: string;
  colors: Record<ColorRole, string>;
}

export declare const meta: {
  name: string;
  version: string;
  status: string;
  brandApproval: string;
  platform: string;
  target: string;
  scope: string;
  generatedFrom: string;
  letterSpacingPolicy: number;
};

export declare const defaultThemeName: ThemeName;
export declare const themes: Record<ThemeName, ThemeRecord>;
export declare const typography: Record<TypographyRole, NativeTypographyStyle>;
export declare const spacing: Record<string, number>;
export declare const radius: Record<string, number>;
export declare const border: Record<string, number>;
export declare const sizes: Record<string, number>;
export declare const opacity: Record<string, number>;
export declare const motion: {
  duration: Record<string, number>;
  easing: Record<string, { x1: number; y1: number; x2: number; y2: number }>;
};
export declare const elevation: Record<string, ShadowLayer[]>;
export declare const platformFonts: { ios: { mono: string }; android: { mono: string } };
export declare const unsupportedFields: string[];
export declare const futureAdapters: string[];

export declare function themeColors(name?: ThemeName): Record<ColorRole, string>;
export declare function typographyFor(platform: 'ios' | 'android'): Record<TypographyRole, Omit<NativeTypographyStyle, 'fontFamilyKey' | 'fontFamily'> & { fontFamily?: string }>;
