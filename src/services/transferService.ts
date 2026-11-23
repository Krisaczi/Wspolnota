import i18n from '../i18n';
import { findApartment, setApartmentOwner } from '../db/repositories/apartmentsRepo';
import { listOwners } from '../db/repositories/ownersRepo';
import { insertTransfer } from '../db/repositories/ownershipRepo';
import { withTransaction } from '../db/client';
import { AppError } from '../lib/errors';

export interface TransferInput {
  apartmentId: number;
  toOwnerId: number;
  transferDate: string;
  note: string | null;
}

export function transferApartment(input: TransferInput): void {
  withTransaction(() => {
    const apartment = findApartment(input.apartmentId);
    if (!apartment) throw new AppError(i18n.t('serviceErrors.apartmentMissing'));
    if (!listOwners().some((owner) => owner.id === input.toOwnerId)) {
      throw new AppError(i18n.t('serviceErrors.newOwnerMissing'));
    }
    if (apartment.ownerId === input.toOwnerId) {
      throw new AppError(i18n.t('serviceErrors.alreadyOwner'));
    }

    insertTransfer({
      apartmentId: input.apartmentId,
      fromOwnerId: apartment.ownerId,
      toOwnerId: input.toOwnerId,
      transferDate: input.transferDate,
      note: input.note,
    });
    setApartmentOwner(input.apartmentId, input.toOwnerId);
  });
}
