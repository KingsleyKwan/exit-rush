/**
 * Capacitor boot: status bar, pause/resume, keep-awake, native haptics.
 * Every plugin import is dynamic and only runs when the native runtime is injected.
 */
import { setNativeHaptics } from '../game/haptics';

export interface NativeGame {
  screen: string;
  noteOsBackground(): void;
  noteOsForeground(): void;
  audio: { unlock(): void };
}

function nativeRuntime(): boolean {
  try {
    const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return !!cap?.isNativePlatform?.();
  } catch {
    return false;
  }
}

export async function startNativeShell(game: NativeGame): Promise<void> {
  if (!nativeRuntime()) return;
  const [{ App }, { StatusBar, Style }, { Haptics, ImpactStyle, NotificationType }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/status-bar'),
    import('@capacitor/haptics'),
  ]);
  await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
  await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined);
  await App.addListener('pause', () => game.noteOsBackground());
  await App.addListener('resume', () => {
    game.noteOsForeground();
    // WKWebView can leave AudioContext 'interrupted' after a call. The next tap also unlocks.
    game.audio.unlock();
  });
  setNativeHaptics((pattern) => {
    if (Array.isArray(pattern)) {
      const fail = pattern.length > 2;
      void Haptics.notification({ type: fail ? NotificationType.Error : NotificationType.Success }).catch(() => undefined);
      return;
    }
    const style = pattern <= 15 ? ImpactStyle.Light : pattern <= 40 ? ImpactStyle.Medium : ImpactStyle.Heavy;
    void Haptics.impact({ style }).catch(() => undefined);
  });
}

let awake = false;

export function syncKeepAwake(screen: string): void {
  if (!nativeRuntime()) return;
  const want = screen === 'playing';
  if (want === awake) return;
  awake = want;
  void import('@capacitor-community/keep-awake')
    .then(({ KeepAwake }) => (want ? KeepAwake.keepAwake() : KeepAwake.allowSleep()))
    .catch(() => undefined);
}
