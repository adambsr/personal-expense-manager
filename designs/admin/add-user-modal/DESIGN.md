---
name: Elevated Fintech Minimal
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464554'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777586'
  outline-variant: '#c7c4d7'
  surface-tint: '#5148d7'
  primary: '#2a14b4'
  on-primary: '#ffffff'
  primary-container: '#4338ca'
  on-primary-container: '#c1beff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#7b0020'
  on-tertiary: '#ffffff'
  tertiary-container: '#a6002f'
  on-tertiary-container: '#ffb0b4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e3dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#100069'
  on-primary-fixed-variant: '#372abf'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#ffdada'
  tertiary-fixed-dim: '#ffb3b6'
  on-tertiary-fixed: '#40000c'
  on-tertiary-fixed-variant: '#920028'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: 3.5rem
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: 0em
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.02em
  tabular-num:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a high-trust, editorial-grade financial atmosphere engineered for personal wealth intelligence and expense governance. Drawing inspiration from modern high-craft interfaces, it prioritizes clarity, calm authority, and spatial precision over decorative noise.

### Brand Attributes
- **Refined Precision:** Every micro-border, tabular figure, and interaction state communicates mathematical rigor and composure.
- **Understated Elegance:** Deep royal indigo serves as an intentional anchor, paired with cool architectural slates and luminous, airy canvas zones.
- **Actionable Legibility:** Color is reserved strictly for state and polarity: vibrant emerald for income inflows, deliberate rose for expenditures, and indigo for verified execution.

### Design Movement
The interface blends **Contemporary SaaS Editorial** with **Crisp Micro-Border Architecturalism**:
- Ultra-subtle semi-translucent hairpins (`1px`) over raw dropped boundaries.
- Optical balance favoring clean typography, high negative space, and meticulous content density.
- Subtle diffused light models that reject muddy drop-shadows in favor of razor-sharp surface definitions.

## Colors

The palette leverages a dedicated cool-slate structure with high-contrast functional assignments, ensuring financial polarity is instantaneously recognized.

### Functional Roles
- **Primary (`#4338CA` - Deep Royal Indigo):** Serves as the executive anchor. Used for high-intent primaries, active navigations, selected tab indicators, and interactive focal points.
- **Secondary (`#059669` - Emerald Positive):** Dictates net-positive states, incoming transfers, income analytics, and positive financial delta tags.
- **Tertiary (`#E11D48` - Rose Negative):** Dictates outflows, budget ceilings, critical alerts, and destructive transactional confirmations.
- **Neutral (`#0F172A` - Slate Charcoal):** Drives high-order typography, structural borders (`#E2E8F0`), muted surface backgrounds (`#F8FAFC`), and subtle table divisions (`#F1F5F9`).

### Palette Application Rules
- **Canvas & Containers:** Base canvas rests on `#FFFFFF` and `#F8FAFC`. Elevated card containers utilize `#FFFFFF` bordered with `#E2E8F0`.
- **Text Hierarchies:** Headings demand `#0F172A` for maximum contrast. Subtitles and metadata default to `#64748B`. Muted tabular headers sit at `#94A3B8`.
- **Data Polarity:** Green and Rose are never decorative; their appearance is strictly reserved for directional monetary movement.

## Typography

The typography pairing contrasts structural geometry in editorial headings with utilitarian legibility in numerical ledgers.

### Pairing Strategy
- **Headlines (`Plus Jakarta Sans`):** Provides a modern, sculpted look. Used across page banners, balance totals, and modal headers.
- **Body & Data (`Inter`):** Selected for its neutral neutrality, wide range of weight expressions, and tabular number tracking (`font-feature-settings: 'tnum' on, 'cv05' on`).

### Typographic Directives
- **Financial Balance Rules:** All raw monetary values, breakdown lines, and dates must be rendered using `tabular-num` to prevent shifting alignment along decimal columns.
- **Uppercase Tracked Badges:** Sub-labels (e.g., "MONTHLY RUN RATE", "UNCOLLECTED") utilize `label-sm` with slight uppercase letter-spacing (`0.05em`) and medium weight to anchor modular blocks.

## Layout & Spacing

A 12-column responsive layout is applied to accommodate complex financial analytics dashboards, data tables, and quick-entry widgets.

### Screen Adaptations
- **Desktop (1024px+):** 12-column configuration with `2rem` page margins and `1.5rem` gutters. Metric cards span 3 or 4 columns; transactional ledgers span 8 columns accompanied by a 4-column categorical sidebar.
- **Tablet (768px – 1023px):** 8-column layout. Metric cards collapse to 4 columns (2x2 grid); data ledgers take full width with category drill-downs stacked beneath.
- **Mobile (<768px):** 4-column layout with `1rem` margins and `1rem` gutters. Metric tiles transition to horizontal carousels or single-column stacked summaries. Bottom sticky action triggers replace top-bar actionable triggers.

