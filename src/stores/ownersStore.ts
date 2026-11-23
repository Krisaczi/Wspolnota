import { create } from 'zustand';
import { listApartments } from '../db/repositories/apartmentsRepo';
import { deleteOwner, insertOwner, listOwners, updateOwner, type OwnerInput } from '../db/repositories/ownersRepo';
import { listTransfersForOwner, type OwnershipTransferView } from '../db/repositories/ownershipRepo';
import { transferApartment, type TransferInput } from '../services/transferService';
import type { OwnerView } from '../domain/types';

interface OwnersState {
  items: OwnerView[];
  refresh: () => void;
  save: (input: OwnerInput, id: number | null) => void;
  remove: (id: number) => void;
  transfer: (input: TransferInput) => void;
  getHistory: (ownerId: number) => OwnershipTransferView[];
}

export const useOwnersStore = create<OwnersState>()((set, get) => ({
  items: [],
  refresh: () => {
    const apartments = listApartments();
    set({
      items: listOwners().map((owner) => ({
        ...owner,
        apartments: apartments
          .filter((apartment) => apartment.ownerId === owner.id)
          .map((apartment) => ({ id: apartment.id, apartmentNumber: apartment.apartmentNumber })),
      })),
    });
  },
  save: (input, id) => {
    if (id === null) insertOwner(input);
    else updateOwner(id, input);
    get().refresh();
  },
  remove: (id) => {
    deleteOwner(id);
    get().refresh();
  },
  transfer: (input) => {
    transferApartment(input);
    get().refresh();
  },
  getHistory: (ownerId) => listTransfersForOwner(ownerId),
}));
