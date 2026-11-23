import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Building2, FileText, PieChart, Receipt, Scale, UserRound } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Field, SelectInput, TextInput } from '../../components/ui/FormFields';
import { PageHeader } from '../../components/ui/PageHeader';
import { attempt } from '../../lib/attempt';
import { currentPeriod, isValidPeriod } from '../../lib/periods';
import { useApartmentsStore } from '../../stores/apartmentsStore';
import { useOwnersStore } from '../../stores/ownersStore';
import {
  buildApartmentStatement,
  buildDebtReport,
  buildFinancialSummary,
  buildOwnerStatement,
  buildPaymentReport,
} from '../../services/reports/reportBuilders';
import type { ReportDocument } from '../../services/reports/types';
import { ReportActions } from './ReportActions';
import { ReportPreview } from './ReportPreview';

type ReportKind = 'owner' | 'apartment' | 'debt' | 'payments' | 'summary';

const REPORT_OPTIONS: { kind: ReportKind; icon: typeof FileText }[] = [
  { kind: 'owner', icon: UserRound },
  { kind: 'apartment', icon: Building2 },
  { kind: 'debt', icon: Scale },
  { kind: 'payments', icon: Receipt },
  { kind: 'summary', icon: PieChart },
];

interface ReportParams {
  kind: ReportKind;
  fromPeriod: string;
  toPeriod: string;
  ownerId: string;
  apartmentId: string;
}

function initialParams(): ReportParams {
  const year = currentPeriod().slice(0, 4);
  return { kind: 'debt', fromPeriod: `${year}-01`, toPeriod: currentPeriod(), ownerId: '', apartmentId: '' };
}

function validateParams(params: ReportParams): string | null {
  if (!isValidPeriod(params.fromPeriod) || !isValidPeriod(params.toPeriod)) return 'reportsPage.errors.invalidMonths';
  if (params.fromPeriod > params.toPeriod) return 'reportsPage.errors.rangeOrder';
  if (params.kind === 'owner' && !params.ownerId) return 'reportsPage.errors.selectOwner';
  if (params.kind === 'apartment' && !params.apartmentId) return 'reportsPage.errors.selectApartment';
  return null;
}

function buildReport(params: ReportParams): ReportDocument {
  const range = { from: params.fromPeriod, to: params.toPeriod };
  switch (params.kind) {
    case 'owner':
      return buildOwnerStatement(Number(params.ownerId), range);
    case 'apartment':
      return buildApartmentStatement(Number(params.apartmentId), range);
    case 'debt':
      return buildDebtReport(params.toPeriod);
    case 'payments':
      return buildPaymentReport(range);
    case 'summary':
      return buildFinancialSummary(range);
  }
}

export function ReportsPage() {
  const { t } = useTranslation();
  const owners = useOwnersStore((state) => state.items);
  const refreshOwners = useOwnersStore((state) => state.refresh);
  const apartments = useApartmentsStore((state) => state.items);
  const refreshApartments = useApartmentsStore((state) => state.refresh);

  const [params, setParams] = useState<ReportParams>(initialParams);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [report, setReport] = useState<ReportDocument | null>(null);

  useEffect(() => {
    refreshOwners();
    refreshApartments();
  }, [refreshOwners, refreshApartments]);

  const update = (patch: Partial<ReportParams>) => {
    setParams((current) => ({ ...current, ...patch }));
    setReport(null);
    setErrorKey(null);
  };

  const usesRange = params.kind !== 'debt';
  const showOwner = params.kind === 'owner';
  const showApartment = params.kind === 'apartment';

  const handleGenerate = () => {
    const problemKey = validateParams(params);
    if (problemKey) {
      setErrorKey(problemKey);
      setReport(null);
      return;
    }
    const outcome = attempt(() => buildReport(params), t('reportsPage.generated'));
    if (outcome.ok) setReport(outcome.value);
  };

  return (
    <>
      <PageHeader title={t('reportsPage.title')} description={t('reportsPage.description')} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="space-y-5 xl:col-span-1">
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('reportsPage.reportType')}</p>
            <div className="grid grid-cols-1 gap-2">
              {REPORT_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = params.kind === option.kind;
                return (
                  <button
                    key={option.kind}
                    type="button"
                    onClick={() => update({ kind: option.kind })}
                    aria-pressed={selected}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-150 ${
                      selected
                        ? 'border-primary-500 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/30'
                        : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <Icon size={18} className={selected ? 'mt-0.5 text-primary-700 dark:text-primary-400' : 'mt-0.5 text-neutral-500'} />
                    <span>
                      <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        {t(`reportsPage.kinds.${option.kind}.label`)}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                        {t(`reportsPage.kinds.${option.kind}.description`)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            {showOwner ? (
              <Field label={t('reportsPage.ownerLabel')} htmlFor="reportOwner">
                <SelectInput id="reportOwner" value={params.ownerId} onChange={(event) => update({ ownerId: event.target.value })}>
                  <option value="">{t('reportsPage.selectOwner')}</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.fullName}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            ) : null}

            {showApartment ? (
              <Field label={t('fields.apartment')} htmlFor="reportApartment">
                <SelectInput id="reportApartment" value={params.apartmentId} onChange={(event) => update({ apartmentId: event.target.value })}>
                  <option value="">{t('apartments.selectApartment')}</option>
                  {apartments.map((apartment) => (
                    <option key={apartment.id} value={apartment.id}>
                      {t('dashboard.paymentApartment', { number: apartment.apartmentNumber })}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            ) : null}

            {usesRange ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <Field label={t('reportsPage.fromMonth')} htmlFor="reportFrom">
                  <TextInput id="reportFrom" type="month" value={params.fromPeriod} onChange={(event) => update({ fromPeriod: event.target.value })} />
                </Field>
                <Field label={t('reportsPage.toMonth')} htmlFor="reportTo">
                  <TextInput id="reportTo" type="month" value={params.toPeriod} onChange={(event) => update({ toPeriod: event.target.value })} />
                </Field>
              </div>
            ) : (
              <Field label={t('reportsPage.asOfMonth')} htmlFor="reportAsOf" hint={t('reportsPage.asOfHint')}>
                <TextInput id="reportAsOf" type="month" value={params.toPeriod} onChange={(event) => update({ toPeriod: event.target.value })} />
              </Field>
            )}

            {errorKey ? (
              <p role="alert" className="flex items-center gap-2 text-sm font-medium text-error-700 dark:text-error-500">
                <AlertTriangle size={16} />
                {t(errorKey)}
              </p>
            ) : null}

            <Button className="w-full" icon={<FileText size={16} />} onClick={handleGenerate}>
              {t('reportsPage.generate')}
            </Button>
          </div>
        </section>

        <section className="min-w-0 xl:col-span-2">
          {report ? (
            <>
              <ReportActions report={report} />
              <ReportPreview report={report} />
            </>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 px-6 py-12 text-center dark:border-neutral-700">
              <FileText size={32} className="text-neutral-400" />
              <p className="mt-3 text-base font-semibold text-neutral-800 dark:text-neutral-200">{t('reportsPage.noReportTitle')}</p>
              <p className="mt-1 max-w-sm text-sm text-neutral-600 dark:text-neutral-400">{t('reportsPage.noReportDescription')}</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
