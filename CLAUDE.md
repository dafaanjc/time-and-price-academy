# Risk Lab — Time & Price Academy

Astro 7 static site (MDX content, TypeScript strict), UI language Bahasa Indonesia.
Architecture: `docs/architecture.md`. Content model: `docs/content-model.md`.
Run `npm run validate` before calling any change done (source check, Vitest, astro check, build,
branding check, site check).

Hard rules that already exist in the codebase:
- Brand, product, author and tagline strings only via `siteConfig` (`src/config/site.ts`);
  `scripts/check-branding.mjs` fails the build otherwise.
- Internal links via `withBase()` / `routes` (`src/lib/url.ts`).
- Brand emblem at most once per page (home: Objek 00 on the hero stage, `figures/HeroStage`, black version;
  other pages: footer), never in the header, never redrawn, recoloured, stretched, bevelled/3D/metallic.
  The only allowed crop is the hero stage's **frame crop** (lower drapery and far-left shoulder); the head and
  the hourglass are always fully visible.
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
| `--plate`, `--plate-ink(-2/-3)`, `--plate-rule(-strong)`, `--plate-mark`, `--plate-sand`, `--plate-grid` | **The plate**: at most one dark field per page, only where the page *is* the exhibit — home: the hero stage; problem pages: the decision band. Concept, category, path, map and tool surfaces stay light. Dark in both themes so the black emblem can appear large without recolouring. The `.plate` class remaps ink/rule/mark/sand tokens inside it. Never for ordinary sections. |
| `--sand` | Hourglass sand (capital) outside the plate; `.plate` maps it to `--plate-sand`. The only brass *mass* on the site, always edged in `--mark`. |

Rules: monochrome first. Links are distinguished by underline, not colour. Every text/background
pair ≥ 4.5:1 in both themes (values are annotated in the stylesheet; recompute after any change).
Both light and dark themes are required (`prefers-color-scheme`).

### Typography
- **Serif** (`--font-serif`, Source Serif 4): headings and display. `h1` uses `--tracking-display`;
  exhibit titles may use `--text-5xl` with `--leading-display` on desktop only. The homepage hero title
  (`siteConfig.heroLine`) is sentence case, up to `--text-6xl` with `--leading-hero`, desktop only.
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
  is the **Risk Field** (three.js, procedural geometry; see "3D: Risk Field"), currently not mounted.
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
- **Capital hourglass sand:** moves only when the user acts (changes risk, takes another loss, resets),
  once per action, `--motion-slow`. Never idle, never a looping trickle.
- **Hero stage (the one scroll-linked interaction, R9.1):** while the page scrolls past the hero, the outcome
  field's horizon grows 1T → 2T and its spread widens ∝ √t (CSS `scale` on SVG groups driven by
  `--stage-spread`), the readout updates, and the emblem shifts by at most `--parallax-shift`.
  rAF-throttled, passive listener, only while the stage is intersecting; off under
  reduced motion (static 1T state, `--parallax-shift: 0`).
- **Hero stage depth & ambient trace (R9.2, requested by the owner; the only continuous motion on the site):**
  confined to `figures/HeroStage`, one rAF loop that runs only while the stage intersects (and the tab is visible),
  never under reduced motion (tokens collapse to 0 and the loop never starts; static R9.1 state).
  - *Pointer parallax* (mouse + fine pointer only): layers shift by `--parallax-pointer` × depth — grid 25 %,
    emblem 55 %, outcome field 100 % — and the field tilts at most `--tilt-max`. Eased (~140 ms), `transform` only.
    These and the scroll shift are the only parallax on the site.
  - *Trace cycle* (`traceAt`, `nextTraceIndex` in `lib/outcome-field.ts`, tested; period `--motion-ambient`):
    a hairline brass ring pulses once at "now" (sand leaving the hourglass) → one leaf path is walked at uniform
    speed along the time axis in `--plate-ink` → a landing mark joins T to the density curve at that outcome →
    fade; the next cycle takes another path. Opacity/geometry only: no blur, no glow filter, no brass tracer
    (the E[P] line stays the one brass trajectory). The emblem itself is only moved, never animated inside.
