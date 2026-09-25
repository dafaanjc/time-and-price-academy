# Risk Lab — Time & Price Academy

Astro 7 static site (MDX content, TypeScript strict), UI language Bahasa Indonesia.
Architecture: `docs/architecture.md`. Content model: `docs/content-model.md`.
Run `npm run validate` before calling any change done (source check, Vitest, astro check, build,
branding check, site check).

Hard rules that already exist in the codebase:
- Brand, product, author and tagline strings only via `siteConfig` (`src/config/site.ts`);
  `scripts/check-branding.mjs` fails the build otherwise.
- Internal links via `withBase()` / `routes` (`src/lib/url.ts`).
- Brand emblem at most once per page (home: exhibit object in `HomePhilosophy`; other pages: footer),
  never in the header, never recoloured.
- Do not edit content MDX (`src/content/**`) as part of design work.

## Visual Design System

**Direction: "Modern Digital Museum."** A calm gallery for ideas about time and price. Each page
reads like a curated exhibit: plenty of wall, one object at a time, precise captions. The
illustration language comes from measurement instruments and technical drawing, not from trading
terminals.

The site should feel **editorial, premium, analytical, distinctive, calm, technical, modern**.
Someone landing on the homepage should read it immediately as *Time & Price Academy*.

### It must NOT look like
- a TradingView clone (no dark candlestick canvases, toolbars, ticker tapes or indicator panes)
- a default Astro template, or a generic AI-generated SaaS page (no gradient hero, icon-card grids,
  pill badges or testimonial carousels)
- a crypto landing page or a trading-signal site
- **Banned outright:** neon blue, aggressive red/green trading colours, heavy gradients,
  glassmorphism (backdrop blur, frosted panels), glow, drop-shadow elevation stacks.

### Source of truth
All visual values live as custom properties in **`src/styles/global.css`** (`:root` + dark-mode
block). Components consume tokens and never hard-code colour, font, size, stroke or duration.
Legacy token names (`--paper`, `--ink*`, `--rule`, `--tint`, `--accent*`, `--space-*`, `--text-*`)
are kept on purpose: retune values there instead of renaming.

### Colour
| Token | Role |
|---|---|
| `--paper` | Gallery wall (page background) |
| `--surface` | Raised plane: tools, cards, plot fields |
| `--ink` / `--ink-2` / `--ink-3` | Graphite text: primary / secondary / labels & meta |
| `--rule` / `--rule-strong` | Decorative hairline / frame & axis lines that carry information (≥ 3:1) |
| `--tint` | Soft fill: inline code, active item |
| `--mark` / `--mark-soft` | **The only expressive colour**: instrument brass (echoes the hourglass). For pointers, major ticks, index numbers, selection. Never large fills. |
| `--loss` / `--gain` / `--caution(-bg)` | Muted data semantics, only inside examples and calculations. Never decoration. |

Rules: monochrome first. Links are distinguished by underline, not colour. Every text/background
pair ≥ 4.5:1 in both themes (values are annotated in the stylesheet; recompute after any change).
Both light and dark themes are required (`prefers-color-scheme`).

### Typography
- **Serif** (`--font-serif`, Source Serif 4): headings and display. `h1` uses `--tracking-display`;
  exhibit titles may use `--text-5xl` with `--leading-display` on desktop only.
- **Sans** (`--font-sans`, Source Sans 3): body and UI. Highly readable: `--text-base` (17px),
  `--leading-body` 1.6, line length `--measure` (66ch), leads `--measure-narrow`.
- **Mono** (`--font-label`): metadata and labels, always **small, uppercase, tracked**. Use the
  `.label` class (`.eyebrow` shares it), `.label__index` for a brass index number, `.label__sep`
  for the `·` separator. Examples:
  `FOUNDATIONS` · `01 / 06` · `8 MIN READ` · `BEHAVIORAL FINANCE`
  (rendered in Indonesian in the UI, e.g. `FONDASI · 01 / 06 · 8 MNT BACA`).
- Numbers are `tabular-nums` site-wide.
- Fonts are self-hosted (OFL). The mono stack is system-only (`ui-monospace`, Cascadia, SF Mono,
  Consolas); do not add a webfont without self-hosting it under `src/assets/fonts/`.

