// Meal Plan Stan - Cart Injector
// Injected into Walmart.ca product pages to click "Add to Cart"
// Returns { success: boolean, reason?: string } to the background script

(async function () {
  "use strict";

  const MAX_WAIT_MS = 10000;
  const POLL_INTERVAL_MS = 500;

  // Wait for a selector to appear in the DOM
  function waitForElement(selectors, timeout = MAX_WAIT_MS) {
    return new Promise((resolve) => {
      const start = Date.now();

      function check() {
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el) return resolve(el);
        }
        if (Date.now() - start > timeout) return resolve(null);
        setTimeout(check, POLL_INTERVAL_MS);
      }

      check();
    });
  }

  // Check if the product is out of stock
  function isOutOfStock() {
    const oosSelectors = [
      '[data-automation-id="oos"]',
      '[data-testid="outOfStockBtn"]',
      '[data-testid="out-of-stock-message"]',
    ];

    for (const sel of oosSelectors) {
      if (document.querySelector(sel)) return true;
    }

    // Check for "Out of stock" text near the buy area
    const buttons = document.querySelectorAll("button");
    for (const btn of buttons) {
      const text = btn.textContent?.trim().toLowerCase() || "";
      if (text.includes("out of stock")) return true;
    }

    // Check if add-to-cart button is disabled
    const addBtn = findAddToCartButton();
    if (addBtn && (addBtn.disabled || addBtn.getAttribute("aria-disabled") === "true")) {
      return true;
    }

    return false;
  }

  // Find the "Add to Cart" button using actual Walmart.ca selectors
  function findAddToCartButton() {
    // Primary: data-automation-id="atc" (confirmed from live Walmart.ca)
    const primary = document.querySelector('[data-automation-id="atc"]');
    if (primary) return primary;

    // Fallbacks
    const fallbacks = [
      'button[data-dca-event="addToCart"]',
      '[data-testid="addToCartBtn"]',
      'button[data-automation="addToCartBtn"]',
    ];

    for (const sel of fallbacks) {
      const el = document.querySelector(sel);
      if (el) return el;
    }

    // Last resort: find button with "Add to cart" text
    const buttons = document.querySelectorAll("button");
    for (const btn of buttons) {
      const text = btn.textContent?.trim().toLowerCase() || "";
      if (text === "add to cart") {
        return btn;
      }
    }

    return null;
  }

  // Wait for the cart confirmation
  function waitForCartConfirmation(timeout = 5000) {
    return new Promise((resolve) => {
      const start = Date.now();

      function check() {
        // Check for flyout cart or confirmation elements
        const successSelectors = [
          '[data-automation-id="atc-flyout"]',
          '[data-automation-id="cart-flyout"]',
          '[data-testid="atc-confirmation"]',
          '[class*="flyout-cart"]',
          '[class*="CartFlyout"]',
        ];

        for (const sel of successSelectors) {
          if (document.querySelector(sel)) return resolve(true);
        }

        // Check for any element with "added" text
        const alerts = document.querySelectorAll(
          '[role="alert"], [role="status"], [aria-live="polite"]'
        );
        for (const el of alerts) {
          const text = el.textContent?.toLowerCase() || "";
          if (text.includes("added to cart") || text.includes("added to your cart")) {
            return resolve(true);
          }
        }

        if (Date.now() - start > timeout) return resolve(false);
        setTimeout(check, 500);
      }

      setTimeout(check, 500);
    });
  }

  try {
    // Step 1: Check for out of stock
    if (isOutOfStock()) {
      return { success: false, reason: "oos" };
    }

    // Step 2: Wait for the add-to-cart button to appear
    const addBtn = await waitForElement([
      '[data-automation-id="atc"]',
      'button[data-dca-event="addToCart"]',
    ]);

    if (!addBtn && isOutOfStock()) {
      return { success: false, reason: "oos" };
    }

    const finalBtn = addBtn || findAddToCartButton();

    if (!finalBtn) {
      return { success: false, reason: "button_not_found" };
    }

    if (finalBtn.disabled || finalBtn.getAttribute("aria-disabled") === "true") {
      return { success: false, reason: "oos" };
    }

    // Step 3: Click the button
    finalBtn.click();

    // Step 4: Wait for confirmation
    const confirmed = await waitForCartConfirmation();

    if (confirmed) {
      return { success: true };
    }

    // Even without confirmation, the click likely worked
    return { success: true, reason: "no_confirmation_detected" };
  } catch (err) {
    return { success: false, reason: "script_error" };
  }
})();
