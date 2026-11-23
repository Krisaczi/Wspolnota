import { toFriendlyMessage } from './errors';
import { toast } from '../stores/toastStore';

export type AttemptOutcome<T> = { ok: true; value: T } | { ok: false };

export function attempt<T>(operation: () => T, successMessage?: string): AttemptOutcome<T> {
  try {
    const value = operation();
    if (successMessage) toast.success(successMessage);
    return { ok: true, value };
  } catch (error) {
    toast.error(toFriendlyMessage(error));
    return { ok: false };
  }
}
