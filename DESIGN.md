# Sidekick — Landing Page Design Theme

A breakdown of the visual design system behind the Sidekick landing page.

## Theme

**Dark, monochromatic, developer-first.** The page draws direct inspiration from tools like **Vercel**, **Linear**, and **Raycast** — favouring restraint, negative space, and typographic hierarchy over saturated colour or ornamental graphics. The result is a minimal, premium feel that signals *engineering credibility*.

---

## Colour Palette

The palette is intentionally **achromatic** — nearly all zinc/gray shades with white opacity layers for depth. No saturated brand colour is used outside a single blue accent.

### Surfaces & Elevation

| Token | Value | Usage |
|---|---|---|
| Background | `#09090b` | Page canvas (zinc-950) |
| Surface | `#18181b` | Cards, terminal block, chat mock (zinc-900) |
| Elevation L1 | `white/5` | Badges, secondary button fills, skeleton UI, input areas, ambient glows |
| Elevation L2 | `white/10` | Hover states, avatar blocks, active borders |

### Text

| Token | Value | Usage |
|---|---|---|
| Primary | `#fafafa` | Headings, high-emphasis copy (zinc-50) |
| Secondary | `#a1a1aa` | Body text, descriptions, nav links (zinc-400) |
| Muted | `#52525b` | Labels, annotations (zinc-600) |

### Borders, Accent & CTA

| Token | Value | Usage |
|---|---|---|
| Borders | `white/5` – `white/10` | Subtle dividers and card outlines |
| Accent | `blue-500` | Pulsing status dot, faint section glows (used sparingly) |
| CTA Button | `#fafafa` bg / `#18181b` text | Inverted fill for maximum contrast on dark canvas |

---

## Typography

Two typefaces are loaded from Google Fonts:

| Role | Typeface | Where |
|---|---|---|
| UI / Body | [Inter](https://fonts.google.com/specimen/Inter) | All interface text — headings, body, navigation |
| Code / Terminal | [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) | Faux terminal block (`status.json` section) |

### Scale

| Level | Classes |
|---|---|
| Hero heading | `text-5xl md:text-7xl` · `font-bold` · `tracking-tight` |
| Section heading | `text-3xl md:text-4xl` · `font-bold` |
| Body | `text-lg md:text-xl` · `leading-relaxed` |
| Label | `text-xs` · `uppercase` · `tracking-widest` |

Font rendering is tuned with `antialiased`, `optimizeLegibility`, and `font-optical-sizing: auto`.

---

## Visual Effects

### Glassmorphism

The fixed navigation bar uses `backdrop-filter: blur(12px)` over a semi-transparent background (`rgba(9,9,11,0.7)`), creating a frosted-glass effect as page content scrolls beneath it.

### Radial Glows

Ambient light is simulated through large, blurred radial shapes placed behind key sections:

| Section | Glow |
|---|---|
| Hero | `radial-gradient` at `white/8` — soft spotlight behind headline |
| Project Status | `800×800` circle at `white/5` with `blur-3xl` |
| Architecture | Blue-tinted circle at `blue-500/5` with `blur-3xl` |
| CTA | Radial gradient via CSS custom properties for volumetric light |

### Gradient Text

The hero `<h1>` applies `bg-clip-text text-transparent` with a vertical gradient from `white` to `white/60`. This produces a subtle top-to-bottom text fade — a signature technique seen across Vercel and Linear.

### Fade Overlays

Both the chat preview mockup and the terminal block use a `linear-gradient` overlay that fades from transparent to the background colour (`#09090b`), letting content dissolve into the page edge.

---

## Animations & Micro-Interactions

| Element | Technique | Detail |
|---|---|---|
| Hero content | `fadeInUp` keyframe | 0.5 s ease-out · translateY 20 px + opacity |
| Status dot | `animate-pulse` | Pulsing blue indicator inside the hero badge |
| CTA arrow | `group-hover:translate-x-0.5` | Nudges right on hover |
| Nav links | `transition-colors` | Zinc-400 → white on hover |
| Tech strip | `grayscale → grayscale-0` | Strip desaturates at rest, reveals on hover |
| FAQ accordion | `gridTemplateRows: 0fr → 1fr` | CSS-grid expand/collapse with opacity fade |
| Suggestion items | SVG slide-in | Arrow translates from −8 px → 0 on hover |
| Meteor streak | `translateX` keyframe | Blue gradient bar sweeps left to right (2 s loop) |

---

## Page Structure

The page is a single React component (`LandingPage`) comprising eight sequential sections:

| # | Section | Purpose |
|---|---|---|
| 1 | **Nav** | Fixed glass navbar — logo, section links, auth CTAs |
| 2 | **Hero** | Headline, subtitle, badge, dual CTA buttons |
| 3 | **App Preview** | Wireframe mockup of the chat interface (sidebar + messages) with a bottom-fade overlay |
| 4 | **Tech Strip** | Horizontal display of stack names — React 19, Tailwind v4, LangGraph, PostgreSQL, Supabase |
| 5 | **Project Status** | macOS-style terminal window rendering a syntax-highlighted `status.json` |
| 6 | **Architecture** | Four-step horizontal pipeline — Client → Server → AI Agent → Database |
| 7 | **Developer Notes** | Accordion FAQ about the project's purpose and goals |
| 8 | **CTA + Footer** | Final call to action (GitHub / Demo) and footer with links |

Responsive behavior is handled via Tailwind breakpoints (`sm:`, `md:`):
- Nav links and sidebar mock hide on mobile
- CTA buttons stack vertically on small screens, sit side-by-side on wider viewports

---

## Design Influences

| Pattern | Inspired by |
|---|---|
| Near-black + white-only palette | Vercel, Linear |
| Gradient text on headings | Vercel, Stripe |
| Glassmorphic fixed navbar | Apple, Vercel |
| Faux terminal with syntax colour | Developer portfolio trend, Warp |
| Radial background glows | Linear, Raycast |
| Numbered step pipeline | SaaS "how it works" convention |
| Accordion developer notes | Technical docs / changelog pattern |
| Badge with pulse indicator | GitHub-style status badges |

---

## Design Token Reference

```
Background         #09090b           zinc-950
Surface            #18181b           zinc-900
Elevation L1       white/5           badges, fills, skeletons, glows
Elevation L2       white/10          hover states, avatar blocks, borders
Text Primary       #fafafa           zinc-50
Text Secondary     #a1a1aa           zinc-400
Text Muted         #52525b           zinc-600
Border             white/5–10        subtle dividers
CTA Fill           #fafafa           inverted button
Accent             blue-500          minimal — dot + glow
Font UI            Inter 
Font Mono          JetBrains Mono    
Border Radius      0.625rem          10px
Nav Blur           12px
```

---

## Summary

The Sidekick landing page embodies a **"developer dark mode"** aesthetic — monochromatic zinc palette, Inter + JetBrains Mono typography, glassmorphic navigation, gradient text, subtle radial glows, white-opacity elevation layers, and restrained micro-animations. It prioritises **technical credibility** over flashy marketing, presenting the project as a serious engineering reference rather than a consumer product. The design language draws clear inspiration from **Vercel** and **Linear**, adapted to an open-source developer portfolio context.
