"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { useEffect } from "react";
import {
  BarChart3,
  Settings,
  LogOut,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const sidebarItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/admin", label: "Admin", icon: Settings },
];

export default function FacultyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, setUser } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/");
    } else if (user.role === "student") {
      router.push("/cases");
    }
  }, [user, router]);

  if (!user || user.role === "student") return null;

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col border-r bg-sidebar h-dvh sticky top-0">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Stethoscope className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">FCM Companion</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            // Only show Admin link to admins
            if (item.href === "/admin" && user.role !== "admin") return null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <p className="font-medium">{user.name}</p>
              <p className="text-muted-foreground">{user.role}</p>
            </div>
            <button
              onClick={() => {
                setUser(null);
                router.push("/");
              }}
              className="p-1.5 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex md:hidden h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">FCM</span>
          </div>
          <div className="flex items-center gap-2">
            {sidebarItems.map((item) => {
              if (item.href === "/admin" && user.role !== "admin") return null;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "p-2 rounded-md",
                    isActive
                      ? "text-primary bg-accent"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </Link>
              );
            })}
            <button
              onClick={() => {
                setUser(null);
                router.push("/");
              }}
              className="p-2 text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
