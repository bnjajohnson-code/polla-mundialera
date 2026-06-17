"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, User, Settings, BookOpen, MessageCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/fixture", label: "Fixture", icon: Home },
  { href: "/tabla", label: "Tabla", icon: Trophy },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/reglas", label: "Reglas", icon: BookOpen },
  { href: "/perfil", label: "Perfil", icon: User },
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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 tab-bar-height">
      <div className="flex h-16">
        {allTabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
                active
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
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
