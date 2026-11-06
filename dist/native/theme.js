// GENERATED FILE — DO NOT EDIT.
// Regenerate: node scripts/build.mjs
//
// Personal AI Systems design tokens — native theme, version 0.1.0 (provisional).
// Colours and typefaces are PROVISIONAL and awaiting brand approval.
//
// Numeric-only by design: no CSS var(), no rem/px/ch strings, no cubic-bezier().
// See adapters/native/mapping.json for the documented conversion rules.

export const meta = {
  "name": "Personal AI Systems design tokens",
  "version": "0.1.0",
  "status": "provisional",
  "brandApproval": "pending",
  "platform": "native",
  "target": "React Native (iOS + Android) style objects",
  "scope": "Token and theme support only. This is NOT a mobile component library: no components, no gesture handling, no SwiftUI or Compose adapter, and no device QA has been performed.",
  "generatedFrom": "tokens/core.tokens.json",
  "letterSpacingPolicy": 0
};

export const defaultThemeName = "light";

export const themes = {
  "light": {
    "name": "light",
    "label": "Light",
    "status": "provisional",
    "brandApproval": "pending",
    "colors": {
      "primary": "#14539a",
      "on-primary": "#ffffff",
      "primary-container": "#d6e3ff",
      "on-primary-container": "#001c3a",
      "secondary": "#44546b",
      "on-secondary": "#ffffff",
      "tertiary": "#0f5f55",
      "on-tertiary": "#ffffff",
      "surface": "#fbfcfd",
      "on-surface": "#191c1f",
      "surface-container": "#eef1f5",
      "on-surface-muted": "#5a6169",
      "outline": "#737b83",
      "error": "#b3261e",
      "on-error": "#ffffff",
      "focus": "#14539a"
    }
  },
  "dark": {
    "name": "dark",
    "label": "Dark",
    "status": "provisional",
    "brandApproval": "pending",
    "colors": {
      "primary": "#a9c7ff",
      "on-primary": "#001c3a",
      "primary-container": "#0f3d78",
      "on-primary-container": "#d6e3ff",
      "secondary": "#b3c6e0",
      "on-secondary": "#1e2c3d",
      "tertiary": "#7fd8c9",
      "on-tertiary": "#00382f",
      "surface": "#111417",
      "on-surface": "#eef1f5",
      "surface-container": "#1c2024",
      "on-surface-muted": "#a8b1ba",
      "outline": "#8b949c",
      "error": "#ffb4ab",
      "on-error": "#690005",
      "focus": "#a9c7ff"
    }
  }
};

export const typography = {
  "display": {
    "fontFamily": null,
    "fontSize": 40,
    "fontWeight": "600",
    "lineHeight": 46,
    "letterSpacing": 0,
    "fontFamilyKey": "system-sans"
  },
  "heading-1": {
    "fontFamily": null,
    "fontSize": 32,
    "fontWeight": "600",
    "lineHeight": 40,
    "letterSpacing": 0,
    "fontFamilyKey": "system-sans"
  },
  "heading-2": {
    "fontFamily": null,
    "fontSize": 24,
    "fontWeight": "600",
    "lineHeight": 30,
    "letterSpacing": 0,
    "fontFamilyKey": "system-sans"
  },
  "heading-3": {
    "fontFamily": null,
    "fontSize": 20,
    "fontWeight": "500",
    "lineHeight": 25,
    "letterSpacing": 0,
    "fontFamilyKey": "system-sans"
  },
  "body": {
    "fontFamily": null,
    "fontSize": 16,
    "fontWeight": "400",
    "lineHeight": 26,
    "letterSpacing": 0,
    "fontFamilyKey": "system-sans"
  },
  "small": {
    "fontFamily": null,
    "fontSize": 14,
    "fontWeight": "400",
    "lineHeight": 21,
    "letterSpacing": 0,
    "fontFamilyKey": "system-sans"
  },
  "label": {
    "fontFamily": null,
    "fontSize": 13,
    "fontWeight": "500",
    "lineHeight": 18,
    "letterSpacing": 0,
    "fontFamilyKey": "system-sans"
  },
  "code": {
    "fontFamily": null,
    "fontSize": 14,
    "fontWeight": "400",
    "lineHeight": 21,
    "letterSpacing": 0,
    "fontFamilyKey": "system-mono"
  }
};

export const spacing = {
  "0": 0,
  "25": 4,
  "50": 8,
  "75": 12,
  "100": 16,
  "150": 24,
  "200": 32,
  "300": 48,
  "400": 64,
  "600": 96,
  "800": 128,
  "inset-tight": 8,
  "inset": 16,
  "inset-loose": 24,
  "stack-tight": 8,
  "stack": 16,
  "stack-loose": 24,
  "section": 64,
  "page": 48
};

export const radius = {
  "full": 9999,
  "lg": 8,
  "md": 6,
  "none": 0,
  "sm": 4,
  "xs": 2
};

export const border = {
  "hairline": 1,
  "strong": 2
};

export const sizes = {
  "control": 44,
  "control-compact": 36,
  "icon": 20
};

export const opacity = {
  "disabled": 0.38,
  "muted": 0.6
};

export const motion = {
  "duration": {
    "base": 180,
    "fast": 120,
    "slow": 240
  },
  "easing": {
    "standard": {
      "x1": 0.2,
      "y1": 0,
      "x2": 0.2,
      "y2": 1
    }
  }
};

export const elevation = {
  "none": [],
  "overlay": [
    {
      "color": "#0f17201f",
      "opacity": 0.122,
      "offsetX": 0,
      "offsetY": 2,
      "blur": 4,
      "spread": 0
    },
    {
      "color": "#0f172029",
      "opacity": 0.161,
      "offsetX": 0,
      "offsetY": 8,
      "blur": 24,
      "spread": 0
    }
  ],
  "raised": [
    {
      "color": "#0f17201a",
      "opacity": 0.102,
      "offsetX": 0,
      "offsetY": 1,
      "blur": 2,
      "spread": 0
    },
    {
      "color": "#0f172014",
      "opacity": 0.078,
      "offsetX": 0,
      "offsetY": 2,
      "blur": 6,
      "spread": 0
    }
  ]
};

export const platformFonts = {
  "ios": {
    "mono": "Menlo"
  },
  "android": {
    "mono": "monospace"
  }
};

export const unsupportedFields = [
  "shadow.spread (no React Native equivalent)",
  "multiple simultaneous shadow layers (React Native applies one shadow per view; nest views or choose one layer)",
  "border width shorthand (consume border.hairline/strong per side)"
];

export const futureAdapters = [
  "SwiftUI (Color/TextStyle mapping) — not implemented",
  "Jetpack Compose (Color/Typography mapping) — not implemented"
];

/** Colour roles for one theme. Unknown names throw rather than fall back silently. */
export function themeColors(name = defaultThemeName) {
  const found = themes[name];
  if (!found) throw new Error(`unknown theme "${name}"`);
  return found.colors;
}

/** Typography with a concrete platform mono family resolved for the given platform. */
export function typographyFor(platform) {
  const mono = platform === "android" ? platformFonts.android.mono : platformFonts.ios.mono;
  const out = {};
  for (const [role, style] of Object.entries(typography)) {
    const resolved = { ...style };
    delete resolved.fontFamilyKey;
    if (style.fontFamilyKey === "system-mono") resolved.fontFamily = mono;
    out[role] = resolved;
  }
  return out;
}
