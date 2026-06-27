"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";

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
    <header className="fixed top-3 left-3 right-3 z-40 glass-nav border rounded-3xl lg:hidden">
      <div className="flex items-center h-14 px-4 max-w-full">
        {showBack && backHref ? (
          <Link href={backHref} className="mr-3 text-primary-600 dark:text-primary-400 flex items-center gap-1 font-medium text-sm">
            <ArrowLeft className="w-4 h-4" />
            Volver
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
        <h1 className="font-bold text-gray-900 dark:text-gray-50 text-xs truncate flex-1 text-center lg:text-left">
          {title}
        </h1>
        <div className="flex items-center gap-1 ml-2 text-gray-600 dark:text-gray-300">
          <ThemeToggle />
          <NotificationBell variant="header" />
        </div>
      </div>
    </header>
  );
}

