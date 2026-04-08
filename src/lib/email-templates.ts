interface MealSlotData {
  date: Date;
  mealType: string;
  isLeftover: boolean;
  notes: string | null;
  servings: number;
  recipe: {
    title: string;
    totalMinutes: number;
    servings: number;
  } | null;
}

interface MealPlanData {
  startDate: Date;
  endDate: Date;
  slots: MealSlotData[];
}

interface PantryItemData {
  name: string;
  category: string;
  unit: string;
  qtyOnHand: number;
  qtyMinimum: number;
  walmartUrl: string | null;
  walmartUrlBackup: string | null;
}

// Shared styles
const STYLES = {
  body: "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #faf9f7; color: #1a1a1a;",
  header: "background: linear-gradient(135deg, #c4704b 0%, #a85d3a 100%); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px;",
  card: "background: white; border: 1px solid #e5e2dc; border-radius: 10px; padding: 20px; margin-bottom: 16px;",
  sectionTitle: "font-size: 18px; font-weight: 700; margin: 0 0 16px 0; color: #1a1a1a;",
  mealLabel: "display: inline-block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 8px; border-radius: 4px; margin-right: 8px;",
  mealColors: {
    breakfast: "background: #f5deb3; color: #8b6914;",
    lunch: "background: #d4e4d4; color: #3d6b3d;",
    dinner: "background: #f0c8b8; color: #8b4513;",
    snack: "background: #e0d4f0; color: #6b3d8b;",
  } as Record<string, string>,
  lowStockBadge: "display: inline-block; background: #fff3cd; color: #856404; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 600;",
  link: "color: #c4704b; text-decoration: none; font-weight: 500;",
  walmartBtn: "display: inline-block; background: #0071dc; color: white; padding: 6px 14px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;",
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDate(date: Date): string {
  const d = new Date(date);
  return `${DAY_NAMES[d.getDay()]}, ${d.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}`;
}

function groupByCategory(items: PantryItemData[]): Record<string, PantryItemData[]> {
  const groups: Record<string, PantryItemData[]> = {};
  for (const item of items) {
    const cat = item.category || "other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  return groups;
}

function groupSlotsByDate(slots: MealSlotData[]): Record<string, MealSlotData[]> {
  const groups: Record<string, MealSlotData[]> = {};
  for (const slot of slots) {
    const key = new Date(slot.date).toISOString().split("T")[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(slot);
  }
  return groups;
}

export function buildWeeklyMealPlanEmail({
  userName,
  mealPlan,
  lowStockItems,
  lowStockThreshold,
}: {
  userName: string;
  mealPlan: MealPlanData | null;
  lowStockItems: PantryItemData[];
  lowStockThreshold: number;
}): string {
  let html = `<div style="${STYLES.body}">`;

  // Header
  html += `<div style="${STYLES.header}">
    <h1 style="margin: 0; font-size: 24px;">Meal Plan Stan</h1>
    <p style="margin: 8px 0 0; opacity: 0.9;">Hey ${userName}, here's your weekly meal plan!</p>
  </div>`;

  // Low stock pantry items
  if (lowStockItems.length > 0) {
    html += `<div style="${STYLES.card}">
      <h2 style="${STYLES.sectionTitle}">&#x26A0; Pantry Items to Restock</h2>
      <p style="font-size: 13px; color: #666; margin: 0 0 12px;">Items at or below ${lowStockThreshold} ${lowStockThreshold === 1 ? "unit" : "units"}:</p>`;

    const grouped = groupByCategory(lowStockItems);
    for (const [category, items] of Object.entries(grouped)) {
      html += `<p style="font-size: 13px; font-weight: 600; text-transform: capitalize; margin: 12px 0 4px; color: #555;">${category}</p>`;
      html += `<ul style="margin: 0; padding-left: 20px;">`;
      for (const item of items) {
        const walmartLink = item.walmartUrl
          ? ` <a href="${item.walmartUrl}" style="${STYLES.link}">[Walmart]</a>`
          : "";
        html += `<li style="font-size: 14px; margin-bottom: 4px;">
          ${item.name} — <span style="${STYLES.lowStockBadge}">${item.qtyOnHand} ${item.unit}</span>${walmartLink}
        </li>`;
      }
      html += `</ul>`;
    }
    html += `</div>`;
  }

  // Meal plan
  if (mealPlan && mealPlan.slots.length > 0) {
    html += `<div style="${STYLES.card}">
      <h2 style="${STYLES.sectionTitle}">&#x1F4C5; Your Meal Plan</h2>
      <p style="font-size: 13px; color: #666; margin: 0 0 16px;">
        ${formatDate(mealPlan.startDate)} &mdash; ${formatDate(mealPlan.endDate)}
      </p>`;

    const byDate = groupSlotsByDate(mealPlan.slots);
    for (const [dateKey, slots] of Object.entries(byDate)) {
      const date = new Date(dateKey + "T12:00:00Z");
      html += `<div style="border-left: 3px solid #c4704b; padding-left: 12px; margin-bottom: 16px;">
        <p style="font-size: 14px; font-weight: 700; margin: 0 0 6px;">${formatDate(date)}</p>`;

      const mealOrder = ["breakfast", "lunch", "dinner", "snack"];
      const sorted = [...slots].sort(
        (a, b) => mealOrder.indexOf(a.mealType) - mealOrder.indexOf(b.mealType)
      );

      for (const slot of sorted) {
        const colorStyle = STYLES.mealColors[slot.mealType] || "";
        const title = slot.recipe?.title || slot.notes || "—";
        const leftoverTag = slot.isLeftover ? " (leftovers)" : "";
        html += `<p style="font-size: 13px; margin: 2px 0;">
          <span style="${STYLES.mealLabel}${colorStyle}">${slot.mealType}</span>
          ${title}${leftoverTag}
          <span style="color: #999; font-size: 12px;">(${slot.servings} servings)</span>
        </p>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
  } else {
    html += `<div style="${STYLES.card}">
      <p style="font-size: 14px; color: #666;">No meal plan generated yet. Open the app to create one!</p>
    </div>`;
  }

  // Footer
  html += `<div style="text-align: center; padding: 16px; font-size: 12px; color: #999;">
    <p>Sent by Meal Plan Stan</p>
  </div>`;

  html += `</div>`;
  return html;
}

export function buildShoppingCartEmail({
  userName,
  mealPlan,
  pantryItems,
}: {
  userName: string;
  mealPlan: MealPlanData;
  pantryItems: PantryItemData[];
}): string {
  let html = `<div style="${STYLES.body}">`;

  // Header
  html += `<div style="${STYLES.header}">
    <h1 style="margin: 0; font-size: 24px;">Meal Plan Stan</h1>
    <p style="margin: 8px 0 0; opacity: 0.9;">Hey ${userName}, your shopping list is ready!</p>
  </div>`;

  // Pantry items with Walmart links, organized by category
  const itemsWithLinks = pantryItems.filter((p) => p.walmartUrl);

  if (itemsWithLinks.length > 0) {
    html += `<div style="${STYLES.card}">
      <h2 style="${STYLES.sectionTitle}">&#x1F6D2; Quick-Add to Walmart Cart</h2>
      <p style="font-size: 13px; color: #666; margin: 0 0 12px;">Click each item to open it on Walmart.ca:</p>`;

    const grouped = groupByCategory(itemsWithLinks);
    for (const [category, items] of Object.entries(grouped)) {
      html += `<p style="font-size: 13px; font-weight: 600; text-transform: capitalize; margin: 12px 0 6px; color: #555;">${category}</p>`;
      for (const item of items) {
        const isLow = item.qtyOnHand <= item.qtyMinimum;
        const stockNote = isLow
          ? ` <span style="${STYLES.lowStockBadge}">Low: ${item.qtyOnHand} ${item.unit}</span>`
          : "";
        html += `<div style="margin-bottom: 8px;">
          <a href="${item.walmartUrl}" style="${STYLES.walmartBtn}">${item.name}</a>${stockNote}
        </div>`;
        if (item.walmartUrlBackup) {
          html += `<div style="margin-bottom: 8px; margin-left: 12px;">
            <a href="${item.walmartUrlBackup}" style="${STYLES.link}">Backup option</a>
          </div>`;
        }
      }
    }
    html += `</div>`;
  }

  // Low stock items without links
  const lowStockNoLink = pantryItems.filter(
    (p) => p.qtyOnHand <= p.qtyMinimum && !p.walmartUrl
  );
  if (lowStockNoLink.length > 0) {
    html += `<div style="${STYLES.card}">
      <h2 style="${STYLES.sectionTitle}">&#x1F4DD; Also Needed (no Walmart link set)</h2>
      <ul style="margin: 0; padding-left: 20px;">`;
    for (const item of lowStockNoLink) {
      const searchUrl = `https://www.walmart.ca/search?q=${encodeURIComponent(item.name)}`;
      html += `<li style="font-size: 14px; margin-bottom: 4px;">
        ${item.name} (${item.qtyOnHand} ${item.unit})
        — <a href="${searchUrl}" style="${STYLES.link}">Search Walmart</a>
      </li>`;
    }
    html += `</ul></div>`;
  }

  // Meal plan summary
  html += `<div style="${STYLES.card}">
    <h2 style="${STYLES.sectionTitle}">&#x1F4C5; This Week's Meals</h2>`;
  const byDate = groupSlotsByDate(mealPlan.slots);
  for (const [dateKey, slots] of Object.entries(byDate)) {
    const date = new Date(dateKey + "T12:00:00Z");
    html += `<p style="font-size: 13px; margin: 8px 0 2px;"><strong>${formatDate(date)}:</strong> `;
    html += slots
      .map((s) => s.recipe?.title || s.notes || "—")
      .join(", ");
    html += `</p>`;
  }
  html += `</div>`;

  // Footer
  html += `<div style="text-align: center; padding: 16px; font-size: 12px; color: #999;">
    <p>Sent by Meal Plan Stan</p>
  </div></div>`;

  return html;
}
