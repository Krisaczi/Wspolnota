import type { ComponentType } from 'react';
import type { ModuleId } from './navigation';
import { DashboardPage } from '../modules/dashboard/DashboardPage';
import { ApartmentsPage } from '../modules/apartments/ApartmentsPage';
import { OwnersPage } from '../modules/owners/OwnersPage';
import { ChargesPage } from '../modules/charges/ChargesPage';
import { MonthlyBillingPage } from '../modules/billing/MonthlyBillingPage';
import { PaymentsPage } from '../modules/payments/PaymentsPage';
import { SettlementsPage } from '../modules/settlements/SettlementsPage';
import { AccountingPage } from '../modules/accounting/AccountingPage';
import { ReportsPage } from '../modules/reports/ReportsPage';
import { SettingsPage } from '../modules/settings/SettingsPage';

export const MODULE_PAGES: Record<ModuleId, ComponentType> = {
  dashboard: DashboardPage,
  apartments: ApartmentsPage,
  owners: OwnersPage,
  charges: ChargesPage,
  billing: MonthlyBillingPage,
  payments: PaymentsPage,
  settlements: SettlementsPage,
  accounting: AccountingPage,
  reports: ReportsPage,
  settings: SettingsPage,
};
