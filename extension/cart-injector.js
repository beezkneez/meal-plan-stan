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
    // Common Walmart.ca OOS indicators
    const oosSelectors = [
      '[data-testid="outOfStockBtn"]',
      '[data-testid="out-of-stock-message"]',
      ".out-of-stock-message",
    ];

    for (const sel of oosSelectors) {
      if (document.querySelector(sel)) return true;
    }

    // Check for "Out of stock" text in the buy-box area
    const buyBox =
      document.querySelector('[data-testid="buy-box"]') ||
      document.querySelector(".buy-box-container") ||
      document.querySelector('[class*="buy-box"]');

    if (buyBox) {
      const text = buyBox.textContent?.toLowerCase() || "";
      if (
        text.includes("out of stock") ||
        text.includes("currently unavailable")
      ) {
        return true;
      }
    }

    // Check if add-to-cart button is disabled
    const addBtn = findAddToCartButton();
    if (addBtn && (addBtn.disabled || addBtn.getAttribute("aria-disabled") === "true")) {
      return true;
    }

    return false;
  }

  // Find the "Add to Cart" button using multiple strategies
  function findAddToCartButton() {
    const selectors = [
      '[data-testid="addToCartBtn"]',
      'button[data-automation="addToCartBtn"]',
      '[data-testid="add-to-cart-button"]',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }

    // Fallback: find button with "Add to cart" text
    const buttons = document.querySelectorAll("button");
    for (const btn of buttons) {
      const text = btn.textContent?.trim().toLowerCase() || "";
      if (text === "add to cart" || text === "add to cart - ") {
        return btn;
      }
    }

    return null;
  }

  // Wait for the cart confirmation (toast, modal, or cart count change)
  function waitForCartConfirmation(timeout = 5000) {
    return new Promise((resolve) => {
      const start = Date.now();

      function check() {
        // Check for success toast/modal
        const successSelectors = [
          '[data-testid="added-to-cart-confirmation"]',
          '[data-testid="atc-confirmation"]',
          ".added-to-cart-confirmation",
          '[class*="flyout-cart"]',
        ];

        for (const sel of successSelectors) {
          if (document.querySelector(sel)) return resolve(true);
        }

        // Check for any toast with "added" text
        const toasts = document.querySelectorAll(
          '[role="alert"], [role="status"], .toast, .notification'
        );
        for (const toast of toasts) {
          const text = toast.textContent?.toLowerCase() || "";
          if (text.includes("added to cart") || text.includes("added to your cart")) {
            return resolve(true);
          }
        }

        if (Date.now() - start > timeout) return resolve(false);
        setTimeout(check, 500);
      }

      // Give the page a moment to react before checking
      setTimeout(check, 500);
    });
  }

  try {
    // Step 1: Check for out of stock
    if (isOutOfStock()) {
      return { success: false, reason: "oos" };
    }

    // Step 2: Find the add-to-cart button
    const addBtn = await waitForElement([
      '[data-testid="addToCartBtn"]',
      'button[data-automation="addToCartBtn"]',
      '[data-testid="add-to-cart-button"]',
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

    // Even without confirmation, the click may have worked
    // (some Walmart pages don't show a clear confirmation)
    return { success: true, reason: "no_confirmation_detected" };
  } catch (err) {
    return { success: false, reason: "script_error" };
  }
})();
