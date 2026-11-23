import { useEffect } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';
import { useApartmentsStore } from '../stores/apartmentsStore';
import { useChargesStore } from '../stores/chargesStore';
import { usePaymentsStore } from '../stores/paymentsStore';
import { useMetersStore } from '../stores/metersStore';
import { useBillingStore } from '../stores/billingStore';
import { useAccountingStore } from '../stores/accountingStore';

/** Re-computes dashboard numbers whenever any underlying data changes. */
export function useDashboardSync() {
  const refreshDashboard = useDashboardStore((state) => state.refresh);
  const apartments = useApartmentsStore((state) => state.items);
  const chargeTypes = useChargesStore((state) => state.chargeTypes);
  const payments = usePaymentsStore((state) => state.payments);
  const meters = useMetersStore((state) => state.latestSummaries);
  const billingCharges = useBillingStore((state) => state.charges);
  const accountingEntries = useAccountingStore((state) => state.entries);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard, apartments, chargeTypes, payments, meters, billingCharges, accountingEntries]);
}
