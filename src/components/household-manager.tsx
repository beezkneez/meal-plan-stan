"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Plus, Trash2, Crown } from "lucide-react";

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
}

interface HouseholdData {
  isOwner: boolean;
  owner: Member | null;
  members: Member[];
}

export function HouseholdManager() {
  const [data, setData] = useState<HouseholdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/household")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function invite() {
    setError("");
    setSuccess("");
    setInviting(true);
    try {
      const res = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error);
        return;
      }
      setSuccess(`${result.member.name ?? result.member.email} added!`);
      setEmail("");
      setData((prev) =>
        prev ? { ...prev, members: [...prev.members, result.member] } : prev
      );
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(memberId: string) {
    await fetch("/api/household", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    setData((prev) =>
      prev
        ? { ...prev, members: prev.members.filter((m) => m.id !== memberId) }
        : prev
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading...
      </div>
    );
  }

  if (!data) return null;

  return (
    <Card className="border-border/60">
      <CardHeader className="bg-gradient-to-r from-accent/40 to-transparent pb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle className="font-display text-xl">Household</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Share recipes, meal plans, pantry, and shopping lists with your
          household.
        </p>
      </CardHeader>
      <CardContent className="pt-5 space-y-4">
        {/* Owner */}
        <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
          <Crown className="h-4 w-4 text-amber-warm shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {data.owner?.name ?? data.owner?.email ?? "You"}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.isOwner ? "You (owner)" : "Owner"}
            </p>
          </div>
        </div>

        {/* Members */}
        {data.members.length > 0 && (
          <div className="space-y-2">
            {data.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-xl border border-border/60 p-3"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {member.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.name ?? member.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.email}
                  </p>
                </div>
                {data.isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMember(member.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Invite */}
        {data.isOwner && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Partner's Gmail address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && email && invite()}
                type="email"
              />
              <Button
                onClick={invite}
                disabled={inviting || !email}
              >
                <Plus className="h-4 w-4 mr-2" />
                {inviting ? "Adding..." : "Add"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              They need to sign into the app once first, then you can add them
              here. Everything will be shared — recipes, meal plans, pantry, and
              shopping lists.
            </p>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {success && (
              <p className="text-sm text-sage font-medium">{success}</p>
            )}
          </div>
        )}

        {!data.isOwner && (
          <p className="text-sm text-muted-foreground">
            You&apos;re sharing {data.owner?.name ?? "someone"}&apos;s
            household. All recipes, meal plans, pantry, and shopping lists are
            synced.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
