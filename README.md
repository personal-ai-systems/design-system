# Personal AI Systems design system

One typed token source, a replaceable theme mapping, and separate web and native
adapters. Version `0.1.0`, **provisional**: the brand palette and the brand
typeface are not approved yet.

This package is deliberately small. It does not ship a component framework, a
build pipeline, a database or a runtime dependency.

---

## Status, stated plainly

| Thing | State |
| --- | --- |
| Canonical typed token core | built, tested |
| Light and dark theme mapping | built, **provisional**, awaiting brand approval |
| Web adapter (CSS variables) | built, tested |
| Web base and component styles | built, opt-in, tested |
| Native adapter (numeric theme) | built, tested as style objects |
| Packed-package consumer import | tested |
| Native component kit | **not built** — this is tokens only |
| SwiftUI / Jetpack Compose adapters | **not built** — documented as future work |
| Device QA on iOS/Android | **not done** |
| Public GitHub repository | available at `personal-ai-systems/design-system` |
| Published to npm | **not done** |
| Legal licence | **not chosen** — `UNLICENSED` is a placeholder |

A native token adapter is not a mobile component kit. Someone can consume these
numbers in React Native today; that does not mean a mobile app looks finished.

---

## Layout

```
tokens/core.tokens.json          ONE canonical source (PAS typed profile)
themes/registry.json             which themes exist, and the contrast claims
themes/provisional-light.tokens.json   colour role -> reference ramp mapping
themes/provisional-dark.tokens.json
adapters/web/mapping.json        web-only: CSS font stacks, breakpoints, ch measures
adapters/web/base.css            opt-in element defaults
adapters/web/components.css      opt-in v0 components
adapters/native/mapping.json     native-only: font strategy, shadow field mapping
scripts/build.mjs                core + themes + mappings -> dist/
scripts/validate.mjs             the contract gate (run before every commit)
tests/                           contract, parity and packaging tests
examples/                        pinned-version consumer examples
showcase/index.html              static showcase, no server needed
dist/                            generated output (committed, never edited)
```

Three rules keep this honest:

1. **`tokens/core.tokens.json` is platform-neutral.** It holds logical reference
   values, semantic roles and requirements. No CSS function, no font stack, no
   `rem`, no `ch`, no `box-shadow` string.
2. **Platform knowledge lives in the adapter's `mapping.json`.** A CSS font
   stack is a web fact. React Native's lack of shadow spread is a native fact.
3. **Nothing downstream edits `dist/`.** Regenerate instead.

## The core

