import { create } from 'zustand';
import { listAuditEntries } from '../db/repositories/auditRepo';
import { listJournalEntries } from '../db/repositories/journalEntriesRepo';
import { DATE_RANGE_ALL, type AuditEntry, type DateRange, type JournalEntry } from '../domain/accounting/types';
import { periodDateRange, currentPeriod } from '../lib/periods';
import { calculateAccountSummaries, type AccountSummary } from '../services/accounting/balanceCalculationService';

const AUDIT_LIMIT = 50;

interface AccountingState {
  summaries: AccountSummary[];
  entries: JournalEntry[];
  entriesRange: DateRange;
  audit: AuditEntry[];
  setEntriesRange: (range: DateRange) => void;
  refresh: () => void;
}

const DEFAULT_RANGE = periodDateRange(currentPeriod());

export const useAccountingStore = create<AccountingState>()((set, get) => ({
  summaries: [],
  entries: [],
  entriesRange: DEFAULT_RANGE,
  audit: [],
  setEntriesRange: (range) => {
    set({ entriesRange: range });
    get().refresh();
  },
  refresh: () => {
    const { entriesRange } = get();
    set({
      summaries: calculateAccountSummaries(DATE_RANGE_ALL.to, periodDateRange(currentPeriod())),
      entries: listJournalEntries(entriesRange),
      audit: listAuditEntries(AUDIT_LIMIT),
    });
  },
}));
