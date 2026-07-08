# Top nav + GlassSurface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the desktop left `Sidebar` with a floating top nav that reuses the mobile pill visual language, port the React Bits `GlassSurface` component as the background for the top nav (desktop) and mobile `Header`, and fuse the old per-page title bar into the page content — all on branch `feature/top-menu-glass`, verified via PR preview before merging to `main`.

**Architecture:** `GlassSurface` (new, `src/components/ui/`) is a pure background layer — an absolutely-positioned SVG-displacement element behind a `relative z-10` content layer, never a wrapper around interactive content, so dropdown panels (`NotificationBell`, the new avatar menu) never get clipped by its `overflow: hidden`. `TopNav.tsx` (new) replaces `Sidebar.tsx` and also absorbs the title bar that used to live inline in `AppShell.tsx`. `Header.tsx` (mobile) keeps its structure, only its background engine changes. `TabBar.tsx` is untouched.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS (`darkMode: "class"` via `next-themes`), `next-auth`, `lucide-react`. No new npm dependencies.

## Global Constraints

- No server/API/DB changes — this is a client-side visual/navigation change only.
- No new npm dependencies (no shadcn/Radix) — dropdowns use the hand-rolled click-outside pattern already established in `NotificationBell.tsx`.
- Dark mode must use class-based overrides (`.dark &`), never `light-dark()` or `prefers-color-scheme` media queries — this project switches themes via `next-themes` class toggling, independent of OS setting.
- Keep the existing `lg` (1024px) breakpoint as the desktop/mobile cut.
- This repo's only test suite (`npm run test` → Vitest, `environment: "node"`) covers pure logic (`tests/scoring.test.ts`); there is no jsdom/`@testing-library/react` setup. These are presentational component changes with no new pure logic, so "test" steps in this plan mean: `npm run build` (TypeScript compiles, Next.js build succeeds) plus manual verification through the preview tools (desktop ≥1024px and mobile 375px, light and dark mode). Do not introduce a component-testing framework as part of this plan — out of scope per the spec.
- Spec reference: `docs/superpowers/specs/2026-07-08-top-menu-glass-design.md`.

---

### Task 1: Port `GlassSurface` component

**Files:**
- Create: `src/components/ui/GlassSurface.tsx`
- Create: `src/components/ui/GlassSurface.css`

**Interfaces:**
- Produces: `GlassSurface` — default export from `src/components/ui/GlassSurface.tsx`, props:
  ```ts
  export interface GlassSurfaceProps {
    children?: React.ReactNode;
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    borderWidth?: number;
    brightness?: number;
    opacity?: number;
    blur?: number;
    displace?: number;
    backgroundOpacity?: number;
    saturation?: number;
    distortionScale?: number;
    redOffset?: number;
    greenOffset?: number;
    blueOffset?: number;
    xChannel?: "R" | "G" | "B";
    yChannel?: "R" | "G" | "B";
    mixBlendMode?:
      | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten"
      | "color-dodge" | "color-burn" | "hard-light" | "soft-light"
      | "difference" | "exclusion" | "hue" | "saturation" | "color" | "luminosity";
    className?: string;
    style?: React.CSSProperties;
  }
  ```
  Later tasks use it as `<GlassSurface className="absolute inset-0" width="100%" height="100%" borderRadius={24} />` — no `children` passed, it's a background-only layer.

- [ ] **Step 1: Create `src/components/ui/GlassSurface.tsx`**

