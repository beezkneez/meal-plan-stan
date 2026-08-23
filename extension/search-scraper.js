// Meal Plan Stan - Search Scraper
// Injected into Walmart.ca search result pages to collect candidate products.
// Returns { title, url, price, unitPrice, unitMeasure, size, outOfStock }.
//
// Deliberately structural rather than class-name based: it finds product links
// by their /ip/ href and reads details off the surrounding tile, so a Walmart
// CSS refactor doesn't silently break it.

(function () {
  "use strict";

  const MAX_CANDIDATES = 8;

  // Walk up from the link to the element that looks like the whole product tile
  function findTile(anchor) {
    let el = anchor;
    for (let i = 0; i < 6 && el.parentElement; i++) {
      el = el.parentElement;
      if (
        el.hasAttribute("data-item-id") ||
        el.getAttribute("data-automation-id") === "product-tile" ||
        el.tagName === "LI"
      ) {
        return el;
      }
    }
    // Fall back to a few levels up — enough to catch price/stock text
    return anchor.parentElement?.parentElement ?? anchor;
  }

  // innerText keeps Walmart's line breaks, which separates the accessibility
  // price line from the visually-split "$497" that textContent would run together
  function tileText(tile) {
    return tile.innerText || tile.textContent || "";
  }

  function extractTitle(anchor, tile) {
    const titleEl =
      tile.querySelector('[data-automation-id="product-title"]') ||
      tile.querySelector("[link-identifier]") ||
      tile.querySelector("span.normal") ||
      anchor;

    const text = titleEl.textContent?.trim() || anchor.getAttribute("aria-label") || "";
    return text.replace(/\s+/g, " ").trim();
  }

  // Walmart splits the visible price into dollar and cent nodes ("$497"), but
  // also renders a screen-reader line: "current price Now $4.97, Was $5.96".
  // Prefer that line — it is unambiguous and already reflects any discount.
  function extractPrice(tile) {
    const text = tileText(tile);

    const current = text.match(/current price[^$]*\$\s?(\d[\d,]*\.\d{2})/i);
    if (current) return parseFloat(current[1].replace(/,/g, ""));

    const decimal = text.match(/\$\s?(\d[\d,]*\.\d{2})/);
    if (decimal) return parseFloat(decimal[1].replace(/,/g, ""));

    // Last resort: bare "$497" — trailing two digits are cents
    const run = text.match(/\$\s?(\d{3,})\b/);
    if (run) return parseInt(run[1], 10) / 100;

    const small = text.match(/\$\s?(\d{1,2})\b/);
    return small ? parseInt(small[1], 10) : null;
  }

  // Walmart shows comparison pricing as "$1.09/100g", "$0.55/100ml", "$2.00/ea"
  function extractUnitPrice(tile) {
    const match = tileText(tile).match(
      /\$\s?(\d+(?:\.\d{1,2})?)\s*\/\s*(\d+)?\s*(kg|g|ml|l|ea|each|ct)\b/i
    );
    if (!match) return { unitPrice: null, unitMeasure: "", amount: null, unit: "" };

    const unitPrice = parseFloat(match[1]);
    const amount = match[2] ? parseInt(match[2], 10) : 1;
    const unit = match[3].toLowerCase();

    return {
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : null,
      unitMeasure: `${match[2] ? amount : ""}${unit}`,
      amount,
      unit,
    };
  }

  // Search tiles never print the pack size, but it falls out of the arithmetic:
  // total price / unit price * unit amount. Approximate by design — a $4.97
  // block at $1.09/100g works out to ~456g, i.e. the 454g pack.
  function deriveSize(price, unitInfo) {
    const { unitPrice, amount, unit } = unitInfo;
    if (!price || !unitPrice || !amount) return "";
    if (!["g", "kg", "ml", "l"].includes(unit)) return "";

    const total = (price / unitPrice) * amount;
    if (!Number.isFinite(total) || total <= 0) return "";

    if (unit === "g" && total >= 1000) return `~${(total / 1000).toFixed(2)} kg`;
    if (unit === "ml" && total >= 1000) return `~${(total / 1000).toFixed(2)} L`;

    return `~${Math.round(total)} ${unit}`;
  }

  function isOutOfStock(tile) {
    const text = tileText(tile).toLowerCase();
    return (
      text.includes("out of stock") ||
      text.includes("sold out") ||
      text.includes("currently unavailable")
    );
  }

  try {
    const anchors = Array.from(document.querySelectorAll('a[href*="/ip/"]'));
    const seen = new Set();
    const candidates = [];

    for (const anchor of anchors) {
      if (candidates.length >= MAX_CANDIDATES) break;

      // Normalise to a clean product URL (no tracking query string)
      let url;
      try {
        const parsed = new URL(anchor.href, window.location.origin);

        // Sponsored tiles link to an ad redirect (/wapcrs/track) with the real
        // product buried in the query string. Dropping the query would leave a
        // URL that 404s, so skip anything that isn't a genuine product path.
        if (!parsed.pathname.includes("/ip/")) continue;

        url = parsed.origin + parsed.pathname;
      } catch (_) {
        continue;
      }

      if (seen.has(url)) continue;

      const tile = findTile(anchor);
      const title = extractTitle(anchor, tile);

      // Skip nav links and bare image anchors with no readable title
      if (!title || title.length < 3) continue;

      seen.add(url);

      const price = extractPrice(tile);
      const unitInfo = extractUnitPrice(tile);

      candidates.push({
        title,
        url,
        price,
        unitPrice: unitInfo.unitPrice,
        unitMeasure: unitInfo.unitMeasure,
        size: deriveSize(price, unitInfo),
        outOfStock: isOutOfStock(tile),
      });
    }

    return { success: true, candidates };
  } catch (err) {
    return { success: false, candidates: [], reason: String(err?.message || err) };
  }
})();
