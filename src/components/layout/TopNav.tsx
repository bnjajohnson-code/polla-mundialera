"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, User, Settings, BookOpen, LogOut, Sun, Moon } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
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
  const { resolvedTheme, setTheme } = useTheme();
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
      <GlassSurface
        className="absolute inset-0"
        style={{ position: "absolute", inset: 0 }}
        width="100%"
        height="100%"
        borderRadius={24}
      />
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
          <NotificationBell />

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
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {resolvedTheme === "dark" ? "Modo claro" : "Modo oscuro"}
                  </button>
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
