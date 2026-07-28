// Lightweight WebAudio chime — no asset download, works offline.
let ctx: AudioContext | null = null;

const STORAGE_KEY = "momentum.notifications.sound";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) !== "off";
}

export function setSoundEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
}

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

/** Two-tone rising chime. Safe to call from any event; silently no-ops if blocked. */
export function playNotificationSound(variant: "default" | "urgent" = "default") {
  try {
    if (!isSoundEnabled()) return;
    const audio = getContext();
    if (!audio) return;
    if (audio.state === "suspended") void audio.resume();

    const now = audio.currentTime;
    const notes = variant === "urgent" ? [880, 660, 880] : [660, 990];

    notes.forEach((freq, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.11);
      gain.gain.setValueAtTime(0.0001, now + i * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.14, now + i * 0.11 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.11 + 0.28);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + i * 0.11);
      osc.stop(now + i * 0.11 + 0.3);
    });
  } catch {
    /* audio is a nice-to-have */
  }
}
