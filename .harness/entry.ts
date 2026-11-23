import { openDatabase, queryRows, execute, withTransaction } from '../src/db/client';
import { saveAccount, setAccountArchived, removeAccount, postJournalEntry, reverseJournalEntry } from '../src/services/accounting/accountingService';
import { savePayment, removePayment } from '../src/services/accounting/paymentPosting';
import { calculateDashboardMetrics, calculateLedger } from '../src/services/accounting/balanceCalculationService';
import { buildTrialBalance, buildAccountStatement, buildMonthlyProfitAndLoss, buildCashMovement, buildExpenseSummary } from '../src/services/accounting/reportingService';
import { findAccountByCode, listAccounts } from '../src/db/repositories/accountsRepo';
import { listJournalEntries } from '../src/db/repositories/journalEntriesRepo';
import { todayIso, currentPeriod, periodDateRange } from '../src/lib/periods';

let failures = 0;
function check(name: string, condition: boolean, detail = '') {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name} ${detail}`);
  if (!condition) failures += 1;
}
const id = (code: string) => findAccountByCode(code)!.id;
const today = todayIso();

async function main() {
  await openDatabase();
  check('16 default accounts seeded', listAccounts().length === 16, `(${listAccounts().length})`);
  check('all defaults are system accounts', listAccounts().every((a) => a.systemAccount));
  check('user_version is 2', Number(queryRows('PRAGMA user_version')[0].user_version) === 2);

  check('duplicate code rejected', !saveAccount({ code: '4010', name: 'X', type: 'EXPENSE' }, null).ok);
  const created = saveAccount({ code: 'U-100', name: 'Roof Works', type: 'EXPENSE' }, null);
  check('user account created', created.ok);
  const roofId = created.ok ? created.data : -1;
  check('user account without transactions can be deleted', (() => { removeAccount(roofId); return findAccountByCode('U-100') === null; })());
  check('system account cannot be deleted', (() => { try { removeAccount(id('4010')); return false; } catch { return true; } })());
  check('system account cannot be archived', (() => { try { setAccountArchived(id('1010'), true); return false; } catch { return true; } })());

  const unbalanced = postJournalEntry({ entryDate: today, description: 'bad', lines: [
    { accountId: id('4010'), debitAmount: 500, creditAmount: 0 },
    { accountId: id('2020'), debitAmount: 0, creditAmount: 400 },
  ] });
  check('unbalanced entry rejected', !unbalanced.ok);
  const oneSided = postJournalEntry({ entryDate: today, description: 'bad2', lines: [
    { accountId: id('4010'), debitAmount: 500, creditAmount: 500 },
    { accountId: id('2020'), debitAmount: 0, creditAmount: 0 },
  ] });
  check('line with both sides rejected', !oneSided.ok);

  const invoice = postJournalEntry({ entryDate: today, description: 'Cleaning invoice', lines: [
    { accountId: id('4010'), debitAmount: 500, creditAmount: 0 },
    { accountId: id('2020'), debitAmount: 0, creditAmount: 500 },
  ] });
  check('supplier invoice posted', invoice.ok);
  const invoiceId = invoice.ok ? invoice.data : -1;

  const supplierPay = postJournalEntry({ entryDate: today, description: 'Pay cleaning', lines: [
    { accountId: id('2020'), debitAmount: 500, creditAmount: 0 },
    { accountId: id('1010'), debitAmount: 0, creditAmount: 500 },
  ] });
  check('supplier payment posted', supplierPay.ok);

  const cashOut = postJournalEntry({ entryDate: today, description: 'Cash withdrawal', lines: [
    { accountId: id('1020'), debitAmount: 200, creditAmount: 0 },
    { accountId: id('1010'), debitAmount: 0, creditAmount: 200 },
  ] });
  check('cash withdrawal posted', cashOut.ok);

  if (queryRows('SELECT id FROM apartments LIMIT 1').length === 0) {
    execute("INSERT INTO owners (full_name) VALUES ('Test Owner')");
    execute("INSERT INTO apartments (apartment_number, owner_id, area_m2, residents_count, share_ratio) VALUES ('1A', 1, 50, 2, 0.1)");
  }
  const apartmentId = Number(queryRows('SELECT id FROM apartments LIMIT 1')[0].id);

  savePayment({ apartmentId, paymentDate: today, amount: 700, description: null }, null);
  const paymentId = Number(queryRows('SELECT MAX(id) AS id FROM payments')[0].id);
  let metrics = calculateDashboardMetrics(currentPeriod());
  check('bank after owner payment 700', metrics.bankBalance === 700 - 500 - 200, `(${metrics.bankBalance})`);

  savePayment({ apartmentId, paymentDate: today, amount: 800, description: 'Corrected' }, paymentId);
  metrics = calculateDashboardMetrics(currentPeriod());
  check('editing payment replaces entry (bank 100)', metrics.bankBalance === 100, `(${metrics.bankBalance})`);
  check('cash balance 200', metrics.cashBalance === 200, `(${metrics.cashBalance})`);
  check('payables settled to 0', metrics.payables === 0, `(${metrics.payables})`);
  check('monthly income 800 from edited payment', metrics.monthlyIncome === 800, `(${metrics.monthlyIncome})`);
  check('monthly expenses 500', metrics.monthlyExpenses === 500, `(${metrics.monthlyExpenses})`);
  check('net result 300', metrics.netResult === 300, `(${metrics.netResult})`);

  removePayment(paymentId);
  metrics = calculateDashboardMetrics(currentPeriod());
  check('deleting payment reverses it (bank -700)', metrics.bankBalance === -700, `(${metrics.bankBalance})`);

  check('invoice cannot be reversed twice', (() => {
    reverseJournalEntry(invoiceId);
    try { reverseJournalEntry(invoiceId); return false; } catch { return true; }
  })());

  const tb = buildTrialBalance(today);
  check('trial balance balanced', tb.summary.some((item) => item.value === 'Balanced'));

  const range = { from: `${today.slice(0, 8)}01`, to: today };
  const ledger = calculateLedger(range, id('1010'));
  check('ledger running balance ends at bank balance', ledger.length > 0 && ledger[ledger.length - 1].runningBalance === -700, `(${ledger[ledger.length - 1]?.runningBalance})`);
  check('account statement builds', buildAccountStatement(id('1010'), range).tables[0].rows.length === ledger.length);
  check('monthly P&L builds', buildMonthlyProfitAndLoss(range).tables[0].rows.length >= 1);
  check('cash movement builds', buildCashMovement(periodDateRange(currentPeriod())).tables[0].rows.length >= 1);
  check('expense summary builds', buildExpenseSummary(range).tables[0].rows.length >= 1);

  check('nested transaction rolls back inner work', (() => {
    const before = listJournalEntries(range).length;
    try {
      withTransaction(() => {
        postJournalEntry({ entryDate: today, description: 'outer', lines: [
          { accountId: id('4010'), debitAmount: 10, creditAmount: 0 },
          { accountId: id('2020'), debitAmount: 0, creditAmount: 10 },
        ] });
        throw new Error('force rollback');
      });
    } catch { /* expected */ }
    return listJournalEntries(range).length === before;
  })());

  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('HARNESS ERROR', error);
  process.exit(1);
});
