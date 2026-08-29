import type {
  EligibilityDatabase,
  EligibilityResult,
} from "./types";

const BCRS_MIN_ML = 150;
const BCRS_MAX_ML = 3000;
const TRANSITION_END = new Date("2026-09-30T23:59:59+08:00");

function isInTransitionPeriod(): boolean {
  return new Date() <= TRANSITION_END;
}

function sizeOk(ml: number): boolean {
  return ml >= BCRS_MIN_ML && ml <= BCRS_MAX_ML;
}

function materialOk(material: string): boolean {
  return material === "pet" || material === "aluminium" || material === "steel";
}

/**
 * Check a barcode against the local eligibility database.
 *
 * The database is the single source of truth:
 *   - Found + correct material/size + Deposit Mark → eligible
 *   - Found + wrong material or size → not eligible
 *   - Found + no Deposit Mark yet (transition period) → uncertain
 *   - NOT found in database → not eligible (not registered = not returnable)
 */
export function checkEligibility(
  barcode: string,
  db: EligibilityDatabase,
): EligibilityResult {
  const normalised = barcode.replace(/\s/g, "");
  const entry = db.entries.find((e) => e.barcode === normalised);

  // Not in the database → not eligible. Period.
  if (!entry) {
    return {
      verdict: "not_eligible",
      reason:
        "This barcode is not registered in the BCRS deposit database. Only registered products carry a 10-cent deposit.",
    };
  }

  // Wrong material
  if (!materialOk(entry.material)) {
    return {
      verdict: "not_eligible",
      reason: `Container material (${entry.material}) is not covered by BCRS. Only PET plastic, aluminium, and steel are eligible.`,
      entry,
    };
  }

  // Wrong size
  if (!sizeOk(entry.volumeMl)) {
    return {
      verdict: "not_eligible",
      reason: `Container size (${entry.volumeMl}ml) is outside the 150ml–3L BCRS range.`,
      entry,
    };
  }

  // Registered, right material/size, but no Deposit Mark yet
  if (!entry.hasDepositMark) {
    if (isInTransitionPeriod()) {
      return {
        verdict: "uncertain",
        reason: `${entry.productName ?? "This product"} is registered but does not yet carry a Deposit Mark. It should become eligible during the transition period (until 30 Sep 2026).`,
        entry,
      };
    }
    return {
      verdict: "not_eligible",
      reason: `This product is registered but does not carry a Deposit Mark. The transition period has ended.`,
      entry,
    };
  }

  // All checks pass
  return {
    verdict: "eligible",
    reason: `${entry.productName ?? "This container"} carries a 10-cent deposit. Return it to any Return Right RVM.`,
    entry,
  };
}

/**
 * Get a sample database for development/testing.
 */
export function getSampleDatabase(): EligibilityDatabase {
  return {
    version: 1,
    lastSynced: new Date().toISOString(),
    entries: [
      {
        barcode: "8888001234567",
        material: "pet",
        volumeMl: 500,
        hasDepositMark: true,
        productName: "Coca-Cola 500ml",
        producer: "Coca-Cola Singapore",
      },
      {
        barcode: "8888002345678",
        material: "aluminium",
        volumeMl: 330,
        hasDepositMark: true,
        productName: "Sprite Can 330ml",
        producer: "Coca-Cola Singapore",
      },
      {
        barcode: "8888003456789",
        material: "pet",
        volumeMl: 1500,
        hasDepositMark: true,
        productName: "Fanta 1.5L",
        producer: "Coca-Cola Singapore",
      },
      {
        barcode: "8888004567890",
        material: "glass",
        volumeMl: 330,
        hasDepositMark: false,
        productName: "Tiger Beer Bottle 330ml",
        producer: "Heineken Singapore",
      },
      {
        barcode: "8888005678901",
        material: "pet",
        volumeMl: 100,
        hasDepositMark: true,
        productName: "Yakult 100ml",
        producer: "Yakult Singapore",
      },
      {
        barcode: "8888006789012",
        material: "aluminium",
        volumeMl: 500,
        hasDepositMark: false,
        productName: "Monster Energy 500ml",
        producer: "Monster Beverage",
      },
    ],
  };
}
