import i18n from '../../i18n';
import { listApartments, type ApartmentRecord } from '../../db/repositories/apartmentsRepo';
import { listChargesInRange, sumChargesByApartment } from '../../db/repositories/monthlyChargesRepo';
import { listPayments } from '../../db/repositories/paymentsRepo';
import { receivablePaymentsByApartment, allocationSumsByApartment } from '../../db/repositories/paymentAllocationsRepo';
import { listOwners } from '../../db/repositories/ownersRepo';
import { listInterestRates } from '../../db/repositories/interestRatesRepo';
import { calculateBalance, summarizeBalances } from '../../domain/balances';
import { calculateTotalInterest } from '../../domain/interest';
import type { ChargeView, PaymentView } from '../../domain/types';
import { roundMoney } from '../../lib/money';
import { formatPeriod, periodDateRange, todayIso } from '../../lib/periods';
import type { ReportDocument, ReportSummaryItem, ReportTable } from './types';
import { createReportContext as createContext, money, type ReportContext } from './reportContext';

interface PeriodRange {
  from: string;
  to: string;
}

function rangeLabel(range: PeriodRange): string {
  return range.from === range.to
    ? formatPeriod(range.to)
    : i18n.t('reports.rangeLabel', { from: formatPeriod(range.from), to: formatPeriod(range.to) });
}

function sumAmounts<T extends { amount: number }>(items: T[]): number {
  return roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
}

/** Interest counts to today, or to the end of the report month when it is in the past. */
function interestAsOfDate(period: string): string {
  const end = periodDateRange(period).to;
  return end >= todayIso() ? todayIso() : end;
}

function chargesTable(charges: ChargeView[]): ReportTable {
  return {
    heading: i18n.t('reportDocument.tables.charges'),
    columns: [
      i18n.t('reportDocument.columns.period'),
      i18n.t('reportDocument.columns.apartment'),
      i18n.t('reportDocument.columns.charge'),
      i18n.t('reportDocument.columns.amount'),
    ],
    rows: charges.map((charge) => [charge.billingPeriod, charge.apartmentNumber, charge.chargeTypeName, charge.amount]),
  };
}

function paymentsTable(payments: PaymentView[]): ReportTable {
  return {
    heading: i18n.t('reportDocument.tables.payments'),
    columns: [
      i18n.t('reportDocument.columns.date'),
      i18n.t('reportDocument.columns.apartment'),
      i18n.t('reportDocument.columns.description'),
      i18n.t('reportDocument.columns.amount'),
    ],
    rows: payments.map((payment) => [
      payment.paymentDate,
      payment.apartmentNumber,
      payment.description ?? '',
      payment.amount,
    ]),
  };
}

function buildStatement(
  title: string,
  subtitle: string,
  fileName: string,
  apartments: ApartmentRecord[],
  range: PeriodRange,
  context: ReportContext,
): ReportDocument {
  const apartmentIds = new Set(apartments.map((apartment) => apartment.id));
  const charges = listChargesInRange(range.from, range.to).filter((charge) => apartmentIds.has(charge.apartmentId));
  const payments = listPayments({ fromMonth: range.from, toMonth: range.to }).filter((payment) =>
    apartmentIds.has(payment.apartmentId),
  );
  const chargesAtEnd = sumChargesByApartment(range.to);
  const paymentsAtEnd = receivablePaymentsByApartment(range.to);
  const prepaymentsAtEnd = allocationSumsByApartment(['overpayment'], range.to);
  const asOfDate = interestAsOfDate(range.to);

  const perApartment = apartments.map((apartment) => {
    const balanceAtEnd =
      calculateBalance(
        chargesAtEnd.get(apartment.id) ?? 0,
        paymentsAtEnd.get(apartment.id) ?? 0,
        apartment.startingBalance,
      ) - (prepaymentsAtEnd.get(apartment.id) ?? 0);
    const interest = calculateTotalInterest(
      Math.max(0, balanceAtEnd),
      listInterestRates(apartment.id),
      asOfDate,
    );
    return [
      apartment.apartmentNumber,
      sumAmounts(charges.filter((charge) => charge.apartmentId === apartment.id)),
      sumAmounts(payments.filter((payment) => payment.apartmentId === apartment.id)),
      balanceAtEnd,
      interest,
    ];
  });
  const totalCharged = sumAmounts(charges);
  const totalPaid = sumAmounts(payments);
  const totalBalance = roundMoney(perApartment.reduce((sum, row) => sum + Number(row[3]), 0));
  const totalInterest = roundMoney(perApartment.reduce((sum, row) => sum + Number(row[4]), 0));

  return {
    title,
    subtitle,
    generatedAt: context.generatedAt,
    fileName,
    summary: [
      { label: i18n.t('reportDocument.summary.period'), value: rangeLabel(range) },
      { label: i18n.t('reportDocument.summary.chargedInPeriod'), value: money(totalCharged, context) },
      { label: i18n.t('reportDocument.summary.paidInPeriod'), value: money(totalPaid, context) },
      { label: i18n.t('reportDocument.summary.balanceAtEnd'), value: money(totalBalance, context) },
      { label: i18n.t('reportDocument.summary.totalInterest'), value: money(totalInterest, context) },
    ],
    tables: [
      {
        heading: i18n.t('reportDocument.tables.apartments'),
        columns: [
          i18n.t('reportDocument.columns.apartment'),
          i18n.t('reportDocument.columns.chargedInPeriod'),
          i18n.t('reportDocument.columns.paidInPeriod'),
          i18n.t('reportDocument.columns.balanceAtEnd'),
          i18n.t('reportDocument.columns.interest'),
        ],
        rows: perApartment,
      },
      chargesTable(charges),
      paymentsTable(payments),
    ],
  };
}

