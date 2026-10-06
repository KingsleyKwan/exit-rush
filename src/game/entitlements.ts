import { IS_STORE_BUILD } from './platform';
import type { CharacterId } from './charactersDef';

export type EntitlementId = 'mage' | 'tech' | 'noAds';

export interface EntitlementCache {
  mage: boolean;
  tech: boolean;
  noAds: boolean;
}

export interface StoreProduct {
  id: string;
  localizedPriceString: string;
  title: string;
}

export type BuyResult = 'ok' | 'cancelled' | 'pending' | 'error' | 'unavailable';

export interface Entitlements {
  owns(e: EntitlementId): boolean;
  /** Character is playable (web unlocks all; iOS needs entitlement or free hero). */
  canPlay(id: CharacterId): boolean;
  /** Interstitials are off after any character purchase or the no-ads product. */
  interstitialsOff(): boolean;
  products(): Promise<StoreProduct[]>;
  buy(productId: string): Promise<BuyResult>;
  /** Restored purchases, or null when the store isn't configured. */
  restore(): Promise<EntitlementCache | null>;
  /** Pull StoreKit / RevenueCat and update the cache. No-op on web. */
  refresh(): Promise<void>;
  /** True when Buy / Restore / Try UI should show. */
  showStoreUi: boolean;
}

/** Product ids. The pack is its own non-consumable (Apple has no IAP bundle type). */
export const PRODUCT_IDS = [
  'exitrush.char.mage',
  'exitrush.char.tech',
  'exitrush.pack.chars',
  'exitrush.noads',
] as const;

/**
 * What a set of owned product ids grants.
 * Any character purchase also removes interstitials. The pack grants both characters.
 */
export function grantsForProductIds(productIds: readonly string[]): EntitlementCache {
  const ids = new Set(productIds);
  const mage = ids.has('exitrush.char.mage') || ids.has('exitrush.pack.chars');
  const tech = ids.has('exitrush.char.tech') || ids.has('exitrush.pack.chars');
  const noAds = ids.has('exitrush.noads') || mage || tech;
  return { mage, tech, noAds };
}

/** Web / Pages demo: everything unlocked, no IAP UI, no ads. */
const webDemoEntitlements: Entitlements = {
  showStoreUi: false,
  owns() {
    return true;
  },
  canPlay() {
    return true;
  },
  interstitialsOff() {
    return true;
  },
  async products() {
    return [];
  },
  async buy() {
    return 'unavailable';
  },
  async restore() {
    return null;
  },
  async refresh() {},
};

type Persist = (cache: EntitlementCache) => void;
let persistCache: Persist | null = null;

/** Game registers this so a purchase updates the save. */
export function setEntitlementPersister(fn: Persist | null): void {
  persistCache = fn;
}

/**
 * iOS / native. Starts from the on-device cache (offline). StoreKit is source of truth
 * once RevenueCat is configured. No prices are hard-coded.
 */
function makeStoreEntitlements(cache?: Partial<EntitlementCache>): Entitlements {
  const owned: EntitlementCache = {
    mage: !!cache?.mage,
    tech: !!cache?.tech,
    noAds: !!cache?.noAds || !!cache?.mage || !!cache?.tech,
  };
  const apply = (next: EntitlementCache) => {
    owned.mage = next.mage;
    owned.tech = next.tech;
    owned.noAds = next.noAds || next.mage || next.tech;
    persistCache?.(owned);
  };
  return {
    showStoreUi: true,
    owns(e) {
      return owned[e];
    },
    canPlay(id) {
      if (id === 'hero') return true;
      if (id === 'mage') return owned.mage;
      if (id === 'tech') return owned.tech;
      return false;
    },
    interstitialsOff() {
      return owned.noAds || owned.mage || owned.tech;
    },
    async products() {
      try {
        const { loadListings } = await import('../native/purchases');
        return loadListings();
      } catch {
        return PRODUCT_IDS.map((id) => ({ id, localizedPriceString: '', title: '' }));
      }
    },
    async buy(productId) {
      try {
        const { buyProduct } = await import('../native/purchases');
        const bought = await buyProduct(productId);
        if (bought.cache) apply(bought.cache);
        return bought.result;
      } catch {
        return 'error';
      }
    },
    async restore() {
      try {
        const { restorePurchases } = await import('../native/purchases');
        const cache = await restorePurchases();
        if (cache) apply(cache);
        return cache;
      } catch {
        return null;
      }
    },
    async refresh() {
      try {
        const { loadCustomerCache } = await import('../native/purchases');
        const cache = await loadCustomerCache();
        if (cache) apply(cache);
      } catch {
        /* keep the offline cache */
      }
    },
  };
}

let _ents: Entitlements | null = null;

/** Call once after save load so iOS can honour entitlementCache offline. */
export function initEntitlements(cache?: Partial<EntitlementCache>): Entitlements {
  _ents = IS_STORE_BUILD ? makeStoreEntitlements(cache) : webDemoEntitlements;
  return _ents;
}

export function entitlements(): Entitlements {
  if (!_ents) _ents = initEntitlements();
  return _ents;
}
