/**
 * RevenueCat adapter. The public SDK key comes from VITE_REVENUECAT_IOS_KEY.
 * Missing key → purchases stay unavailable (fail closed). Never hard-code a price.
 */
import type { CustomerInfo, PurchasesStoreProduct } from '@revenuecat/purchases-capacitor';
import { grantsForProductIds, PRODUCT_IDS, type EntitlementCache } from '../game/entitlements';

export interface StoreListing {
  id: string;
  localizedPriceString: string;
  title: string;
}

let configured = false;
const products = new Map<string, PurchasesStoreProduct>();

function apiKey(): string {
  const key = import.meta.env.VITE_REVENUECAT_IOS_KEY?.trim() ?? '';
  return key;
}

export function purchasesConfigured(): boolean {
  return configured;
}

export async function configurePurchases(): Promise<boolean> {
  if (configured) return true;
  const key = apiKey();
  if (!key) return false;
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  await Purchases.configure({ apiKey: key });
  configured = true;
  return true;
}

export function cacheFromCustomerInfo(info: CustomerInfo): EntitlementCache {
  const active = info.entitlements.active;
  const ids = new Set<string>(info.allPurchasedProductIdentifiers ?? []);
  for (const tx of info.nonSubscriptionTransactions ?? []) ids.add(tx.productIdentifier);
  const fromEntitlements: string[] = [];
  if (active.mage) fromEntitlements.push('exitrush.char.mage');
  if (active.tech) fromEntitlements.push('exitrush.char.tech');
  if (active.noAds) fromEntitlements.push('exitrush.noads');
  return grantsForProductIds([...ids, ...fromEntitlements]);
}

export async function loadListings(): Promise<StoreListing[]> {
  if (!(await configurePurchases())) {
    return PRODUCT_IDS.map((id) => ({ id, localizedPriceString: '', title: '' }));
  }
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const { products: list } = await Purchases.getProducts({ productIdentifiers: [...PRODUCT_IDS] });
  products.clear();
  for (const p of list) products.set(p.identifier, p);
  return PRODUCT_IDS.map((id) => {
    const p = products.get(id);
    return { id, localizedPriceString: p?.priceString ?? '', title: p?.title ?? '' };
  });
}

export async function loadCustomerCache(): Promise<EntitlementCache | null> {
  if (!(await configurePurchases())) return null;
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const { customerInfo } = await Purchases.getCustomerInfo();
  return cacheFromCustomerInfo(customerInfo);
}

export async function buyProduct(productId: string): Promise<{
  result: 'ok' | 'cancelled' | 'pending' | 'error' | 'unavailable';
  cache: EntitlementCache | null;
}> {
  if (!(await configurePurchases())) return { result: 'unavailable', cache: null };
  let product = products.get(productId);
  if (!product) {
    await loadListings();
    product = products.get(productId);
  }
  if (!product) return { result: 'unavailable', cache: null };
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  try {
    const result = await Purchases.purchaseStoreProduct({ product });
    return { result: 'ok', cache: cacheFromCustomerInfo(result.customerInfo) };
  } catch (err) {
    const e = err as { userCancelled?: boolean | null; code?: string; readableErrorCode?: string };
    if (e?.userCancelled) return { result: 'cancelled', cache: null };
    // Ask to Buy / deferred StoreKit approval. Code "20" is PAYMENT_PENDING_ERROR.
    if (e?.code === '20' || e?.readableErrorCode === 'PAYMENT_PENDING_ERROR') {
      return { result: 'pending', cache: null };
    }
    return { result: 'error', cache: null };
  }
}

export async function restorePurchases(): Promise<EntitlementCache | null> {
  if (!(await configurePurchases())) return null;
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const { customerInfo } = await Purchases.restorePurchases();
  return cacheFromCustomerInfo(customerInfo);
}