```tsx
"use client";

import { useEffect, useState, useRef, useId } from "react";
import "./GlassSurface.css";

export type GlassBlendMode =
  | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten"
  | "color-dodge" | "color-burn" | "hard-light" | "soft-light"
  | "difference" | "exclusion" | "hue" | "saturation" | "color" | "luminosity";

export interface GlassSurfaceProps {
  children?: React.ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  borderWidth?: number;
  brightness?: number;
  opacity?: number;
  blur?: number;
  displace?: number;
  backgroundOpacity?: number;
  saturation?: number;
  distortionScale?: number;
  redOffset?: number;
  greenOffset?: number;
  blueOffset?: number;
  xChannel?: "R" | "G" | "B";
  yChannel?: "R" | "G" | "B";
  mixBlendMode?: GlassBlendMode;
  className?: string;
  style?: React.CSSProperties;
}

type GlassCSSProperties = React.CSSProperties & {
  "--glass-frost"?: number;
  "--glass-saturation"?: number;
  "--filter-id"?: string;
};

export default function GlassSurface({
  children,
  width = 200,
  height = 80,
  borderRadius = 20,
  borderWidth = 0.07,
  brightness = 50,
  opacity = 0.93,
  blur = 11,
  displace = 0,
  backgroundOpacity = 0,
  saturation = 1,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  xChannel = "R",
  yChannel = "G",
  mixBlendMode = "difference",
  className = "",
  style = {},
}: GlassSurfaceProps) {
  const uniqueId = useId().replace(/:/g, "-");
  const filterId = `glass-filter-${uniqueId}`;
  const redGradId = `red-grad-${uniqueId}`;
  const blueGradId = `blue-grad-${uniqueId}`;
  const [svgSupported, setSvgSupported] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);
  const redChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const greenChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const blueChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const gaussianBlurRef = useRef<SVGFEGaussianBlurElement>(null);

  const generateDisplacementMap = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    const actualWidth = rect?.width || 400;
    const actualHeight = rect?.height || 200;
    const edgeSize = Math.min(actualWidth, actualHeight) * (borderWidth * 0.5);

    const svgContent = `
      <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${redGradId})" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${mixBlendMode}" />
        <rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${actualHeight - edgeSize * 2}" rx="${borderRadius}" fill="hsl(0 0% ${brightness}% / ${opacity})" style="filter:blur(${blur}px)" />
      </svg>
    `;
    return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
  };

  const updateDisplacementMap = () => {
    feImageRef.current?.setAttribute("href", generateDisplacementMap());
  };

  useEffect(() => {
    updateDisplacementMap();
    [
      { ref: redChannelRef, offset: redOffset },
      { ref: greenChannelRef, offset: greenOffset },
      { ref: blueChannelRef, offset: blueOffset },
    ].forEach(({ ref, offset }) => {
      if (ref.current) {
        ref.current.setAttribute("scale", (distortionScale + offset).toString());
        ref.current.setAttribute("xChannelSelector", xChannel);
        ref.current.setAttribute("yChannelSelector", yChannel);
      }
    });
    gaussianBlurRef.current?.setAttribute("stdDeviation", displace.toString());
  }, [
    width, height, borderRadius, borderWidth, brightness, opacity, blur,
    displace, distortionScale, redOffset, greenOffset, blueOffset,
    xChannel, yChannel, mixBlendMode,
  ]);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(updateDisplacementMap, 0);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    setTimeout(updateDisplacementMap, 0);
  }, [width, height]);

  useEffect(() => {
    setSvgSupported(supportsSVGFilters());
  }, []);

  const supportsSVGFilters = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return false;
    const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    if (isWebkit || isFirefox) return false;
    const div = document.createElement("div");
    div.style.backdropFilter = `url(#${filterId})`;
    return div.style.backdropFilter !== "";
  };

  const containerStyle: GlassCSSProperties = {
    ...style,
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius: `${borderRadius}px`,
    "--glass-frost": backgroundOpacity,
    "--glass-saturation": saturation,
    "--filter-id": `url(#${filterId})`,
  };

  return (
    <div
      ref={containerRef}
      className={`glass-surface ${svgSupported ? "glass-surface--svg" : "glass-surface--fallback"} ${className}`}
      style={containerStyle}
    >
      <svg className="glass-surface__filter" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
            <feImage ref={feImageRef} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />
            <feDisplacementMap ref={redChannelRef} in="SourceGraphic" in2="map" result="dispRed" />
            <feColorMatrix
              in="dispRed"
              type="matrix"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="red"
            />
            <feDisplacementMap ref={greenChannelRef} in="SourceGraphic" in2="map" result="dispGreen" />
            <feColorMatrix
              in="dispGreen"
              type="matrix"
              values="0 0 0 0 0
                      0 1 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="green"
            />
            <feDisplacementMap ref={blueChannelRef} in="SourceGraphic" in2="map" result="dispBlue" />
            <feColorMatrix
              in="dispBlue"
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
              result="blue"
            />
            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" result="output" />
            <feGaussianBlur ref={gaussianBlurRef} in="output" stdDeviation="0.7" />
          </filter>
        </defs>
      </svg>
      <div className="glass-surface__content">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/ui/GlassSurface.css`**

```css
.glass-surface {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: opacity 0.26s ease-out;
}

.glass-surface__filter {
  width: 100%;
  height: 100%;
  pointer-events: none;
  position: absolute;
  inset: 0;
  opacity: 0;
  z-index: -1;
}

.glass-surface__content {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
  border-radius: inherit;
}

/* Uses this project's existing --glass-bg / --glass-border / --glass-shadow
   custom properties (defined in src/app/globals.css for :root and .dark)
   so GlassSurface reads as the same material as the untouched .glass-nav
   elements (TabBar). Class-based dark mode only — no light-dark()/media
   queries, this project toggles themes via next-themes' .dark class. */
.glass-surface--svg {
  background: var(--glass-bg);
  backdrop-filter: var(--filter-id, url(#glass-filter)) saturate(var(--glass-saturation, 1));
  box-shadow:
    0 0 2px 1px rgba(0, 0, 0, 0.06) inset,
    0 0 10px 4px rgba(0, 0, 0, 0.04) inset,
    var(--glass-shadow);
}

.dark .glass-surface--svg {
  box-shadow:
    0 0 2px 1px rgba(255, 255, 255, 0.06) inset,
    0 0 10px 4px rgba(255, 255, 255, 0.03) inset,
    var(--glass-shadow);
}

.glass-surface--fallback {
  background: var(--glass-bg);
  backdrop-filter: blur(28px) saturate(200%);
  -webkit-backdrop-filter: blur(28px) saturate(200%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

@supports not (backdrop-filter: blur(10px)) {
  .glass-surface--fallback::before {
    content: "";
    position: absolute;
    inset: 0;
    background: var(--glass-bg);
    border-radius: inherit;
    z-index: -1;
  }
}

.glass-surface:focus-visible {
  outline: 2px solid var(--glass-ring);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds (the new files aren't imported anywhere yet, so this only confirms `GlassSurface.tsx` itself type-checks cleanly).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/GlassSurface.tsx src/components/ui/GlassSurface.css
git commit -m "Add GlassSurface component (TS port, class-based dark mode)"
```

---

### Task 2: Wire `GlassSurface` into the mobile `Header`

**Files:**
- Modify: `src/components/layout/Header.tsx`

**Interfaces:**
- Consumes: `GlassSurface` from `src/components/ui/GlassSurface.tsx` (Task 1) — `<GlassSurface className="absolute inset-0" width="100%" height="100%" borderRadius={24} />`.

- [ ] **Step 1: Replace the `.glass-nav` background with a `GlassSurface` layer**

Full new content of `src/components/layout/Header.tsx`:

```tsx
"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import GlassSurface from "@/components/ui/GlassSurface";

interface Props {
  title: string;
  showBack?: boolean;
  backHref?: string;
}

export function Header({ title, showBack, backHref }: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="fixed top-3 left-3 right-3 z-40 h-14 rounded-3xl lg:hidden">
      <GlassSurface className="absolute inset-0" width="100%" height="100%" borderRadius={24} />
      <div className="relative z-10 flex items-center h-full px-4">
        {showBack && backHref ? (
          <Link href={backHref} className="relative z-10 text-primary-600 dark:text-primary-400 flex items-center gap-1 font-medium text-sm">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
        ) : (
          <div className="relative z-10 flex items-center">
            <img
              src={mounted ? (resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png") : "/logo-light.png"}
              alt="Comtec"
              className="h-8 w-auto"
            />
          </div>
        )}
        <h1 className="absolute inset-x-0 text-center font-bold text-gray-900 dark:text-gray-50 text-xs px-20 truncate pointer-events-none">
          {title}
        </h1>
        <div className="relative z-10 ml-auto flex items-center gap-1 text-gray-600 dark:text-gray-300">
          <ThemeToggle />
          <NotificationBell variant="header" />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Manual visual check (mobile viewport)**

Start the dev server, resize the preview to a mobile width (375px), navigate to any page inside the app shell (e.g. `/fixture`):
- The floating top pill still renders with the same rounded shape and position, now with the liquid-glass distortion effect instead of the flat blur.
- Logo/back-link, title, theme toggle, and notification bell are all visible and functional in both light and dark mode.
- No console errors related to `ResizeObserver` or the SVG filter.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "Use GlassSurface as the mobile Header background"
```

---

### Task 3: Build `TopNav` and wire it into `AppShell`, remove `Sidebar`

**Files:**
- Create: `src/components/layout/TopNav.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Delete: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `GlassSurface` (Task 1), `NotificationBell` from `@/components/notifications/NotificationBell` (existing, still accepts `variant="header"` at this point — the `"sidebar"` variant is removed in Task 4, after this task stops using it), `ThemeToggle` from `./ThemeToggle` (existing).
- Produces: `TopNav` — named export `TopNav` from `src/components/layout/TopNav.tsx`, no props (`export function TopNav()`). Rendered with no arguments: `<TopNav />`.

- [ ] **Step 1: Create `src/components/layout/TopNav.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, User, Settings, BookOpen, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import GlassSurface from "@/components/ui/GlassSurface";

const navItems = [
  { href: "/fixture", label: "Fixture", icon: Home },
  { href: "/tabla", label: "Tabla", icon: Trophy },
  { href: "/reglas", label: "Reglas", icon: BookOpen },
  { href: "/perfil", label: "Mi Perfil", icon: User },
];

export function TopNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  const allItems = [
    ...navItems,
    ...(session?.user?.role === "admin"
      ? [{ href: "/admin", label: "Admin", icon: Settings }]
      : []),
  ];

  return (
    <div className="hidden lg:block fixed top-3 left-3 right-3 z-40 h-16">
      <GlassSurface className="absolute inset-0" width="100%" height="100%" borderRadius={24} />
      <div className="relative z-10 flex items-center h-full px-5 gap-2">
        <img
          src={mounted ? (resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png") : "/logo-light.png"}
          alt="Comtec"
          className="h-9 w-auto mr-4 flex-shrink-0"
        />

        <nav className="flex items-center gap-1">
          {allItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "glass-item flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-primary-600/10 text-primary-700 dark:bg-primary-400/12 dark:text-primary-300"
                    : "text-gray-700 hover:bg-black/5 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-white/8 dark:hover:text-white"
                )}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "stroke-[2.5]" : "stroke-[1.5]")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 flex-shrink-0">
          <NotificationBell variant="header" />
          <ThemeToggle />

          {session?.user && (
            <div ref={userMenuRef} className="relative ml-1">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0"
                aria-label="Cuenta"
              >
                <span className="text-primary-700 dark:text-primary-300 font-bold text-sm">
                  {session.user.name?.[0]?.toUpperCase() ?? "U"}
                </span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                      {session.user.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {session.user.email}
                    </p>
                  </div>
                  <Link
                    href="/perfil"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <User className="w-4 h-4" />
                    Mi Perfil
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `Sidebar` with `TopNav` in `AppShell` and fuse the title bar into page content**

Full new content of `src/components/layout/AppShell.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TabBar } from "./TabBar";
import { Header } from "./Header";
import { TopNav } from "./TopNav";

interface Props {
  title: string;
  children: React.ReactNode;
  showBack?: boolean;
  backHref?: string;
}

export function AppShell({ title, children, showBack, backHref }: Props) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop top nav */}
      <TopNav />

      {/* Mobile header (hidden on lg+) */}
      <Header title={title} showBack={showBack} backHref={backHref} />

      {/* Main content — lg:pt-24 clears the fixed floating TopNav (top-3 + h-16 + gap) */}
      <main className="lg:pt-24">
        {/* Page content — key por ruta fuerza el remount que dispara .page-enter
            en cada navegación. .page-enter anima solo opacidad (ver globals.css):
            el contenido de página puede incluir elementos `fixed` propios (ej.
            JumpToTodayButton en /fixture), y animar `transform` en un ancestro
            los convierte en su contenedor de referencia, rompiendo su posición
            respecto al viewport. */}
        <div key={pathname} className="page-enter max-w-4xl mx-auto px-4 lg:px-8 pt-20 lg:pt-4 pb-tab-bar lg:pb-8">
          {/* Desktop page title — fused from the old AppShell sticky bar.
              Mobile doesn't need this: Header already shows the title in its pill. */}
          <div className="hidden lg:flex items-center mb-6">
            {showBack && backHref ? (
              <Link href={backHref} className="mr-4 text-primary-600 dark:text-primary-400 font-medium text-sm hover:underline">
                ← Volver
              </Link>
            ) : null}
            <h1 className="font-bold text-gray-900 dark:text-gray-50 text-xl">{title}</h1>
          </div>

          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <TabBar />
    </div>
  );
}
```

- [ ] **Step 3: Delete `Sidebar.tsx`**

```bash
git rm src/components/layout/Sidebar.tsx
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds with no references to the deleted `Sidebar.tsx` remaining (there are none outside `AppShell.tsx`, already updated in Step 2).

- [ ] **Step 5: Manual visual check (desktop viewport)**

Start the dev server, resize the preview to a desktop width (≥1280px), navigate to a page with `showBack` (e.g. a detail page) and one without:
- The floating top pill nav renders with logo, the 4(+1) nav links with correct active-state highlighting as you navigate, notification bell, theme toggle, and avatar.
- Clicking the avatar opens the dropdown with name/email/"Mi Perfil"/"Cerrar sesión"; clicking outside closes it; "Cerrar sesión" redirects to `/login`.
- The page title (and "← Volver" link where applicable) renders correctly below the nav, inside the content area, not overlapped by the fixed nav.
- No leftover left margin / empty gutter where the old sidebar used to be.
- Check both light and dark mode.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/TopNav.tsx src/components/layout/AppShell.tsx
git commit -m "Replace desktop Sidebar with floating TopNav, fuse title bar into page content"
```

---

### Task 4: Remove the now-unused `NotificationBell` "sidebar" variant

**Files:**
- Modify: `src/components/notifications/NotificationBell.tsx`
- Modify: `src/components/layout/TopNav.tsx:` (drop the now-default `variant="header"` prop)
- Modify: `src/components/layout/Header.tsx:` (drop the now-default `variant="header"` prop)

**Interfaces:**
- Produces: `NotificationBell` now takes `{ className?: string }` only (no `variant` prop) — always renders the icon-only "header" style.

- [ ] **Step 1: Simplify `NotificationBell.tsx` to drop the `variant` prop**

Full new content of `src/components/notifications/NotificationBell.tsx`:

```tsx
"use client";

import { Bell, BellDot, Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Notif {
  id: string;
  titulo: string;
  mensaje: string;
  leido: boolean;
  createdAt: string;
}

interface Props {
  className?: string;
}

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export function NotificationBell({ className }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const cargar = () => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        setNotifs(d.notificaciones ?? []);
        setNoLeidas(d.noLeidas ?? 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    // Sin polling: una sola consulta al cargar la página (para mostrar el
    // contador de no leídas) y luego nada hasta que el usuario abra la campana.
    // Antes consultábamos en intervalo, lo que mantenía a Neon/Vercel ocupados
    // 24/7 con pestañas abiertas que nadie mira. Ahora una pestaña abandonada
    // hace 1 consulta al cargar y después cero.
    cargar();
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const abrir = () => {
    setOpen((v) => !v);
    if (!open) cargar();
  };

  const marcarLeidas = async () => {
    await fetch("/api/notifications?all=true", { method: "PATCH" });
    setNotifs((n) => n.map((x) => ({ ...x, leido: true })));
    setNoLeidas(0);
  };

  const irA = (n: Notif) => {
    setOpen(false);
    // Resultado final o cambio de líder → tabla; faltantes/inicio → fixture
    const url = n.titulo.startsWith("🏁") || n.titulo.startsWith("👑") ? "/tabla" : "/fixture";
    router.push(url);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button onClick={abrir} className="relative p-1" aria-label="Notificaciones">
        {noLeidas > 0 ? (
          <>
            <BellDot className="w-6 h-6 text-primary-600" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          </>
        ) : (
          <Bell className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {noLeidas > 0 && (
                <button onClick={marcarLeidas} className="text-xs text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> Marcar leídas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-10 text-center text-gray-400 dark:text-gray-600 text-sm">
                Sin notificaciones.
              </div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => irA(n)}
                  className={cn(
                    "pressable w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50",
                    !n.leido && "bg-blue-50 dark:bg-blue-950/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{n.titulo}</p>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 mt-0.5">
                      {tiempoRelativo(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.mensaje}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Drop the now-invalid `variant="header"` prop in `TopNav.tsx`**

In `src/components/layout/TopNav.tsx`, change:

```tsx
          <NotificationBell variant="header" />
```

to:

```tsx
          <NotificationBell />
```

- [ ] **Step 3: Drop the now-invalid `variant="header"` prop in `Header.tsx`**

In `src/components/layout/Header.tsx`, change:

```tsx
          <NotificationBell variant="header" />
```

to:

```tsx
          <NotificationBell />
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds — no remaining references to the `variant` prop anywhere (`grep -rn "NotificationBell variant" src/` returns nothing).

- [ ] **Step 5: Manual check**

In the running dev server, open the notification bell from both the desktop `TopNav` and the mobile `Header` — dropdown still opens/closes/positions correctly (`right-0 mt-2`) in both places.

- [ ] **Step 6: Commit**

```bash
git add src/components/notifications/NotificationBell.tsx src/components/layout/TopNav.tsx src/components/layout/Header.tsx
git commit -m "Drop unused NotificationBell sidebar variant"
```

---

### Task 5: Full verification pass and PR

**Files:** none (verification only).

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Succeeds with no TypeScript or lint errors.

- [ ] **Step 2: Run existing test suite (regression check)**

Run: `npm run test`
Expected: `tests/scoring.test.ts` still passes — this change touches no scoring/business logic, this just confirms nothing else broke.

- [ ] **Step 3: Full manual pass through the preview tools**

Desktop (≥1280px) and mobile (375px), light and dark mode, on at least: `/fixture`, `/tabla`, `/reglas`, `/perfil`, and (if logged in as admin) `/admin`:
- TopNav / Header / TabBar all render with the glass effect, no layout shift or overlap with page content.
- Navigation links work and show correct active state.
- Avatar dropdown (desktop) and notification bell (desktop + mobile) open, close on outside click, and function.
- No console errors or warnings tied to `GlassSurface`.

- [ ] **Step 4: Push branch and open PR**

```bash
git push -u origin feature/top-menu-glass
gh pr create --title "Top nav + GlassSurface" --body "$(cat <<'EOF'
## Summary
- Replace the desktop left Sidebar with a floating top nav (GlassSurface background), matching the mobile pill visual language.
- Port React Bits GlassSurface to TypeScript with class-based dark mode, tied into this project's existing --glass-* CSS variables.
- Fuse the old per-page desktop title bar into the page content area.
- Mobile Header now uses GlassSurface for its background; TabBar is unchanged.

## Test plan
- [x] npm run build
- [x] npm run test
- [ ] Review Vercel preview: desktop nav, mobile header/tab bar, avatar dropdown, notifications, light/dark mode
EOF
)"
```

Report the PR URL back to the user for review before merging to `main`.