export function buildOwnerStatement(ownerId: number, range: PeriodRange): ReportDocument {
  const context = createContext();
  const owner = listOwners().find((item) => item.id === ownerId);
  if (!owner) throw new Error(i18n.t('serviceErrors.ownerNotFound'));
  const apartments = listApartments().filter((apartment) => apartment.ownerId === ownerId);
  return buildStatement(
    i18n.t('reportDocument.titles.owner'),
    i18n.t('reportDocument.subtitles.owner', { name: owner.fullName, community: context.communityName }),
    `owner-statement-${owner.fullName}-${range.to}`,
    apartments,
    range,
    context,
  );
}

export function buildApartmentStatement(apartmentId: number, range: PeriodRange): ReportDocument {
  const context = createContext();
  const apartment = listApartments().find((item) => item.id === apartmentId);
  if (!apartment) throw new Error(i18n.t('serviceErrors.apartmentNotFound'));
  return buildStatement(
    i18n.t('reportDocument.titles.apartment'),
    i18n.t('reportDocument.subtitles.apartment', {
      number: apartment.apartmentNumber,
      community: context.communityName,
    }),
    `apartment-statement-${apartment.apartmentNumber}-${range.to}`,
    [apartment],
    range,
    context,
  );
}

export function buildDebtReport(asOf: string): ReportDocument {
  const context = createContext();
  const chargesByApartment = sumChargesByApartment(asOf);
  const paymentsByApartment = receivablePaymentsByApartment(asOf);
  const prepayments = allocationSumsByApartment(['overpayment'], asOf);
  const apartments = listApartments();
  const balances = apartments.map((apartment) => ({
    apartment,
    balance:
      calculateBalance(
        chargesByApartment.get(apartment.id) ?? 0,
        paymentsByApartment.get(apartment.id) ?? 0,
        apartment.startingBalance,
      ) - (prepayments.get(apartment.id) ?? 0),
  }));
  const debtors = balances.filter((item) => item.balance > 0.005).sort((a, b) => b.balance - a.balance);
  const summary = summarizeBalances(balances.map((item) => item.balance));
  const asOfDate = interestAsOfDate(asOf);
  const interestByApartment = new Map(
    debtors.map((item) => [
      item.apartment.id,
      calculateTotalInterest(item.balance, listInterestRates(item.apartment.id), asOfDate),
    ]),
  );
  const totalInterest = roundMoney([...interestByApartment.values()].reduce((sum, value) => sum + value, 0));

  return {
    title: i18n.t('reportDocument.titles.debt'),
    subtitle: i18n.t('reportDocument.subtitles.debt', { period: formatPeriod(asOf), community: context.communityName }),
    generatedAt: context.generatedAt,
    fileName: `debt-report-${asOf}`,
    summary: [
      { label: i18n.t('reportDocument.summary.apartmentsWithDebt'), value: String(summary.debtorCount) },
      { label: i18n.t('reportDocument.summary.totalReceivables'), value: money(summary.receivables, context) },
      { label: i18n.t('reportDocument.summary.totalInterest'), value: money(totalInterest, context) },
    ],
    tables: [
      {
        heading: i18n.t('reportDocument.tables.apartmentsWithDebt'),
        columns: [
          i18n.t('reportDocument.columns.apartment'),
          i18n.t('reportDocument.columns.owner'),
          i18n.t('reportDocument.columns.balanceDue'),
          i18n.t('reportDocument.columns.interest'),
        ],
        rows: debtors.map((item) => [
          item.apartment.apartmentNumber,
          item.apartment.ownerName ?? i18n.t('apartments.noOwner'),
          item.balance,
          interestByApartment.get(item.apartment.id) ?? 0,
        ]),
      },
    ],
  };
}

