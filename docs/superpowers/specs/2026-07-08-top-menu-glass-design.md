# Top nav + GlassSurface — design spec

Date: 2026-07-08
Branch: `feature/top-menu-glass`

## Goal

Replace the desktop left `Sidebar` with a floating top nav, matching the
visual language already used by the mobile `Header`/`TabBar`. Port the
React Bits `GlassSurface` component (SVG displacement-map glass effect) and
use it as the background layer for the top nav on both desktop and mobile.
Keep the mobile bottom `TabBar` exactly as it is today.

This is a visual/navigation change only — no server, API, or data changes.

## Current state (as of this branch point)

- `src/components/layout/AppShell.tsx` renders `<Sidebar />` (desktop,
  fixed-left) + `<Header />` (mobile, floating top pill) + `<TabBar />`
  (mobile, floating bottom pill), and a `<main className="lg:ml-56">` with
  an in-flow sticky title bar (`hidden lg:flex`, lines 29-37) showing the
  page `title` and optional "← Volver" link.
- `src/components/layout/Sidebar.tsx`: fixed left column, w-56, `.glass-nav`
  background, nav links (Fixture/Tabla/Reglas/Mi Perfil/+Admin), and a
  bottom block with `NotificationBell variant="sidebar"`, theme toggle row,
  and user avatar/name/email (no logout button here — logout only exists on
  `/perfil`).
- `src/components/layout/Header.tsx`: mobile-only floating pill
  (`fixed top-3 left-3 right-3, rounded-3xl, .glass-nav`), shows
  back-link-or-logo, centered title, theme toggle + `NotificationBell
  variant="header"`.
- `src/components/layout/TabBar.tsx`: mobile-only floating bottom pill,
  `.glass-nav`, same 4(+1) nav links as Sidebar. **Not touched by this
  change.**
- `src/app/globals.css`: hand-rolled glass system — `--glass-bg`,
  `--glass-border`, `--glass-ring`, `--glass-shadow` custom properties
  defined for `:root` and `.dark` (class-based dark mode via
  `next-themes`), and a `.glass-nav` class combining them with
  `backdrop-filter: blur(28px) saturate(200%)`.
- No `components/ui` primitives directory, no shadcn/Radix. Only shared
  helper is `cn()` in `@/lib/utils`.
- `NotificationBell` (`src/components/notifications/NotificationBell.tsx`)
  supports `variant="header"` (icon-only, dropdown panel `absolute right-0`)
  and `variant="sidebar"` (full row, dropdown panel `absolute left-full`).
  The `"sidebar"` variant becomes unused once `Sidebar.tsx` is deleted.

## Why GlassSurface can't simply wrap the nav content

`GlassSurface`'s `.glass-surface__content` is `overflow: hidden` with a
centered flex layout. `NotificationBell` and the new avatar dropdown render
their panels as `absolute` children positioned outside their trigger
button's box. If nav content lived *inside* `GlassSurface`, those dropdown
panels would be clipped by `overflow: hidden` and the flex centering would
fight the nav's own layout (logo left / links / actions right).

**Resolution:** `GlassSurface` is used as a background layer only, not a
wrapper. Each nav container (`TopNav`, `Header`) becomes:

```
<div class="fixed ... rounded-3xl overflow-visible">
  <GlassSurface className="absolute inset-0 -z-10" width="100%" height="100%" borderRadius={24} />
  <div class="relative z-10 flex items-center h-full px-4">
    {/* actual nav content, dropdowns render fine here */}
  </div>
</div>
```

This keeps `backdrop-filter` blurring whatever scrolls behind the nav while
letting dropdown panels escape unclipped.

## Changes

### 1. `src/components/ui/GlassSurface.tsx` + `GlassSurface.css` (new)

Port of the supplied React Bits component to TypeScript:

- Typed props matching the table in the reference source (all optional with
  the same defaults).
- CSS changes from the reference source:
  - Replace `light-dark(A, B)` and `@media (prefers-color-scheme: dark)`
    rules with `.dark &` overrides, consistent with this project's
    class-based dark mode.
  - Base `--glass-frost`/background values pull from the existing
    `--glass-bg` / `--glass-border` / `--glass-shadow` custom properties
    (from `globals.css`) instead of hardcoded rgba, so the new glass nav
    reads as the same material as the untouched `TabBar`.
  - `.glass-surface__content` padding/justify-content are left as
    plain defaults (`0`, no forced `center`) since in this project
    `GlassSurface` is only ever used as an absolutely-positioned
    background layer, never as the content wrapper itself — callers don't
    depend on its internal centering.