- **Risk Field camera:** a very slow drift (`--field-drift-period`, about ±3°) plus small pointer/scroll
  parallax, only inside the Risk Field figure and only while it is on screen. Never a rotation/spin.
  (The figure is not mounted anywhere since R9; the only continuous motion is the R9.2 hero stage cycle.)
- **R10 motion vocabulary** (tokens + classes in `global.css`; each word has one meaning):
  1. *Page entrance* — `.rule-measure`: the measuring rule under a page header draws once from the left
     (`PageHead`). Content pages use this, never `data-reveal` (which stays homepage-only).
  2. *Relationship* — `.row-link`: a brass tick slides in left of an editorial row on hover/focus (uses
     `::after`; `::before` is reserved for counters); knowledge-map edges linked to the focused node
     redraw (`edge-draw`, `pathLength="1"`).
  3. *Consequence* — `.value-changed`: a brass underline shrinks once under a result number that changed
     because the user acted (ToolFrame arms it on the first input/change/click; never on load).
  4. *State* — hover/focus/open transitions (`--motion-fast` / `--motion-base`).
- Otherwise no decorative entrance animations, parallax, looping motion or scroll-jacking (the R9.2 hero stage is
  the one exception, above).
- All durations collapse to 0 under `prefers-reduced-motion` (handled in the tokens).

### Content concept order (respect it in navigation, paths and visuals)
**Risk → Uncertainty → Probability → Distribution → Expected Value → Variance.**
Visuals should build along this chain (e.g. a band of outcomes → a probability → a curve → a
weighted mean marker → a ±σ spread), not present the ideas as unrelated cards. The chain lives in
`src/data/concept-chain.ts` (label, question, glyph); `LearningSystem` + `figures/ChainGlyph` draw it.

### Hero: stage (R9.1) + Capital Hourglass section
The hero establishes Time & Price Academy → Risk Lab, states the philosophy and poses the question; the
section directly below lets the visitor answer it.
- Hero left, on the wall: brand line (`masterBrand` mono over `product` serif), `siteConfig.heroLine`
  ("Trading bukan cuma soal entry."), the question in serif italic, a lead, two links (problems; `#jam-pasir`).
  No stats row, no controls.
- Hero right: `figures/HeroStage`, one `.plate` that bleeds to the right viewport edge on desktop (edge to
  edge on mobile). Layers in one fixed-aspect coordinate space (wide 1000×720, compact 600×760): faint dark
  grid → procedural **outcome field** (`src/lib/outcome-field.ts`, tested: from "now" at the figure's
  hourglass, 4 → 12 → 24 branching paths, ±2σ envelope ∝ √t, flat brass E[P] — no drift implied — and a
  density curve at T; compact adds one past path) → the emblem at monumental scale (frame crop only).
  Caption: FIG. 00 (what the field means) + OBJEK 00. It is an artefact, not a widget: no inputs.
- Section `00 Anggaran salah` (directly under the hero): **Instrumen 00** (`figures/CapitalHourglass`) on a
  light surface panel, theme-neutral tokens. Sand = capital; each wrong decision drops a fixed % of *current* capital
  (same maths as `losingStreak(…, 'fixed')`); the neck opening = risk per trade; the scale is calibrated
  by bulb area, not height; the one brass pointer marks remaining capital; a dashed guide shows the same
  number of losses at 1%. Controls: risk 1 / 2 / 5 / 10 %, "Salah sekali lagi", "Ulang dari nol".
  Default state 5 % × 10 losses = 59,9 % (matches the loss-streak table in the problem content).
- It is a **loss budget** only: never show gains, P&L colours, prices or anything that reads as a signal.
- Code: `src/lib/hourglass.ts` (geometry, levels, text equivalent; tested in `tests/hourglass.test.ts`).
  Server-rendered complete state + `<desc>` text; the controls appear only with JS; `aria-live` announces
  each change.

