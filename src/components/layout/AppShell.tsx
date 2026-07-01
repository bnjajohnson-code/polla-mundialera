"use client";

import Link from "next/link";
import { TabBar } from "./TabBar";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface Props {
  title: string;
  children: React.ReactNode;
  showBack?: boolean;
  backHref?: string;
}

export function AppShell({ title, children, showBack, backHref }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile header (hidden on lg+) */}
      <Header title={title} showBack={showBack} backHref={backHref} />

      {/* Main content */}
      <main className="lg:ml-56">
        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center h-16 px-8 border-b glass-nav sticky top-0 z-30">
          {showBack && backHref ? (
            <Link href={backHref} className="mr-4 text-primary-600 dark:text-primary-400 font-medium text-sm hover:underline">
              ← Volver
            </Link>
          ) : null}
          <h1 className="font-bold text-gray-900 dark:text-gray-50 text-xl">{title}</h1>
        </div>

        {/* Page content */}
        <div className="max-w-4xl mx-auto px-4 lg:px-8 pt-20 lg:pt-4 pb-tab-bar lg:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <TabBar />
    </div>
  );
}
