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
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}

