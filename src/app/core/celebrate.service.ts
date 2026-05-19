import { Injectable } from '@angular/core';
import confetti from 'canvas-confetti';

/**
 * Tasteful celebrations keyed to the rise.ph palette. Keep usage rare — the
 * dopamine wears off if every click triggers a burst. Use only on moments
 * that genuinely deserve a "yay".
 */
@Injectable({ providedIn: 'root' })
export class CelebrateService {
  private static readonly COLORS = [
    '#ff4d6d', // rise pink (primary)
    '#ff9aab', // pink soft
    '#5ba7ff', // cyan
    '#c4b5fd', // purple
    '#86efac', // mint
    '#fbbf24', // gold
  ];

  /**
   * Two-cannon burst inward from the lower-left and lower-right edges of the
   * viewport. Fires when a recognition is posted.
   */
  recognition(): void {
    if (this.prefersReducedMotion()) return;
    const colors = CelebrateService.COLORS;

    confetti({
      particleCount: 70,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.8 },
      startVelocity: 55,
      gravity: 1.1,
      ticks: 220,
      colors,
      disableForReducedMotion: true,
    });

    confetti({
      particleCount: 70,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.8 },
      startVelocity: 55,
      gravity: 1.1,
      ticks: 220,
      colors,
      disableForReducedMotion: true,
    });

    // A soft top-of-screen sprinkle a beat later for an extra "yay".
    setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 270,
        spread: 100,
        origin: { x: 0.5, y: 0 },
        startVelocity: 35,
        gravity: 0.8,
        ticks: 260,
        colors,
        disableForReducedMotion: true,
      });
    }, 250);
  }

  /**
   * Localized burst centered on the supplied element (typically the
   * Redeem button). Smaller and gold/pink toned for the "treat unlocked"
   * feeling.
   */
  redemption(anchor: HTMLElement | null | undefined): void {
    if (this.prefersReducedMotion()) return;
    const rect = anchor?.getBoundingClientRect();
    const origin = rect
      ? {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        }
      : { x: 0.5, y: 0.6 };

    confetti({
      particleCount: 90,
      spread: 100,
      origin,
      startVelocity: 35,
      gravity: 1.0,
      ticks: 220,
      colors: ['#ff4d6d', '#ff9aab', '#fbbf24', '#86efac'],
      shapes: ['circle', 'square'],
      disableForReducedMotion: true,
    });
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }
}
