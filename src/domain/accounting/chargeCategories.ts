export const CHARGE_CATEGORIES = ['operating', 'meter', 'maintenance', 'other', 'overpayment'] as const;

export type ChargeCategory = (typeof CHARGE_CATEGORIES)[number];
