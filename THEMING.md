# Color Theming

The app uses a single source of truth for color: CSS custom properties declared on `:root` in [`src/styles.scss`](src/styles.scss). Components reference them with `var(--rise-*)` — never hardcode hex values.

## Design intent

- **Pink (`#ff4d6d`)** is the action / CTA color (Give, Redeem, primary buttons, focus rings, active states).
- The **navy gradient** lives on the top header only. Body and content cards stay light.
- Surfaces are layered light: page → card → elevated card.
- Secondary accents (cyan, purple, mint, amber) are reserved for chips and tags on light surfaces.

## Tokens

### Brand pink (CTAs)

| Token | Value | Use |
| --- | --- | --- |
| `--rise-pink` | `#ff4d6d` | Primary buttons, links, focus, active nav |
| `--rise-pink-deep` | `#e63956` | Hover / pressed state for pink |
| `--rise-pink-soft` | `#ffe0e6` | Filled chip / badge background |
| `--rise-pink-tint` | `#fff5f7` | Hover background on light rows |

### Header (navy gradient)

| Token | Value | Use |
| --- | --- | --- |
| `--rise-header-bg` | `linear-gradient(245deg, #114a85 16.44%, #00002c 83.78%)` | Top nav background only |
| `--rise-navy` | `#114a85` | Gradient stop / dark accent |
| `--rise-navy-deep` | `#00002c` | Gradient stop |

### Surfaces

| Token | Value | Use |
| --- | --- | --- |
| `--rise-body` | `#f5f7fb` | Page background |
| `--rise-card` | `#ffffff` | Card / panel background |
| `--rise-card-elev` | `#fafbff` | Elevated card / nested panel |
| `--rise-line` | `#e5e7eb` | Default border / divider |
| `--rise-line-strong` | `#d1d5db` | Emphasized border |

### Type on light

| Token | Value | Use |
| --- | --- | --- |
| `--rise-ink` | `#111827` | Primary text, headings |
| `--rise-muted` | `#6b7280` | Secondary text, labels |
| `--rise-muted-soft` | `#9ca3af` | Tertiary text, placeholders |

### Secondary accents (chips on light surfaces)

Each accent comes as a pair: a saturated tone for text/icon and a soft tone for the chip background.

| Pair | Saturated | Soft | Typical use |
| --- | --- | --- | --- |
| Cyan | `--rise-cyan` `#1d4ed8` | `--rise-cyan-soft` `#dbeafe` | Info chip |
| Purple | `--rise-purple` `#6d28d9` | `--rise-purple-soft` `#ede9fe` | Category / tag |
| Mint | `--rise-mint` `#15803d` | `--rise-mint-soft` `#dcfce7` | Success / positive |
| Amber | `--rise-amber` `#92400e` | `--rise-amber-soft` `#fef3c7` | Highlight / pending |

### Status

| Token | Value | Use |
| --- | --- | --- |
| `--rise-warn` | `#b45309` | Warning text/icon |
| `--rise-warn-soft` | `#fef3c7` | Warning banner background |
| `--rise-error` | `#b91c1c` | Error text/icon |
| `--rise-error-soft` | `#fee2e2` | Error banner background |

## Usage rules

1. **Reference tokens, not hex.** All component styles should use `var(--rise-*)`. If you need a new color, add a token to `src/styles.scss` first.
2. **Pink is for actions only.** Don't use it for decoration, dividers, or large surfaces. CTAs use `--rise-pink`; hover/pressed use `--rise-pink-deep`.
3. **Navy stays in the header.** The navy gradient and `--rise-navy*` tokens are not for buttons or cards.
4. **Body stays light.** Cards on top of `--rise-body` use `--rise-card`; nested panels use `--rise-card-elev`. Avoid dark surfaces outside the header.
5. **Pair chip colors.** When using a secondary accent, pair the saturated token (text/icon) with its `-soft` token (background). Don't mix across pairs.
6. **Status colors are reserved.** Use `--rise-warn*` / `--rise-error*` only for warnings and errors so they keep their meaning.

## Adding a new token

1. Add the variable to `:root` in [`src/styles.scss`](src/styles.scss), grouped with related tokens.
2. Include a one-line comment if the intended use isn't obvious.
3. Use `var(--rise-*)` in component styles — don't reintroduce the hex elsewhere.
