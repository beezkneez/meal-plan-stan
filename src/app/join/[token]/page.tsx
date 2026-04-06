"use client";

import { useState, use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Check, AlertCircle } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [ownerName, setOwnerName] = useState("");

  async function handleJoin() {
    setJoining(true);
    setError("");
    try {
      const res = await fetch("/api/household/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setJoined(true);
      setOwnerName(data.ownerName ?? "your family");
    } finally {
      setJoining(false);
    }
  }

  if (joined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-sm border-border/60">
          <CardContent className="py-10 text-center space-y-4">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-sage/15">
              <Check className="h-7 w-7 text-sage" />
            </div>
            <h2 className="font-display text-2xl font-bold">You&apos;re in!</h2>
            <p className="text-muted-foreground">
              You&apos;ve joined {ownerName}&apos;s household. All recipes, meal plans,
              pantry, and shopping lists are now shared.
            </p>
            <Button onClick={() => router.push("/")} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-sm border-border/60">
        <CardContent className="py-10 text-center space-y-4">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-primary/10">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold">
            Join Household
          </h2>
          <p className="text-muted-foreground">
            You&apos;ve been invited to share a Meal Plan Stan household.
            Join to share recipes, meal plans, pantry, and shopping lists.
          </p>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {status === "loading" ? (
            <div className="flex items-center gap-3 justify-center text-muted-foreground py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !session ? (
            <Button
              onClick={() => signIn("google")}
              className="w-full"
              size="lg"
            >
              Sign in with Google to join
            </Button>
          ) : (
            <Button
              onClick={handleJoin}
              disabled={joining}
              className="w-full"
              size="lg"
            >
              {joining ? "Joining..." : "Join Household"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
