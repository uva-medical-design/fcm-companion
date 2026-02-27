"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { useEffect } from "react";
import {
  BookOpen,
  BookOpenCheck,
  ClipboardList,
  StickyNote,
  Library,
  GraduationCap,
  LogOut,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { OnboardingModal } from "@/components/onboarding-modal";

const navItems = [
  { href: "/cases", label: "Cases", icon: ClipboardList },
  { href: "/practice", label: "Try a Case", icon: Library },
  { href: "/plan", label: "Plan Ahead", icon: BookOpenCheck },
  { href: "/osce", label: "OSCE Prep", icon: GraduationCap },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/reference", label: "Resources", icon: BookOpen },
];

export default function StudentLayout({
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
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="flex min-h-dvh bg-background">
      <OnboardingModal />
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col border-r bg-sidebar h-dvh sticky top-0">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Stethoscope className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">FCM Companion</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
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
              <p className="text-muted-foreground">Student</p>
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

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile top header */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur safe-top md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-primary">FCM</span>
              <span className="text-xs text-muted-foreground">
                {user.name}
              </span>
            </div>
            <button
              onClick={() => {
                setUser(null);
                router.push("/");
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">{children}</main>

        {/* Mobile bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur safe-bottom md:hidden">
          <div className="flex h-16 items-center justify-around">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-2 text-xs transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn("h-5 w-5", isActive && "text-primary")}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