export function buildPaymentReport(range: PeriodRange): ReportDocument {
  const context = createContext();
  const payments = listPayments({ fromMonth: range.from, toMonth: range.to });
  const total = sumAmounts(payments);
  return {
    title: i18n.t('reportDocument.titles.payments'),
    subtitle: i18n.t('reportDocument.subtitles.range', { range: rangeLabel(range), community: context.communityName }),
    generatedAt: context.generatedAt,
    fileName: `payment-report-${range.from}-${range.to}`,
    summary: [
      { label: i18n.t('reportDocument.summary.numberOfPayments'), value: String(payments.length) },
      { label: i18n.t('reportDocument.summary.totalReceived'), value: money(total, context) },
    ],
    tables: [paymentsTable(payments)],
  };
}

export function buildFinancialSummary(range: PeriodRange): ReportDocument {
  const context = createContext();
  const charges = listChargesInRange(range.from, range.to);
  const payments = listPayments({ fromMonth: range.from, toMonth: range.to });
  const apartments = listApartments();

  const chargesByApartment = sumChargesByApartment(range.to);
  const paymentsByApartment = receivablePaymentsByApartment(range.to);
  const prepayments = allocationSumsByApartment(['overpayment'], range.to);
  const balances = apartments.map((apartment) =>
    calculateBalance(
      chargesByApartment.get(apartment.id) ?? 0,
      paymentsByApartment.get(apartment.id) ?? 0,
      apartment.startingBalance,
    ) - (prepayments.get(apartment.id) ?? 0),
  );
  const balanceSummary = summarizeBalances(balances);

  const byChargeType = new Map<string, { count: number; total: number }>();
  for (const charge of charges) {
    const entry = byChargeType.get(charge.chargeTypeName) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total = roundMoney(entry.total + charge.amount);
    byChargeType.set(charge.chargeTypeName, entry);
  }
  const chargeTypeRows = [...byChargeType.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, entry]) => [name, entry.count, entry.total]);

  const months = [...new Set([...charges.map((charge) => charge.billingPeriod)])].sort();
  const monthlyRows = months.map((month) => [
    formatPeriod(month),
    sumAmounts(charges.filter((charge) => charge.billingPeriod === month)),
    sumAmounts(payments.filter((payment) => payment.paymentDate.startsWith(month))),
  ]);

  const totalCharged = sumAmounts(charges);
  const totalPaid = sumAmounts(payments);

  const summary: ReportSummaryItem[] = [
    { label: i18n.t('reportDocument.summary.totalCharged'), value: money(totalCharged, context) },
    { label: i18n.t('reportDocument.summary.totalReceived'), value: money(totalPaid, context) },
    { label: i18n.t('reportDocument.summary.receivablesAtEnd'), value: money(balanceSummary.receivables, context) },
    { label: i18n.t('reportDocument.summary.liabilitiesAtEnd'), value: money(balanceSummary.liabilities, context) },
    { label: i18n.t('reportDocument.summary.totalBalanceAtEnd'), value: money(balanceSummary.totalBalance, context) },
    { label: i18n.t('reportDocument.summary.apartments'), value: String(balanceSummary.apartmentCount) },
  ];

  const tables: ReportTable[] = [
    {
      heading: i18n.t('reportDocument.tables.chargesByType'),
      columns: [
        i18n.t('reportDocument.columns.charge'),
        i18n.t('reportDocument.columns.entries'),
        i18n.t('reportDocument.columns.total'),
      ],
      rows: chargeTypeRows,
    },
    {
      heading: i18n.t('reportDocument.tables.monthly'),
      columns: [
        i18n.t('reportDocument.columns.period'),
        i18n.t('reportDocument.columns.charged'),
        i18n.t('reportDocument.columns.received'),
      ],
      rows: monthlyRows,
    },
  ];

  return {
    title: i18n.t('reportDocument.titles.summary'),
    subtitle: i18n.t('reportDocument.subtitles.range', { range: rangeLabel(range), community: context.communityName }),
    generatedAt: context.generatedAt,
    fileName: `financial-summary-${range.from}-${range.to}`,
    summary,
    tables,
  };
}
