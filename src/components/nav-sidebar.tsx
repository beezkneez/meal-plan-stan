"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  CalendarDays,
  ChefHat,
  ClipboardList,
  Home,
  Package,
  ShoppingCart,
  Menu,
  LogIn,
  LogOut,
  Flame,
  Settings,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/recipes", label: "Recipes", icon: ChefHat },
  { href: "/meal-plan", label: "Meal Plan", icon: ClipboardList },
  { href: "/discover", label: "Discover", icon: Sparkles },
  { href: "/pantry", label: "Pantry", icon: Package },
  { href: "/shopping-list", label: "Shopping List", icon: ShoppingCart },
  { href: "/cart-queue", label: "Cart Queue", icon: ShoppingCart },
  { href: "/calendars", label: "Calendars", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings },
];

function BrandMark() {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary/15">
        <Flame className="h-5 w-5 text-sidebar-primary" />
      </div>
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight text-sidebar-foreground">
          Meal Plan Stan
        </h2>
        <p className="text-[11px] font-medium tracking-wide uppercase text-sidebar-foreground/40">
          Shift-smart meals
        </p>
      </div>
    </div>
  );
}

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-[18px] w-[18px] transition-transform duration-200",
                !active && "group-hover:scale-110"
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserSection() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start gap-2 border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        onClick={() => signIn("google")}
      >
        <LogIn className="h-4 w-4" />
        Sign in with Google
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/40 p-2.5">
      <Avatar className="h-9 w-9 ring-2 ring-sidebar-primary/20">
        <AvatarImage src={session.user.image ?? undefined} />
        <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-sm font-semibold">
          {session.user.name?.charAt(0)?.toUpperCase() ?? "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-sidebar-foreground">
          {session.user.name}
        </p>
        <p className="text-[11px] text-sidebar-foreground/40 truncate">
          {session.user.email}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        onClick={() => signOut()}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function NavSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile header bar */}
      <div className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/60 bg-background/80 px-5 backdrop-blur-xl md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="h-9 w-9" />
            }
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="sidebar-gradient w-72 border-sidebar-border p-0"
          >
            <div className="flex h-full flex-col">
              <div className="p-5 pb-4">
                <BrandMark />
              </div>
              <Separator className="bg-sidebar-border/50" />
              <div className="flex-1 overflow-y-auto py-4">
                <NavLinks onClick={() => setOpen(false)} />
              </div>
              <div className="p-4">
                <UserSection />
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          <h1 className="font-display text-lg font-bold tracking-tight">
            Meal Plan Stan
          </h1>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="sidebar-gradient hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 border-r border-sidebar-border">
        <div className="flex h-full flex-col">
          <div className="p-5 pb-4">
            <BrandMark />
          </div>
          <Separator className="mx-4 bg-sidebar-border/50" />
          <div className="flex-1 overflow-y-auto py-5">
            <NavLinks />
          </div>
          <div className="p-4 pt-0">
            <Separator className="mb-4 bg-sidebar-border/50" />
            <UserSection />
          </div>
        </div>
      </aside>
    </>
  );
}
