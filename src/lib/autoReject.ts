import { checkAndProcessAutoRejectionsLocal } from './storage';

export const AUTO_REJECT_MS = 48 * 60 * 60 * 1000; // 48 Hours

/**
 * Checks pending/under-review applications and automatically rejects those older than 48 hours.
 * Returns the count of processed auto-rejections.
 */
export async function checkAndProcessAutoRejections(): Promise<number> {
  try {
    return checkAndProcessAutoRejectionsLocal();
  } catch (err) {
    console.warn('Auto-rejection check error:', err);
    return 0;
  }
}
