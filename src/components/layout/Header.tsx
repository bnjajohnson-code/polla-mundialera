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
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center h-14 px-4 max-w-full lg:hidden">
        {showBack && backHref ? (
          <Link href={backHref} className="mr-3 text-primary-600 flex items-center gap-1 font-medium text-sm">
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
        <h1 className="font-bold text-gray-900 dark:text-gray-100 text-base truncate flex-1 text-center lg:text-left">
          {title}
        </h1>
        <div className="flex items-center gap-1 ml-2">
          <ThemeToggle />
          <NotificationBell variant="header" />
        </div>
      </div>
    </header>
  );
}

