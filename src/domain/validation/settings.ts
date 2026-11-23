import i18n from '../../i18n';
import type { AppSettings } from '../types';
import { fail, requireText, type FieldErrors, type ValidationResult } from './common';

export type SettingsFormValues = { [K in keyof AppSettings]: string };

export function validateSettings(values: SettingsFormValues): ValidationResult<AppSettings> {
  const errors: FieldErrors = {};
  const communityName = requireText(
    values.communityName,
    i18n.t('validation.labels.communityName'),
    errors,
    'communityName',
    120,
  );
  const currency = values.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) errors.currency = i18n.t('validation.currency');

  if (Object.keys(errors).length > 0) return fail(errors);
  return { ok: true, data: { communityName, currency } };
}