This is a **DTCG-inspired custom profile, not a DTCG 2025.10-conformant
exchange file**. In particular, colours are hex strings rather than DTCG colour
objects, and abstract font keys use a custom `string` type. External DTCG tools
need a converter; none is claimed here. See the
[DTCG format](https://www.designtokens.org/tr/2025.10/format/).

The original web-only inputs and obsolete builder are retained for provenance
under `docs/archive/web-v0/`. They are not build inputs or package exports and
are excluded from the packed package. Never edit or run them for current work.

Supported types are declared in `meta.supportedTypes` and enforced: `color`,
`dimension`, `string`, `fontWeight`, `number`, `duration`, `cubicBezier`,
`shadow`. Anything else fails the build rather than passing through.

Dimensions are logical reference units recorded in `px`. That is a unit, not a
CSS decision:

- web: `px / 16 -> rem` for text-relative groups, `px` for borders and radii
  (a hairline should not grow with the user's font size)
- native: the bare number, consumed as dp/pt

Aliases use `{group.token}` and are validated for three failure modes: a
dangling name, a cycle, and a declared type that does not match the target.

Letter spacing is **0** at every size and weight in this version. It is still a
typed dimension, so changing that decision is a data edit, never a component
edit.

Colour roles live in the themes, not the core. The core only declares which
roles must exist:

```
primary, on-primary, primary-container, on-primary-container, secondary,
on-secondary, tertiary, on-tertiary, surface, on-surface, surface-container,
on-surface-muted, outline, error, on-error, focus
```

## Web

Variables and styling are separate imports, on purpose:

```html
<!-- required: variables only, resets nothing, styles nothing -->
<link rel="stylesheet" href="node_modules/@personal-ai-systems/design-system/dist/web/variables.css">

<!-- optional: the default look -->
<link rel="stylesheet" href="node_modules/@personal-ai-systems/design-system/adapters/web/base.css">
<link rel="stylesheet" href="node_modules/@personal-ai-systems/design-system/adapters/web/components.css">
```

Themes: `:root` carries light. `[data-pas-theme="dark"]` on any element
re-themes that subtree. With no attribute set, `prefers-color-scheme` decides.
`prefers-reduced-motion` collapses every duration to `1ms`.

Web-only values (`68ch` prose measure, breakpoints in px) are in
`adapters/web/mapping.json`, never in the core.

## Native

```js
import { spacing, themeColors, typographyFor } from '@personal-ai-systems/design-system/native';

const typography = typographyFor('ios'); // use Platform.OS in a React Native app
const styles = {
  title: { ...typography['heading-1'], color: themeColors('light')['on-surface'] },
  body: { ...typography.body, marginBottom: spacing.stack },
};
```

What the adapter converts, and why:

- `fontSize` — dp/pt number. `lineHeight` — `round(fontSize * ratio)`, because
  React Native wants a length, not a ratio.
- `fontWeight` — the string `'400' | '500' | '600'`.
- `letterSpacing` — `0`.
- `duration` — bare milliseconds. `cubicBezier` — `{x1,y1,x2,y2}`; the consumer
  calls `Easing.bezier(...)`. The package never imports `react-native`.
- `shadow` — structured layers plus a derived `opacity`. CSS `spread` and
  multi-layer stacking are **declared as unsupported** in
  `native.unsupportedFields`, not silently dropped.
- Fonts — raw token metadata uses `fontFamily: null` for the platform default.
  `typographyFor('ios' | 'android')` omits that property from actual styles and
  removes internal font keys. Mono is resolved per platform,
  because no single family name is correct on both.

## Using it from another project

```bash
# pin an exact version; do not use a range for a design system
npm install /path/to/design-system   # or the tarball from `npm pack`
```

Then in the consuming `package.json`, record the pin explicitly:

```json
"dependencies": { "@personal-ai-systems/design-system": "0.1.0" }
```

`examples/web/consumer.html` and `examples/native/theme-fixture.mjs` are the
runnable versions of the two snippets above.

Pinning matters: `0.1.x` values are provisional, so a minor bump may change
every colour and type size. A consumer that wants silence should pin exact and
upgrade deliberately.

## Checks

```bash
npm run build      # regenerate dist/ from the core
npm run validate   # contract, themes, policy, determinism, parity, a11y, contrast, package, showcase
npm test           # contract + parity + packed-package import
npm run check      # all three, in order
```

`validate` fails on: an unsupported type, a bad value shape, a dangling alias,
an alias cycle, a type mismatch, a non-`px` dimension, a CSS string in the core,
a missing or extra colour role, a theme not marked provisional, any non-zero
letter spacing, non-deterministic output, web/native disagreement, a
missing custom property, a hand-written media query that does not match the web
mapping, a lost focus/reduced-motion/text-fit rule, a contrast pair below its
minimum, an export target that does not exist or is outside the published files,
and a showcase that does not display every role and both themes.

Contrast thresholds: 4.5:1 for text pairs, 3:1 for the focus ring and outline.
Passing the declared pairs is **not** a WCAG audit of a rendered page.

## What changes when brand approval lands

1. Replace the ramps in `tokens/core.tokens.json` `color.reference`, or add an
   approved theme file and its registry entry.
2. Add the chosen typeface: a `font.family` key, the web stack in
   `adapters/web/mapping.json`, the platform names in
   `adapters/native/mapping.json`, and retained local font files (a CDN font is
   a privacy and licence decision, not a default).
3. Re-check contrast, `npm run check`, and read the showcase.

No component, consumer or class name has to change. That is the point of the
structure.

## Not decided here

Publishing to npm and choosing a legal licence.
`private: true` and `UNLICENSED` keep 0.1.0 unpublishable until those decisions
are made deliberately.

## Public concept previews

Three colour directions using the same token/component package are in
`previews/creator-flow/`. Their provisional palettes do not change the shared
brand defaults. Run `node scripts/build-previews.mjs` to regenerate the variants
and validate local assets, vendor copies and declared text contrast.
GitHub Pages deploys only that static preview, using `.github/workflows/pages.yml`.
The form is explicitly a browser-local demonstration: no submissions or storage.