- No new npm dependencies; component is self-contained (SVG filter +
  `ResizeObserver`).
- Fallback path (`glass-surface--fallback`, plain `backdrop-filter: blur()`)
  is kept as-is for Safari/Firefox — those browsers get a slightly simpler
  blur instead of the liquid distortion, no functional breakage.

### 2. `src/components/layout/TopNav.tsx` (new)

Replaces `Sidebar.tsx` and absorbs the desktop title bar that currently
lives inline in `AppShell.tsx`.

- `fixed top-3 left-3 right-3 z-40 h-16 hidden lg:flex rounded-3xl`
  container (same floating-pill language as mobile `Header`), with a
  `GlassSurface` absolute background layer as described above.
- Content, left to right: logo (theme-aware, same swap logic as current
  Sidebar/Header) → nav links (Fixture, Tabla, Reglas, Mi Perfil, + Admin
  if `session.user.role === "admin"`) rendered horizontally with icon +
  label, active state reusing the existing `bg-primary-600/10
  text-primary-700 dark:bg-primary-400/12 dark:text-primary-300` treatment
  → spacer (`ml-auto`) → `NotificationBell variant="header"` → `ThemeToggle`
  → new avatar button.
- Avatar button: circular initial avatar (same style as current Sidebar's),
  click toggles a dropdown panel (`absolute right-0 mt-2`, same visual
  treatment as `NotificationBell`'s panel — white/gray-900 card,
  rounded-2xl, shadow) showing name, email, a "Mi Perfil" link, and a
  "Cerrar sesión" button calling `signOut({ callbackUrl: "/login" })`
  (mirrors `src/app/perfil/page.tsx:256`). Click-outside-to-close via the
  same `useRef` + `mousedown` listener pattern `NotificationBell` already
  uses.
- Does **not** receive `title`/`showBack`/`backHref` — those move to
  `AppShell`'s content area (see below).

### 3. `src/components/layout/AppShell.tsx` (edit)

- Remove `<Sidebar />` import/usage and the inline sticky title bar
  (current lines 29-37).
- Add `<TopNav />` (no props needed — it no longer shows per-page title).
- `<main>`: `lg:ml-56` → `lg:pt-24` (clears the floating pill: `top-3` +
  `h-16` + breathing room).
- Inside the `page-enter` content div, add a `hidden lg:flex` header block
  at the top (before `{children}`) reproducing the old sticky bar's
  content: optional "← Volver" link (only if `showBack && backHref`) plus
  `<h1>{title}</h1>`. Mobile is unaffected — `Header.tsx` already shows the
  title in its pill.

### 4. `src/components/layout/Header.tsx` (edit)

- Structural/prop changes: none.
- Background: replace the `glass-nav` class on the `<header>` with the same
  two-layer pattern (`GlassSurface` absolute background + relative content
  layer), same `rounded-3xl` radius (24) so it looks visually identical to
  today, just rendered through the new engine.

### 5. `src/components/layout/Sidebar.tsx` — delete

No longer referenced anywhere after `AppShell.tsx` is updated.

### 6. `src/components/notifications/NotificationBell.tsx` (edit)

Remove the now-unused `"sidebar"` variant branch and the `variant` prop's
`"sidebar"` option, since only `"header"` is used anywhere after `Sidebar`
is deleted. Keep `"header"` behavior unchanged.

### 7. `src/components/layout/TabBar.tsx`

No changes.

## Out of scope

- No changes to Neon/DB, API routes, or server components.
- No changes to `/perfil`'s existing logout button.
- No new UI library (shadcn/Radix) — dropdown stays a hand-rolled
  click-outside pattern consistent with `NotificationBell`.
- No changes to the `xs`/`lg` Tailwind breakpoints.

## Testing / verification plan

- `npm run build` (or dev server) to catch TS/type errors from the new
  component and prop changes.
- Manual verification via preview tools at desktop (≥1024px) and mobile
  (375px) widths, light and dark mode:
  - Top nav renders, links navigate and show active state.
  - Avatar dropdown opens, shows name/email, closes on outside click,
    "Cerrar sesión" works.
  - Notification bell dropdown still opens/positions correctly next to the
    new nav layout.
  - Mobile Header pill and TabBar look visually unchanged (Header now glass
    via GlassSurface, TabBar untouched).
  - Page title/back-link show correctly on desktop inside the content area;
    mobile title still shows in the Header pill.
  - No console errors from `GlassSurface`'s `ResizeObserver`/SVG filter
    setup.

## Branch / delivery

Work happens on `feature/top-menu-glass`. Push and open a GitHub PR when
ready so the Vercel preview can be reviewed before merging to `main`.
