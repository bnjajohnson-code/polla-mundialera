"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, User, Settings, BookOpen } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/fixture", label: "Fixture", icon: Home },
  { href: "/tabla", label: "Tabla", icon: Trophy },
  { href: "/reglas", label: "Reglas", icon: BookOpen },
  { href: "/perfil", label: "Mi Perfil", icon: User },
];

export function TabBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const allTabs = [
    ...tabs,
    ...(session?.user?.role === "admin"
      ? [{ href: "/admin", label: "Admin", icon: Settings }]
      : []),
  ];

  return (
    <nav className="lg:hidden fixed z-50 glass-nav border tab-bar-float h-16 rounded-3xl overflow-hidden">
      <div className="flex h-full">
        {allTabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "glass-item flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-all duration-150 rounded-3xl mx-0.5",
                active
                  ? "text-primary-600 dark:text-primary-300"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              )}
            >
              <Icon className={cn("w-5 h-5", active ? "stroke-[2.5]" : "stroke-[1.5]")} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
