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
