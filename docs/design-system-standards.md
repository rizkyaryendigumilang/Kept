# Kept — Universal Design System & Website Quality Standard (Modern 2026)

This document formalizes the **8 Modern Website Characteristics** adopted by Kept without compromising its zero-knowledge privacy boundaries, existing UI layout, or brand identity. All future development, components, and automated agents must adhere to these guidelines.

---

## 1. Modern Visual Language & Typography Hierarchy
- **Character & Tracking**: Large headings (`h1`, `.hero-title`) utilize tight negative tracking (`-0.025em`) and balanced leading (`1.15`–`1.2`) to establish confident visual gravity. Section subheadings (`h2`, `.modal-title`) use `-0.012em` tracking. Eyebrows and metadata chips use uppercase letter-spacing (`+0.05em`).
- **Text-Wrap Balance**: Core headings implement `text-wrap: balance` to eliminate awkward single-word orphans across viewport resizes.
- **Proportional Spacing**: Built on a disciplined 4px/8px spacing grid (`--space-xxs: 2px`, `--space-xs: 4px`, `--space-sm: 8px`, `--space-md: 16px`, `--space-lg: 24px`, `--space-xl: 32px`).

---

## 2. Bento Grid & Modular Proportion
- **Rhythm over Monotony**: Varied modular compositions (`.bento-grid`, `.bento-hero`, `.bento-stat-card`) replace uniform card repeats.
- **Large Feature Hero Card (`.bento-hero`)**: Anchor tile spanning full grid width on desktop, encapsulating dynamic time-based greeting, Zero-Knowledge verification pill, and quick action.
- **Modular Stat Bento Tiles (`.bento-stat-card`)**: High-density metric tiles pairing dedicated icon containers (`KeyRound`, `FileText`, `CreditCard`) with tabular-num counts and micro-labels.
- **Hairline Borders**: Subdued 1px borders (`var(--border-subtle)`) with inner glass highlight (`var(--glass-highlight)`) establish clear structural compartments without visual clutter.
- **Fluid Responsive Stacking**: Bento sections gracefully stack on mobile viewports (`max-width: 700px` to `grid-template-columns: 1fr`) with single-column hero expansion, transitioning into 3-column compositions on desktop.

---

## 3. Sophisticated Typography (Swiss & Apple Precision)
- **Primary Typeface**: `Geist` / `Geist Variable` for crisp, neutral sans-serif legibility across all screen densities.
- **Monospace & Numerical Integrity**: `JetBrains Mono Variable` for cryptographic salt, keys, hashes, account numbers, and timers.
- **Tabular Numerics**: Strict enforcement of `font-variant-numeric: tabular-nums` (`font-feature-settings: "tnum" 1`) across PIN inputs, timestamps, and card numbers so digits never jitter during live updates.
- **Rendering Optimization**: `text-rendering: optimizeLegibility`, `-webkit-font-smoothing: antialiased`, and `-moz-osx-font-smoothing: grayscale`.

---

## 4. Subtle Animations & Micro-interactions
- **Physics-Informed Curves**: Standard deceleration curve is `cubic-bezier(0.16, 1, 0.3, 1)` (Apple fluid spring).
- **Tactile Touch Feedback**: Immediate physical press response (`transform: scale(0.97)` to `scale(0.985)`) on interactive buttons, cards, and segmented items with `90ms` ease-out transitions.
- **Micro-Hover States**: Subtle `-1px` elevation translation on desktop pointers.
- **Accessibility Invariant**: Full compliance with `@media (prefers-reduced-motion: reduce)`, instantly falling back to zero animation duration for vestibular accessibility.

---

## 5. Modern Color System & Contrast
- **Palette**: Deep slate dark mode (`#0f1115` base, `#1a1d24` surface, `#222630` surface-alt) paired with a high-contrast crisp light mode (`#ffffff` base, `#f5f5f5` surface).
- **Accents with Purpose**: Emerald (`#10b981` / `#22c55e`) exclusively signals verified security, biometric confirmation, and encrypted integrity. Amber (`#f59e0b`) highlights sensitive unencrypted actions. Brand accent (`--t-brand-accent`) highlights active navigation.
- **WCAG AA Compliance**: High-contrast text ratios (minimum 4.5:1 for body, 3:1 for large headers) guaranteed across both light and dark themes.

---

## 6. Glassmorphism & Depth
- **Translucent Surfaces**: Restrained, optical backdrops using `backdrop-filter: blur(8px-20px) saturate(140%-180%)` for popovers, bottom-sheets, topbars, and dialog modals.
- **Inner Bevel Highlights**: Hairline inner highlights (`inset 0 1px 0 0 rgba(255, 255, 255, 0.06)` in dark mode, `rgba(255, 255, 255, 0.95)` in light mode) simulating physical glass edge refraction.
- **Layered Multi-Stage Shadows**: Avoids muddy flat dropshadows; uses multi-layer diffusion (`--shadow-raised`, `--shadow-floating`).

---

## 7. Responsive & Adaptive Mobile Design
- **44px Touch Boundaries**: Critical interactive elements (close buttons, action icons, hamburger toggles) respect Apple's Human Interface Guidelines 44×44px minimum touch target size.
- **Safe Area Insets**: Native support for notch, Dynamic Island, and home indicator padding via `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`, `env(safe-area-inset-left)`, and `env(safe-area-inset-right)`.
- **Safari iOS Zoom Prevention**: Inputs maintain 16px font-size on mobile touch devices to eliminate iOS automatic viewport zooming.
- **Overscroll Containment**: Modals and sheets isolate vertical touch scrolls using `overscroll-behavior: contain`.

---

## 8. Functional UX & Immediate Feedback
- **Zero-Latency Feedback**: Real-time feedback via haptic vibrations (`light`, `medium`, `error`) and unobtrusive non-blocking toasts (`showToast`).
- **Keyboard Navigation**: Distinct, high-visibility 2px focus-visible rings (`outline-offset: 2px`) without visual disruption for mouse/touch clicks.
- **Zero-Dead-End Empty States**: All empty states provide meaningful contextual explanation and single-tap primary actions.
- **Instant Search & Filter**: Real-time multi-attribute search over decrypted client RAM with zero round-trip latency.
