import i18n from '../../i18n';

export type FieldErrors = Record<string, string>;

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

export function fail<T>(errors: FieldErrors): ValidationResult<T> {
  return { ok: false, errors };
}

export function firstError(errors: FieldErrors): string {
  return Object.values(errors)[0] ?? i18n.t('validation.fallbackSave');
}

export function requireText(value: string, label: string, errors: FieldErrors, field: string, max = 120): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) errors[field] = i18n.t('validation.required', { label });
  else if (trimmed.length > max) errors[field] = i18n.t('validation.maxLength', { label, max });
  return trimmed;
}

export function optionalText(value: string, errors: FieldErrors, field: string, label: string, max = 200): string | null {
  const trimmed = value.trim();
  if (trimmed.length > max) errors[field] = i18n.t('validation.maxLength', { label, max });
  return trimmed.length === 0 ? null : trimmed;
}

export function parseNonNegativeNumber(
  value: string,
  label: string,
  errors: FieldErrors,
  field: string,
  options: { required?: boolean; positive?: boolean } = {},
): number {
  const parsed = parseNumberAllowingNegative(value, label, errors, field, options);
  if (parsed === null || parsed > 0) return parsed ?? 0;
  if (parsed < 0) {
    errors[field] = i18n.t('validation.negative', { label });
    return 0;
  }
  return parsed;
}

export function parseSignedNumber(value: string, label: string, errors: FieldErrors, field: string): number {
  return parseNumberAllowingNegative(value, label, errors, field) ?? 0;
}

function parseNumberAllowingNegative(
  value: string,
  label: string,
  errors: FieldErrors,
  field: string,
  options: { required?: boolean; positive?: boolean } = {},
): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (trimmed.length === 0) {
    if (options.required !== false) errors[field] = i18n.t('validation.required', { label });
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    errors[field] = i18n.t('validation.mustBeNumber', { label });
    return null;
  }
  if (options.positive && parsed === 0) {
    errors[field] = i18n.t('validation.mustBePositive', { label });
    return null;
  }
  return parsed;
}

export function parseWholeNumber(value: string, label: string, errors: FieldErrors, field: string): number {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    errors[field] = i18n.t('validation.required', { label });
    return 0;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    errors[field] = i18n.t('validation.wholeNumber', { label });
    return 0;
  }
  return parsed;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
