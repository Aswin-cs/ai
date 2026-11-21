---
name: Urban Air Quality Assistant
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1b1b1c'
  on-surface-variant: '#424654'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0ef'
  outline: '#737785'
  outline-variant: '#c3c6d6'
  surface-tint: '#0856cf'
  primary: '#0041a2'
  on-primary: '#ffffff'
  primary-container: '#0b57d0'
  on-primary-container: '#ced9ff'
  inverse-primary: '#b2c5ff'
  secondary: '#156d2f'
  on-secondary: '#ffffff'
  secondary-container: '#9ef3a5'
  on-secondary-container: '#1c7133'
  tertiary: '#6e3a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#914e00'
  on-tertiary-container: '#ffd1ae'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001847'
  on-primary-fixed-variant: '#0040a1'
  secondary-fixed: '#a1f6a8'
  secondary-fixed-dim: '#85d98e'
  on-secondary-fixed: '#002108'
  on-secondary-fixed-variant: '#00531e'
  tertiary-fixed: '#ffdcc2'
  tertiary-fixed-dim: '#ffb77c'
  on-tertiary-fixed: '#2e1500'
  on-tertiary-fixed-variant: '#6d3900'
  background: '#fcf9f8'
  on-background: '#1b1b1c'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  title-md:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  title-sm:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  body-lg:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Roboto Flex
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Roboto Flex
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Roboto Flex
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-md: 1.5rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system embodies the warmth, clarity, and protective nature required for community-first environmental health in India. Designed for multi-generational families—from tech-savvy youth managing home purifiers to elders checking morning walk safety—the interface blends Google Material 3's systematic calm with localized clarity.

The visual style follows pure **Material 3 Expressive Minimalism**:
- **Tone:** Scientific yet deeply empathetic, civic-minded, and non-alarmist. Air quality data is contextualized into actionable wellness routines (e.g., masking recommendations, ventilation windows, and school commute cautions).
- **Aesthetic Core:** Generous whitespace, tonal container layering instead of visual noise, tactile pill geometry, and vibrant semantic cues that communicate air safety without inducing panic.

## Colors

The palette grounds the interface in trusted civic blue while leveraging nature-inspired botanical greens and nuanced AQI bands. Surface hierarchies use Google M3 tonal layering to separate content modules without harsh contrasts.

### Surface System
- **Canvas / Background:** `#F8F9FA` (Soft Cool Grey)
- **Surface Pure (Elevated Cards):** `#FFFFFF`
- **Surface Container Low:** `#F0F4F9`
- **Surface Container High:** `#E9EEF6`
- **Outline (Dividers):** `#E0E3E1`
- **Outline Variant (Form strokes):** `#C4C7C5`

### Primary Role (Action & Identity)
- **Primary:** `#0B57D0` (Google Blue)
- **On-Primary:** `#FFFFFF`
- **Primary Container:** `#D3E3FD`
- **On-Primary Container:** `#041E49`

### Secondary Role (Botanical & Safe Nature)
- **Secondary:** `#146C2E` (Botanical Green)
- **On-Secondary:** `#FFFFFF`
- **Secondary Container:** `#C4EED0`
- **On-Secondary Container:** `#072711`

### Text & Iconography
- **On-Surface (Primary Read):** `#1F1F1F`
- **On-Surface-Variant (Supporting/Subtitles):** `#444746`

### Semantic AQI Status Tiers
- **AQI Good (0–50):** Background `#E6F4EA`, Text & Icon `#137333`
- **AQI Moderate (51–100):** Background `#FEF7E0`, Text & Icon `#B06000`
- **AQI Poor (101–200):** Background `#FCE8E6`, Text & Icon `#C5221F`
- **AQI Severe (201+):** Background `#F9DEDC`, Text & Icon `#8C1D18`

## Typography

The type system balances the friendly, open geometric terminals of Plus Jakarta Sans for titles and metrics with the supreme utility and multi-lingual adaptability of Roboto Flex for density, tabular AQI numbers, and multilingual Indian localized text.

- **Numerics & AQI Badges:** Display and Headline roles use Plus Jakarta Sans with tabular figures enabled for immediate real-time metric updates.
- **Editorial & Advisory Body:** Roboto Flex provides high legibility at dense body sizes for health advisories, medical notes, and community alerts.
- **Iconography Standard:** Pair exclusively with Google Material Symbols Outlined, aligning stroke weight to font weight (`wght 400` or `500`).

## Layout & Spacing

The layout is built around an 8-point baseline grid with a 4-point sub-grid for fine-grained alignment.