### 3D: Risk Field (not mounted since R9)
Retired from the homepage hero in R9 for performance and focus (no three.js on any page now). Code and
tests are kept; the candidate place to revisit is the **Distribusi → Varians** part of the concept chain.
The rules below apply if it is mounted again.
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
(`axes`, `band`, `oscillation`, `kink`, `tree`) drawn by `components/figures/CategoryMotif.astro`, and a
`marker` shape (`circle`, `square`, `diamond`, `triangle`, `cross`; unique per category, tested) used on the
knowledge map.
Optional `topics` = sub-categories (concept frontmatter `topic`, validated per category; the category page
groups by topic). Learning paths are tiered via `requires` in `src/data/learning-paths.ts`
(Fondasi → Heuristik dan Bias → Keputusan di Bawah Risiko); curriculum map in `docs/content-model.md`.
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
- **Homepage redesign with 3D (done, hero superseded by R9):** `HomeHero` + `figures/RiskField` (three.js, fallback
  `TimePriceFigure`), `HomePhilosophy` (statement + emblem + principles), `HomeProblems`,
  `LearningSystem` + `figures/ChainGlyph`, instrument variant of `UkuranPosisi`/`ToolFrame` (with risk
  gauge), `CategoryIndex`. Replaced `RiskLabTransition`, `CategoryGrid`, `LearningPathStrip`.
- **R9 "Jam Pasir Modal" — hero (done):** plate tokens + `.plate`, `HomeHero` rebuilt around
  `figures/CapitalHourglass` + emblem (`BrandEmblem variant="plate"`), emblem removed from
  `HomePhilosophy`, `siteConfig.heroLine`, Risk Field unmounted.
- **R10 — visual language propagation (done):** shared patterns, not a copied hero.
  - `PageHead` (index line · serif title · lead · drawing measuring rule · optional figure) on category
    (with `CategoryMotif`), learning path and map.
  - Problem pages: full-width dark **decision band** (trader quote very large, decision at stake, numbered
    concept links); body cols 1–7; contents then sticky `LossBudget` in cols 9–12.
  - Concept pages stay light and quiet: `PathPosition` rail (step n / N in its learning path) under the header.
  - Lists are editorial rows, not cards: `ConceptLinkList` (numbered), `ConceptRows`, learning-path
    **route** (vertical measuring rail, big mono step numbers, sticky path intro on desktop).
  - Tools: `ToolFrame` shows the anatomy **01 Input → 02 Asumsi → 03 Hasil → 04 Konsekuensi** (the limits
    note is the Asumsi stage) — clearly "interactive tool" vs. learning content.
  - Knowledge map: plot-field grid inside the frame, edge redraw on focus; narrow screens open centred on
    the root node.
- **R9.1 — hero refinement (done):** `figures/HeroStage` (+ `lib/outcome-field.ts`) replaces the hero
  plate; the hourglass moves to section `00 Anggaran salah`; emblem frame-crop rule; scroll-linked stage.
  Hotfix: the hero component is now `HomeLanding.astro` (classes `landing__*`). Astro derives the scoped-CSS
  id from the file path, so stale `HomeHero` CSS from `main` (e.g. a dev server not restarted after switching
  branches) matched the new markup and collapsed the stage into one grid column. `HeroStage` picks its wide
  or compact composition with a container query on its own width (`@container stage (min-width: 34rem)`),
  never the viewport, so a narrow stage can't produce overlapping caption text.
- **R9.2 — hero stage motion & depth (done):** pointer parallax per layer + field tilt, ambient trace cycle
  (pulse at "now" → one path walked → landing on the density curve), grid moved to `.stage__field::before`
  so it can shift without exposing edges. Layout boxes unchanged (verified against R9.1 at 1440 and 390 px).
- **R9 follow-ups (done):**
  - Problem pages on the editorial grid: header + body in columns 1–7; "Di halaman ini" and a sticky
    `LossBudget` ("Anggaran salah": remaining capital after 10 losses at 1/2/5/10 %, links to `#jam-pasir`)
    in columns 9–12.
  - One calculator style: `ToolFrame` is always the instrument style; `variant` only sets placement.
  - DRAF notice = one line between hairlines (`PlaceholderNotice`); the draft badge is outlined, not filled.
  - Knowledge map fits the desktop frame (compact nodes, skip-lanes on the nearer side) and codes
    categories by **marker shape** (`marker` in `categories.ts`, `markerPath()` in `lib/graph.ts`) + legend.
  - `figures/HourglassGlyph`: the small hourglass motif for "budget" (reading time, loss budget). It is a
    technical mark, never a stand-in for the emblem; use it only where time or capital is being spent.
  - `.keep-case` keeps characters whose meaning changes in capitals (σ → Σ) inside uppercase labels.
- **Next phases:** only after the user explicitly says `PROCEED`.
