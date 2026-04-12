"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  ExternalLink,
  Loader2,
  LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CartQueueItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  section: string;
  walmartUrl: string | null;
  walmartUrlBackup: string | null;
  source: string;
  status: string;
  errorNote: string | null;
  usedBackup: boolean;
  weekOf: string;
}

interface CartQueueSummary {
  total: number;
  pending: number;
  added: number;
  failed: number;
  noUrl: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof Check }
> = {
  pending: {
    label: "Pending",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    icon: ShoppingCart,
  },
  added: {
    label: "Added to Cart",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    icon: Check,
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    icon: X,
  },
  no_url: {
    label: "No Walmart Link",
    color:
      "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
    icon: LinkIcon,
  },
};

const SOURCE_LABELS: Record<string, string> = {
  meal_plan: "Meal Plan",
  google_tasks: "Google Tasks",
  manual: "Manual",
};

export default function CartQueuePage() {
  const [items, setItems] = useState<CartQueueItem[]>([]);
  const [summary, setSummary] = useState<CartQueueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/cart-queue");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setSummary(data.summary);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const generateQueue = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/cart-queue", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setSummary(data.summary);
      }
    } finally {
      setGenerating(false);
    }
  };

  const groupedByStatus = (status: string) =>
    items.filter((i) => i.status === status);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Cart Queue
          </h1>
          <p className="mt-1 text-muted-foreground">
            Auto-add items to your Walmart cart via the Chrome extension.
          </p>
        </div>
        <Button onClick={generateQueue} disabled={generating}>
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {items.length === 0 ? "Generate Queue" : "Regenerate"}
        </Button>
      </div>

      {/* Summary cards */}
      {summary && summary.total > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">{summary.pending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-green-600">
                {summary.added}
              </div>
              <div className="text-sm text-muted-foreground">Added</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-red-600">
                {summary.failed}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-gray-500">
                {summary.noUrl}
              </div>
              <div className="text-sm text-muted-foreground">No Link</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Extension prompt */}
      {summary && summary.pending > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <ShoppingCart className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {summary.pending} items ready to add
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Open the Meal Plan Stan Chrome extension and click &ldquo;Add
                Shopping List to Cart&rdquo; to begin.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingCart className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">No cart queue yet</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Click &ldquo;Generate Queue&rdquo; to build your Walmart cart
              queue from your current meal plan and any Google Tasks imports.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pending items */}
      {groupedByStatus("pending").length > 0 && (
        <ItemSection
          title="Ready to Add"
          status="pending"
          items={groupedByStatus("pending")}
        />
      )}

      {/* Added items */}
      {groupedByStatus("added").length > 0 && (
        <ItemSection
          title="Added to Cart"
          status="added"
          items={groupedByStatus("added")}
        />
      )}

      {/* Failed items */}
      {groupedByStatus("failed").length > 0 && (
        <ItemSection
          title="Failed"
          status="failed"
          items={groupedByStatus("failed")}
        />
      )}

      {/* No URL items */}
      {groupedByStatus("no_url").length > 0 && (
        <ItemSection
          title="Manual Add Required"
          status="no_url"
          items={groupedByStatus("no_url")}
          description="These items don't have a Walmart link in your pantry. Add them to your cart manually, or add a Walmart URL in the Pantry page."
        />
      )}
    </div>
  );
}

function ItemSection({
  title,
  status,
  items,
  description,
}: {
  title: string;
  status: string;
  items: CartQueueItem[];
  description?: string;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config?.icon ?? ShoppingCart;

  // Group by section
  const sections = new Map<string, CartQueueItem[]>();
  for (const item of items) {
    const section = item.section || "Other";
    const list = sections.get(section) ?? [];
    list.push(item);
    sections.set(section, list);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5" />
          {title}
          <Badge className={cn("ml-1", config?.color)}>{items.length}</Badge>
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from(sections.entries()).map(([section, sectionItems]) => (
          <div key={section}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section}
            </h4>
            <div className="space-y-1.5">
              {sectionItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {item.qty} {item.unit}
                    </span>
                    {item.usedBackup && (
                      <Badge
                        variant="outline"
                        className="shrink-0 text-xs"
                      >
                        Backup
                      </Badge>
                    )}
                    {item.source !== "meal_plan" && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {SOURCE_LABELS[item.source] ?? item.source}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.errorNote && (
                      <span className="text-xs text-red-500">
                        {item.errorNote}
                      </span>
                    )}
                    {item.walmartUrl && (
                      <a
                        href={item.walmartUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {status === "no_url" && (
                      <a
                        href={`https://www.walmart.ca/search?q=${encodeURIComponent(item.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                        title="Search on Walmart"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