### Grid & Breakpoints
- **Mobile (< 600px):** 4-column fluid layout, `16px` (`margin`) screen gutters, `16px` (`gutter`) column gaps. Cards stretch full width minus outer margins.
- **Tablet (600px - 1024px):** 8-column layout, `24px` (`margin-md`) screen gutters, `24px` (`gutter-md`) column gaps. Two-column split for current sensor metric and neighborhood comparative map.
- **Desktop (> 1024px):** 12-column fixed grid with maximum content width capped at `1280px` centered on canvas, `32px` (`margin-lg`) margin, and `24px` (`gutter-lg`) gutters.

### Component Internal Density
- Critical glance metrics (Current AQI, PM2.5, PM10) utilize `space-xl` container padding to maintain focus.
- Micro-advisory chips and parameter badges employ `space-xs` vertically and `space-sm` horizontally for compact touch targets.

## Elevation & Depth

In strict accordance with Google Material Design 3 guidelines, this system eliminates high-contrast, artificial drop shadows. Depth and hierarchy are achieved entirely through **Tonal Surface Tinting** and **Subtle Edge Contrast**:

1. **Elevation 0 (Canvas Base):** `#F8F9FA`. Uncontained canvas space.
2. **Elevation 1 (Card & Module Layer):** `#FFFFFF` with a 1px border of `#E0E3E1`. Used for main sensor cards, health impact cards, and hourly trends.
3. **Elevation 2 (Tonal Interactive Surfaces):** `#F0F4F9` fill with no border. Used for nested content blocks within cards (e.g., specific pollutant breakdown tables).
4. **Elevation 3 (Floating Overlays & Dialogs):** `#FFFFFF` with an ambient, diffused shadow: `0 8px 24px -4px rgba(4, 30, 73, 0.08)` and `0 2px 6px -1px rgba(4, 30, 73, 0.04)`.
5. **State Overlays:** Hover and press states use color tints derived from the active layer's text color with low opacity (Hover: 8% on-surface, Pressed: 12% on-surface).

## Shapes

The shape hierarchy follows M3 expressiveness, mixing high-curvature elements with distinct functional corners:

- **Cards & Data Modules:** Explicitly set to `24px` (extra-large card curvature) to soften data-heavy environmental readouts.
- **Interactive Action Buttons:** Stadium / Fully pill-shaped (`9999px`) for high-level user actions like "View Recommendations", "Filter Stations", or "Share Alert".
- **Selection Controls & Filter Chips:** Soft rounded shape from `8px` to `12px` to distinguish them from rounded action pills.
- **Micro AQI Value Indicators:** Fully rounded pill capsules (`9999px`) to frame numerical data.

## Components

### Buttons
- **Filled Primary Button:** Background `#0B57D0`, text `#FFFFFF`, height `48px`, border-radius `9999px`, horizontal padding `24px`. Material Symbol Outlined prefix aligned at `20px`.
- **Tonal Button:** Background `#D3E3FD`, text `#041E49`, border-radius `9999px`, height `40px`.
- **Outlined Button:** Transparent background, 1px border `#C4C7C5`, text `#0B57D0`, border-radius `9999px`.

### Chips & Segmented Controls
- **Filter Chips:** Height `32px`, border-radius `8px`, border 1px `#C4C7C5`, background `#FFFFFF`. When selected: background `#D3E3FD`, border 1px transparent, text `#041E49` with a leading check icon.
- **Pill Status Chips (AQI Tags):** Border-radius `9999px`, height `28px`, padding `4px 12px`. Colors strictly follow the Semantic AQI Palette (e.g., `#E6F4EA` surface with `#137333` label).

### Cards
- **Overview Card:** Pure white `#FFFFFF` surface, border-radius `24px`, 1px outline `#E0E3E1`, padding `24px`. Features a top-level headline, real-time sync timestamp, and an embedded tonal container (`#F0F4F9`) housing the dominant AQI gauge.
- **Advisory Card:** Background `#F0F4F9`, border-radius `24px`, padding `20px`. Contains health action tips paired with a botanical green icon.

### Form Inputs & Station Search
- **Search Bar / Field:** Pill-shaped (`9999px`) or `16px` rounded container, background `#F0F4F9`, hover background `#E9EEF6`, 0px border. Active focus state applies a 2px `#0B57D0` outline. Leading search icon `#444746`.
- **Checkboxes & Radios:** Primary Blue `#0B57D0` fill when selected, border `#C4C7C5` when unselected. Subtle `2px` corner radius on checkboxes.

### Domain-Specific Components
- **AQI Dial / Gauge Module:** Central numeric display using Plus Jakarta Sans Display-Lg, encircled by a 4-tier segmented semantic color ring (Good, Moderate, Poor, Severe) with active indicator indicator needle or dot.
- **Family Vulnerability Badges:** Tonal pill badges representing high-risk profiles (Elderly, Children, Asthmatic) toggled with Botanical Green `#146C2E` accents when targeted precautions are needed.