import { IS_STORE_BUILD } from './platform';
import type { CharacterId } from './charactersDef';

export type EntitlementId = 'mage' | 'tech' | 'noAds';

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
  products(): Promise<StoreProduct[]>;
  /** Placeholder — real IAP lands in Kingsley's local Grok Build. */
  buy(productId: string): Promise<BuyResult>;
  /** Placeholder restore hook for StoreKit / RevenueCat. */
  restore(): Promise<void>;
  /** True when Buy / Restore / Try UI should show. */
  showStoreUi: boolean;
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
  async products() {
    return [];
  },
  async buy() {
    return 'unavailable';
  },
  async restore() {},
};

/**
 * iOS / native placeholder. Owns nothing until Grok Build wires RevenueCat / StoreKit.
 * Cache on the save can grant offline play after a real purchase; this stub never does.
 */
function makeStoreEntitlements(cache?: { mage?: boolean; tech?: boolean; noAds?: boolean }): Entitlements {
  const owned = {
    mage: !!cache?.mage,
    tech: !!cache?.tech,
    noAds: !!cache?.noAds,
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
    async products() {
      // Placeholder strings — never hard-code real prices in UI; Grok Build replaces this.
      return [
        { id: 'exitrush.char.mage', localizedPriceString: 'HK$23', title: 'Bad Girl' },
        { id: 'exitrush.char.tech', localizedPriceString: 'HK$23', title: 'Gear L' },
        { id: 'exitrush.pack.chars', localizedPriceString: 'HK$38', title: 'Both characters' },
        { id: 'exitrush.noads', localizedPriceString: 'HK$23', title: 'Remove Ads' },
      ];
    },
    async buy(_productId) {
      // Hook point for Grok Build — no real purchase here.
      console.info('[exit-rush] IAP buy stub — wire in Grok Build:', _productId);
      return 'unavailable';
    },
    async restore() {
      console.info('[exit-rush] IAP restore stub — wire in Grok Build');
    },
  };
}

let _ents: Entitlements | null = null;

/** Call once after save load so iOS can honour entitlementCache offline. */
export function initEntitlements(cache?: { mage?: boolean; tech?: boolean; noAds?: boolean }): Entitlements {
  _ents = IS_STORE_BUILD ? makeStoreEntitlements(cache) : webDemoEntitlements;
  return _ents;
}

export function entitlements(): Entitlements {
  if (!_ents) _ents = initEntitlements();
  return _ents;
}
