import i18n from '../../i18n';
import { isValidDate } from '../../lib/periods';
import type { OwnerInput } from '../../db/repositories/ownersRepo';
import type { ApartmentInput } from '../../db/repositories/apartmentsRepo';
import {
  fail,
  isEmail,
  optionalText,
  parseNonNegativeNumber,
  parseSignedNumber,
  parseWholeNumber,
  requireText,
  type FieldErrors,
  type ValidationResult,
} from './common';

export interface OwnerFormValues {
  fullName: string;
  email: string;
  phone: string;
  address: string;
}

export interface ApartmentFormValues {
  apartmentNumber: string;
  ownerId: string;
  areaM2: string;
  residentsCount: string;
  shareRatio: string;
  startingBalance: string;
  active: boolean;
}

export interface TransferFormValues {
  apartmentId: string;
  toOwnerId: string;
  transferDate: string;
  note: string;
}

export function validateOwner(values: OwnerFormValues): ValidationResult<OwnerInput> {
  const errors: FieldErrors = {};
  const fullName = requireText(values.fullName, i18n.t('validation.labels.fullName'), errors, 'fullName');
  const email = optionalText(values.email, errors, 'email', i18n.t('validation.labels.email'));
  if (email !== null && !isEmail(email)) errors.email = i18n.t('validation.email');
  const phone = optionalText(values.phone, errors, 'phone', i18n.t('validation.labels.phone'), 40);
  const address = optionalText(values.address, errors, 'address', i18n.t('validation.labels.address'), 300);
  if (Object.keys(errors).length > 0) return fail(errors);
  return { ok: true, data: { fullName, email, phone, address } };
}

export function validateApartment(
  values: ApartmentFormValues,
  takenNumbers: string[],
): ValidationResult<ApartmentInput> {
  const errors: FieldErrors = {};
  const apartmentNumber = requireText(
    values.apartmentNumber,
    i18n.t('validation.labels.apartmentNumber'),
    errors,
    'apartmentNumber',
    20,
  );
  if (apartmentNumber && takenNumbers.some((number) => number.toLowerCase() === apartmentNumber.toLowerCase())) {
    errors.apartmentNumber = i18n.t('validation.duplicateApartmentNumber');
  }
  const areaM2 = parseNonNegativeNumber(values.areaM2, i18n.t('validation.labels.area'), errors, 'areaM2', { positive: true });
  const residentsCount = parseWholeNumber(
    values.residentsCount,
    i18n.t('validation.labels.residentsCount'),
    errors,
    'residentsCount',
  );
  const shareRatio = parseNonNegativeNumber(values.shareRatio, i18n.t('validation.labels.shareRatio'), errors, 'shareRatio');
  const startingBalance = parseSignedNumber(
    values.startingBalance,
    i18n.t('validation.labels.startingBalance'),
    errors,
    'startingBalance',
  );
  if (Object.keys(errors).length > 0) return fail(errors);
  return {
    ok: true,
    data: {
      apartmentNumber,
      ownerId: values.ownerId ? Number(values.ownerId) : null,
      areaM2,
      residentsCount,
      shareRatio,
      startingBalance,
      active: values.active,
    },
  };
}

export function validateTransfer(
  values: TransferFormValues,
  currentOwnerId: number | null,
): ValidationResult<{ apartmentId: number; toOwnerId: number; transferDate: string; note: string | null }> {
  const errors: FieldErrors = {};
  if (!values.apartmentId) errors.apartmentId = i18n.t('validation.selectApartment');
  if (!values.toOwnerId) errors.toOwnerId = i18n.t('validation.selectNewOwner');
  else if (Number(values.toOwnerId) === currentOwnerId) errors.toOwnerId = i18n.t('validation.sameOwner');
  if (!isValidDate(values.transferDate)) errors.transferDate = i18n.t('validation.transferDate');
  const note = optionalText(values.note, errors, 'note', i18n.t('validation.labels.note'), 300);
  if (Object.keys(errors).length > 0) return fail(errors);
  return {
    ok: true,
    data: {
      apartmentId: Number(values.apartmentId),
      toOwnerId: Number(values.toOwnerId),
      transferDate: values.transferDate,
      note,
    },
  };
}
