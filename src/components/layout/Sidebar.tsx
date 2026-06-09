"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, User, Settings, Bell, BellDot } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { href: "/fixture", label: "Fixture", icon: Home },
  { href: "/tabla", label: "Tabla", icon: Trophy },
  { href: "/perfil", label: "Mi Perfil", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNoLeidas(d.noLeidas ?? 0))
      .catch(() => {});
  }, []);

  const allItems = [
    ...navItems,
    ...(session?.user?.role === "admin"
      ? [{ href: "/admin", label: "Admin", icon: Settings }]
      : []),
  ];

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40">
      {/* Logo */}
      <div className="flex items-center h-16 px-5 border-b border-gray-100 dark:border-gray-800">
        <img
          src={mounted ? (resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png") : "/logo-light.png"}
          alt="Comtec"
          className="h-10 w-auto"
        />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider px-3 mb-2">
          MenÃº
        </p>
        {allItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              )}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", active ? "stroke-[2.5]" : "stroke-[1.5]")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: notifications + theme + user */}
      <div className="px-3 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-1">
        <Link
          href="/perfil#notificaciones"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
        >
          {noLeidas > 0 ? (
            <>
              <BellDot className="w-5 h-5 text-primary-600" />
              <span className="flex-1">Notificaciones</span>
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                {noLeidas > 9 ? "9+" : noLeidas}
              </span>
            </>
          ) : (
            <>
              <Bell className="w-5 h-5" />
              <span>Notificaciones</span>
            </>
          )}
        </Link>

        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400">
          <ThemeToggle className="p-0 rounded-none hover:bg-transparent dark:hover:bg-transparent" />
          <span>Modo oscuro</span>
        </div>

        {session?.user && (
          <div className="flex items-center gap-3 px-3 py-2 mt-1">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-700 dark:text-primary-400 font-bold text-sm">
                {session.user.name?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

