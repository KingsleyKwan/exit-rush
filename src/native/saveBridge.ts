import { SAVE_KEY } from '../game/storage';

function nativeRuntime(): boolean {
  try {
    const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return !!cap?.isNativePlatform?.();
  } catch {
    return false;
  }
}

/** Preferences is the source of truth on iOS. Web resolves immediately. */
export async function hydrateNativeSave(): Promise<void> {
  if (!nativeRuntime()) return;
  const { Preferences } = await import('@capacitor/preferences');
  const { value } = await Preferences.get({ key: SAVE_KEY });
  if (value) {
    localStorage.setItem(SAVE_KEY, value);
    return;
  }
  const local = localStorage.getItem(SAVE_KEY);
  if (local) await Preferences.set({ key: SAVE_KEY, value: local });
}

/** Fire-and-forget mirror. localStorage remains the synchronous copy the game reads. */
export function mirrorSaveToNative(json: string): void {
  if (!nativeRuntime()) return;
  void import('@capacitor/preferences')
    .then(({ Preferences }) => Preferences.set({ key: SAVE_KEY, value: json }))
    .catch(() => undefined);
}