### Spacing Principles
- Container interiors strictly rely on `space-md` (`1rem`) to `space-lg` (`1.5rem`) padding.
- Compact micro-elements (chips, dropdown triggers, transaction row items) mandate `space-xs` and `space-sm` for horizontal and vertical offsets to preserve high informational density.

## Elevation & Depth

This system intentionally relies on razor-thin micro-borders and delicate ambient light diffusion instead of traditional heavy drops.

### Elevation Levels
- **Level 0 (Flat Canvas):** `#F8FAFC` base surface. Zero elevation, seamless backdrop.
- **Level 1 (Card & Modular Panes):** `#FFFFFF` surface container encapsulated by a subtle, crisp border: `1px solid #E2E8F0`. Shadow: `0 1px 2px 0 rgba(15, 23, 42, 0.03)`.
- **Level 2 (Popovers, Dropdowns & Drawers):** Floating overlays. Border: `1px solid #E2E8F0`. Shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`.
- **Level 3 (Modals & Command Palettes):** Centered critical contexts. Border: `1px solid #CBD5E1`. Shadow: `0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`. Accompanied by a frosted glass backdrop: `rgba(15, 23, 42, 0.35)` with `backdrop-filter: blur(4px)`.

### Border Integrity
Every elevation tier retains a hairline border. In this design system, shadow does not substitute for structural bounds; it only clarifies focal priority.

## Shapes

The design system standardizes on an intentional 8px (`0.5rem`) baseline radius (`roundedness: 2`), delivering clean modern architecture without excessive circularity.

### Shape Hierarchy
- **Base Components (`0.5rem` / `8px`):** Used on primary input fields, buttons, interactive table rows, search bars, and dropdown menus.
- **Containers (`1rem` / `16px`):** Used on dashboard widgets, transaction cards, and modular analysis blocks (`rounded-lg`).
- **Overlays (`1.5rem` / `24px`):** Reserved for system-level dialogs, drawer panels, and primary modal wrappers (`rounded-xl`).
- **Capsules / Status Indicators:** Small tags, numeric counters, and balance pill badges utilize complete pill radii (`rounded-full`) to delineate them from actionable rectilinear controls.

## Components

### Buttons
- **Primary:** Background `#4338CA`, foreground `#FFFFFF`, border `transparent`. Hover: `#3730A3`. Height `36px` (compact) or `40px` (standard), padding `0 1rem`, font weight `500`.
- **Secondary / Outline:** Background `#FFFFFF`, foreground `#0F172A`, border `1px solid #E2E8F0`. Hover: `#F8FAFC`.
- **Ghost:** Background `transparent`, foreground `#64748B`. Hover: `#F1F5F9`, foreground `#0F172A`.
- **Destructive:** Background `#FFF1F2`, foreground `#E11D48`, border `1px solid #FFE4E6`. Hover: `#FFE4E6`.

### Inputs & Financial Selectors
- **Text/Currency Inputs:** Background `#FFFFFF`, border `1px solid #E2E8F0`, padding `0.5rem 0.75rem`, font size `0.875rem`. Focus: border color `#4338CA`, ring `2px solid rgba(67, 56, 202, 0.15)`.
- **Prefix Containers:** Fixed currency indicators (`$`, `€`, `£`) rendered with muted foreground `#64748B`, solid separator line, and non-selectable layout.

### Cards & Metric Modules
- Encapsulated by `1px solid #E2E8F0` on `#FFFFFF` backgrounds.
- Headers display `headline-sm` with an uppercase `label-sm` tracker.
- Large numeric balances use `Plus Jakarta Sans` (`2rem`), accented by a directional growth badge (`+12.4%` in `#059669` or `-4.1%` in `#E11D48`).

### Transaction Lists & Tables
- **Row Styling:** Tabular lines isolated with `1px solid #F1F5F9` row separators. Hovering over a row highlights the background to `#F8FAFC`.
- **Values:** Negative amounts rendered with Tertiary `#E11D48` (`-$45.00`); positive credits rendered with Secondary `#059669` (`+$1,200.00`). Tabular formatting enforced.

### Chips & Badges
- **Income Badge:** Background `#ECFDF5`, text `#059669`, border `1px solid #A7F3D0`.
- **Expense Badge:** Background `#FFF1F2`, text `#E11D48`, border `1px solid #FECDD3`.
- **Neutral/Category Badge:** Background `#F1F5F9`, text `#475569`, border `1px solid #E2E8F0`. Height `22px`, font size `0.75rem`.

### Form Controls (Checkboxes & Radios)
- Box dimension `16px` by `16px`, radius `4px` (`rounded-sm`). Unchecked border `#CBD5E1`. Checked background `#4338CA` with white checkmark icon. Smooth transition of 150ms ease-out.