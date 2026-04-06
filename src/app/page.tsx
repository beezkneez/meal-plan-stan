import { Card, CardContent } from "@/components/ui/card";
import {
  CalendarDays,
  ChefHat,
  Package,
  ShoppingCart,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { GettingStarted } from "@/components/getting-started";

const features = [
  {
    href: "/schedule",
    label: "Schedule",
    description: "Set up your 16-day rotation so meals match your shifts",
    icon: CalendarDays,
    gradient: "from-amber-warm/20 to-amber-warm/5",
    iconColor: "text-amber-warm",
  },
  {
    href: "/recipes",
    label: "Recipes",
    description: "Build your recipe book by importing from any URL",
    icon: ChefHat,
    gradient: "from-terracotta/20 to-terracotta/5",
    iconColor: "text-terracotta",
  },
  {
    href: "/pantry",
    label: "Pantry",
    description: "Track your staples and never run out of essentials",
    icon: Package,
    gradient: "from-sage/20 to-sage/5",
    iconColor: "text-sage",
  },
  {
    href: "/shopping-list",
    label: "Shopping List",
    description: "Walmart-ready list organized by aisle",
    icon: ShoppingCart,
    gradient: "from-indigo-shift/20 to-indigo-shift/5",
    iconColor: "text-indigo-shift",
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-10">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/30 to-secondary p-8 md:p-12">
        <div className="absolute top-4 right-6 opacity-10">
          <Sparkles className="h-32 w-32 text-primary" />
        </div>
        <div className="relative">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            Welcome back
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            What&apos;s cooking?
          </h1>
          <p className="mt-3 max-w-md text-base text-muted-foreground">
            Your meal planning command center. Plan smarter meals around your
            shift schedule.
          </p>
        </div>
      </div>

      {/* Getting Started Guide (hideable) */}
      <GettingStarted />

      {/* Quick access cards */}
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight mb-5">
          Quick Access
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.href} href={feature.href}>
                <Card className="card-warm group cursor-pointer overflow-hidden border-border/60">
                  <CardContent className="p-0">
                    <div
                      className={`flex items-start gap-4 bg-gradient-to-br ${feature.gradient} p-6`}
                    >
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background/80 shadow-sm ${feature.iconColor}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-lg font-semibold tracking-tight">
                          {feature.label}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