### Chart-like geometry (the illustration language)
The recurring motif is a **coordinate system**: horizontal **time** axis, vertical **price/value**
axis, graph traces, tick marks, dashed guides, measurement annotations.
- Page background is a very faint coordinate grid (`--grid-line`, `--grid-line-major` every 4 cells
  of `--grid-cell` = 24px). It must stay barely perceptible, never compete with text.
- `.plot-field` = an explicit coordinate plane (surface + grid + hairline frame) for figures.
- `hr` is a measuring rule (hairline with ticks every grid cell).
- Stroke tokens: `--stroke-hair`, `--stroke-axis`, `--stroke-trace`, `--stroke-trace-bold`,
  `--tick-minor`, `--tick-major`, `--dash-guide`, `--dash-trace`.
- Inline SVG uses the classes `.svg-grid`, `.svg-axis`, `.svg-tick`, `.svg-guide`, `.svg-trace`,
  `.svg-trace--alt`, `.svg-mark`, `.svg-label`, so drawings follow the theme with no colours in markup.

### Illustrations
- They should read as **technical drawings**: hairline strokes, labelled axes, annotation leaders,
  one brass pointer at most. No fills beyond `--surface` / `--mark-soft`.
- **Inline or local SVG only.** No stock illustrations, no image assets from external websites,
  no icon fonts, no raster art (except the official emblem in `src/assets/Logo/`). The single exception
  is the homepage **Risk Field** (three.js, procedural geometry; see "3D: Risk Field").
- Every figure has a text equivalent (`<title>`/`aria-label` or an adjacent caption).
- Not trading charts: no candlesticks, no volume bars, no indicator overlays unless a concept is
  literally about them.

### Layout: strong editorial grid
- `.editorial-grid`: 1 column on mobile; 12 columns (`--grid-columns`, `--grid-gap`) from 64rem.
  `.col-text` = columns 1–7, `.col-aside` = columns 9–12 (asymmetric, one empty column between),
  `.col-wide` = columns 1–10.
- Desktop: wide outer margins (`--gutter` grows to 48px at ≥ 80rem), controlled reading width
  (`--measure`), large whitespace between sections (`--space-24` / `--space-32`), asymmetric
  balance where it helps (text left, figure/notes right).
- Mobile: single column, 16px gutter, no horizontal page scroll, figures scale to width, labels
  wrap rather than truncate.
- Square corners (`--radius-0/1`); separation by hairlines and space, not shadows.

### Motion: restrained
- Only state changes (hover, focus, open/close) with `--motion-fast` / `--motion-base`, and at most
  one "draw the trace once" reveal per figure with `--motion-slow`.
- **Scroll reveal (the one sanctioned entrance):** add `data-reveal` to a `<section>` and it fades in
  with an 8px rise (`--motion-reveal`, `--reveal-shift`) once, when it enters the viewport. Wiring: inline
  script in `BaseLayout` sets `.js-reveal` on `<html>` + IntersectionObserver; styles in `global.css`.
  Progressive enhancement: without JS or with reduced motion, content is simply visible. Never put it on
  the hero or anything above the fold, never stagger children, never re-animate on scroll back.
- **Risk Field camera (the one sanctioned continuous motion):** a very slow drift
  (`--field-drift-period`, about ±3°) plus small pointer/scroll parallax, only in the hero figure and only
  while it is on screen. Never a rotation/spin, never anywhere else.
- Otherwise no decorative entrance animations, parallax, looping motion or scroll-jacking.
- All durations collapse to 0 under `prefers-reduced-motion` (handled in the tokens).

### Content concept order (respect it in navigation, paths and visuals)
**Risk → Uncertainty → Probability → Distribution → Expected Value → Variance.**
Visuals should build along this chain (e.g. a band of outcomes → a probability → a curve → a
weighted mean marker → a ±σ spread), not present the ideas as unrelated cards. The chain lives in
`src/data/concept-chain.ts` (label, question, glyph); `LearningSystem` + `figures/ChainGlyph` draw it.

