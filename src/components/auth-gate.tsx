"use client";

import { useSession, signIn } from "next-auth/react";
import { usePathname } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Routes that must stay reachable while signed out. Invite links land here
// before the recipient has an account, and the page runs its own sign-in flow.
const PUBLIC_PREFIXES = ["/join"];

/**
 * Blocks the app shell until there is a session.
 *
 * Without this, a lapsed session let every page render, fetch its API, get
 * back `{ error: "Unauthorized" }`, and crash on `.map()` — the user saw a
 * blank "This page couldn't load" screen with no hint that signing in fixes it.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();

  const isPublic = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isPublic) return <>{children}</>;

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center py-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              Welcome back
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your session has ended. Sign in to get back to your meal plan,
              recipes, and shopping list.
            </p>
            <Button
              onClick={() => signIn("google")}
              className="w-full gap-2"
              size="lg"
            >
              <LogIn className="h-4 w-4" />
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
