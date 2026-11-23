export type CalculationMethod = 'per_sqm' | 'per_resident' | 'fixed' | 'percentage';

export interface Owner {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface Apartment {
  id: number;
  apartmentNumber: string;
  ownerId: number | null;
  areaM2: number;
  residentsCount: number;
  shareRatio: number;
  active: boolean;
  startingBalance: number;
}

export interface ChargeType {
  id: number;
  name: string;
  calculationMethod: CalculationMethod;
  rate: number;
  active: boolean;
}

export interface MonthlyCharge {
  id: number;
  apartmentId: number;
  chargeTypeId: number;
  billingPeriod: string;
  amount: number;
}

export interface Payment {
  id: number;
  apartmentId: number;
  paymentDate: string;
  amount: number;
  description: string | null;
}

export interface MeterType {
  id: number;
  name: string;
}

export interface MeterReading {
  id: number;
  apartmentId: number;
  meterTypeId: number;
  readingDate: string;
  readingValue: number;
  rate: number | null;
  advanceMonths: number;
  advanceMonthlyAmount: number;
}

export interface OwnershipTransfer {
  id: number;
  apartmentId: number;
  fromOwnerId: number | null;
  toOwnerId: number;
  transferDate: string;
  note: string | null;
}

export interface AppSettings {
  communityName: string;
  currency: string;
}

export interface ApartmentView extends Apartment {
  ownerName: string | null;
  balance: number;
}

export interface OwnerView extends Owner {
  apartments: { id: number; apartmentNumber: string }[];
}

export interface ChargeView extends MonthlyCharge {
  apartmentNumber: string;
  chargeTypeName: string;
}

export interface PaymentView extends Payment {
  apartmentNumber: string;
}

export interface ReadingView extends MeterReading {
  apartmentNumber: string;
  meterTypeName: string;
}

export interface InterestRate {
  id: number;
  apartmentId: number;
  billingPeriod: string;
  annualRate: number;
  countingStartDate: string;
}

export interface InterestResult {
  period: string;
  rate: number;
  countingStartDate: string;
  days: number;
  interest: number;
}
