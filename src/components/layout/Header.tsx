"use client";

import { Bell, BellDot } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  title: string;
  showBack?: boolean;
  backHref?: string;
}

export function Header({ title, showBack, backHref }: Props) {
  const [noLeidas, setNoLeidas] = useState(0);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNoLeidas(d.noLeidas ?? 0))
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center h-14 px-4 max-w-full lg:hidden">
        {showBack && backHref ? (
          <Link href={backHref} className="mr-3 text-primary-600 font-medium text-sm">
            â† Volver
          </Link>
        ) : (
          <div className="flex items-center mr-auto">
            <img
              src={mounted ? (resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png") : "/logo-light.png"}
              alt="Comtec"
              className="h-8 w-auto"
            />
          </div>
        )}
        <h1 className="font-bold text-gray-900 dark:text-gray-100 text-base truncate flex-1 text-center lg:text-left">
          {title}
        </h1>
        <div className="flex items-center gap-1 ml-2">
          <ThemeToggle />
          <Link href="/perfil#notificaciones" className="relative p-1">
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
          </Link>
        </div>
      </div>
    </header>
  );
}