### 3D: Risk Field (homepage hero only)
FIG. 01 is a **wireframe probability terrain**: the time × price plane is the floor, density is height.
The past is one dark path on the floor ending at "now"; the future is a ridge that widens and flattens
(σ ∝ √t), with branching paths draped on it, three upright probability curves (the one at horizon T
filled with `--field-fill`), and **one** brass trajectory: the expected-value path along the ridge
with an `E[P]` marker. Transparent canvas over the warm gallery wall, thin graphite lines, depth through
per-vertex opacity. No lights, shadows, glow, bloom, neon or spinning.
- Code: `src/lib/risk-field/geometry.ts` (pure maths in `[t, p, d]`, tested), `quality.ts` (tier
  choice, tested), `scene.ts` (three.js; the only module that imports `three`), and
  `components/figures/RiskField.astro` (markup, fallback, boot script). Axis labels are HTML projected
  from 3D points, never WebGL text.
- Colours only from `--field-*` tokens (aliases of the palette), read at runtime with
  `getComputedStyle`, so both themes work; re-read on `prefers-color-scheme` change.
- **Progressive quality** (`pickQuality`): `high` = full detail, 60 fps, drift + pointer + scroll
  parallax; `medium` (touch, < 768px, ≤ 4 cores or ≤ 4 GB) = sparser mesh, 30 fps, half drift, no pointer;
  `low` (no WebGL, `prefers-reduced-motion`, Save-Data, very weak device) = the technical SVG
  (`TimePriceFigure bare`), and three.js is never downloaded. Context loss, or switching to reduced
  motion at runtime, falls back to `low`.
- **Performance:** the SVG is the server-rendered content (no layout shift, works without JS).
  `three` is loaded via dynamic `import()` only when the stage is near the viewport and the browser is
  idle. Rendering pauses when the stage is off screen or the tab is hidden, and stops once motion settles.
  Geometry is procedural and small; never download models, textures or HDRs.
- Keep the one-brass-pointer rule, time → right, and the concept reading (past path → spread → curve →
  E[P]) consistent with the SVG fallback.

### Reusable category treatment
Single source of truth: `src/data/categories.ts` (`foundations`, `risk-management`, `psychology`,
`behavioral-finance`, `decision-theory`). Array order = display order = index number, rendered by
`categoryIndexLabel()` as `01 / 05` (the total follows the array length). Each entry has a `motif`
(`axes`, `band`, `oscillation`, `kink`, `tree`) drawn by `components/figures/CategoryMotif.astro`.
Containers carry `data-category="<id>"` (hook for `--category-accent` and any per-category tweak in
`global.css`). To add a category: one entry in `categories.ts` (plus a new motif value and its branch
in `CategoryMotif` if none of the existing ones fits). `CategoryIndex` (the editorial list on the homepage) picks it up automatically.
Labels are rendered in markup, never via CSS `content`, so they stay accessible.

### Planned components (architecture only, built in later phases)
- **Related-concept graph**: prerequisite/related links drawn as a small coordinate-style diagram
  (nodes on a grid, hairline edges, brass marker on the current concept). Reuses `src/lib/graph.ts`.
- **Source cards**: citation plates like museum object labels: mono metadata line (TYPE · YEAR ·
  DOI), serif title, hairline frame. Extends the existing `SourceCard.astro`.

### Phases
- **Phase 1 (done):** tokens in `global.css` + this section. No component redesign.
- **Phase 2 (done):** homepage: `HomeHero` + `figures/TimePriceFigure` (FIG. 01, isometric
  Time × Price; geometry in `src/lib/iso.ts`, tested), `RiskLabTransition` (emblem as exhibit object +
  concept chain on a time axis, `src/data/concept-chain.ts`), `CategoryGrid` + `figures/CategoryMotif`.
- **Homepage redesign with 3D (done):** `HomeHero` + `figures/RiskField` (three.js, fallback
  `TimePriceFigure`), `HomePhilosophy` (statement + emblem + principles), `HomeProblems`,
  `LearningSystem` + `figures/ChainGlyph`, instrument variant of `UkuranPosisi`/`ToolFrame` (with risk
  gauge), `CategoryIndex`. Replaced `RiskLabTransition`, `CategoryGrid`, `LearningPathStrip`.
- **Next phases:** only after the user explicitly says `PROCEED`.
