"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  ChefHat,
  ClipboardList,
  Package,
  ShoppingCart,
  Settings,
  ArrowRight,
  X,
} from "lucide-react";
import Link from "next/link";

const gettingStartedSteps = [
  {
    step: 1,
    title: "Set your preferences",
    description:
      "Tell Stan your eating style, dislikes, allergies, and household size so meals are tailored to you.",
    href: "/settings",
    icon: Settings,
  },
  {
    step: 2,
    title: "Enter your work schedule",
    description:
      "Map out your 16-day rotation (day / night / off). Stan uses this to plan simpler meals on work nights and bigger cooks on days off.",
    href: "/schedule",
    icon: CalendarDays,
  },
  {
    step: 3,
    title: "Add some recipes",
    description:
      'Paste URLs from your favorite recipe sites and Stan will import them. Start with 10-15 recipes you actually make. Don\'t have any? No worries — Stan can suggest meals based on your eating style.',
    href: "/recipes",
    icon: ChefHat,
  },
  {
    step: 4,
    title: "Stock your pantry (optional)",
    description:
      "Add staples you keep on hand (rice, oil, spices). Stan will subtract these from your shopping list so you only buy what you need.",
    href: "/pantry",
    icon: Package,
  },
  {
    step: 5,
    title: "Generate your meal plan",
    description:
      "Hit generate and Stan builds a 16-day plan around your schedule — quick meals on work nights, batch cooks on days off, leftovers packed for shifts.",
    href: "/meal-plan",
    icon: ClipboardList,
  },
  {
    step: 6,
    title: "Grab your shopping list",
    description:
      "Your list is auto-generated, organized by Walmart aisle. Check items off as you shop.",
    href: "/shopping-list",
    icon: ShoppingCart,
  },
];

export function GettingStarted() {
  const [hidden, setHidden] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    const isHidden = localStorage.getItem("hideGettingStarted") === "true";
    setHidden(isHidden);
  }, []);

  function hide() {
    localStorage.setItem("hideGettingStarted", "true");
    setHidden(true);
  }

  function show() {
    localStorage.removeItem("hideGettingStarted");
    setHidden(false);
  }

  if (hidden) {
    return (
      <button
        onClick={show}
        className="text-xs text-muted-foreground/60 hover:text-primary transition-colors"
      >
        Show Getting Started guide
      </button>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Getting Started
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={hide}
          className="text-muted-foreground/60 hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Hide
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Follow these steps to get your first meal plan up and running.
      </p>
      <div className="space-y-3">
        {gettingStartedSteps.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.step} href={item.href}>
              <Card className="card-warm group cursor-pointer border-border/60 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-start gap-4 p-5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold mt-0.5">
                      {item.step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground/60" />
                        <h3 className="font-semibold text-sm">{item.title}</h3>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/30 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
