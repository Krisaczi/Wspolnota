import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Building2, Gauge, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable, type DataColumn } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconButton } from '../../components/ui/IconButton';
import { PageHeader } from '../../components/ui/PageHeader';
import { SelectInput } from '../../components/ui/FormFields';
import { SearchInput } from '../../components/ui/SearchInput';
import { attempt } from '../../lib/attempt';
import { meterTypeDisplayName } from '../../lib/meterLabels';
import { formatNumber } from '../../lib/money';
import { formatDate } from '../../lib/periods';
import { useSettingsStore } from '../../stores/settingsStore';
import { BalanceText } from '../../components/ui/BalanceText';
import type { MeterReadingInput } from '../../db/repositories/metersRepo';
import { withConsumption } from '../../domain/consumption';
import type { ApartmentView } from '../../domain/types';
import type { ReadingView } from '../../domain/types';
import { useApartmentsStore } from '../../stores/apartmentsStore';
import { useMetersStore } from '../../stores/metersStore';
import type { ApartmentMeterSummary } from '../../db/repositories/metersRepo';
import { YearlySummary } from './YearlySummary';
import { MeterReadingForm } from './MeterReadingForm';
import { MeterTypesModal } from './MeterTypesModal';

type Editor = { mode: 'create' } | { mode: 'edit'; reading: ReadingView } | null;

interface ReadingRow extends ReadingView {
  consumption: number | null;
}

function matchesSearch(apartment: ApartmentView, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (needle === '') return true;
  return (
    apartment.apartmentNumber.toLowerCase().includes(needle) ||
    (apartment.ownerName !== null && apartment.ownerName.toLowerCase().includes(needle))
  );
}

interface TileSummary {
  latestDate: string;
  lines: { name: string; value: number; consumption: number | null }[];
}

function summarizeForApartment(summaries: ApartmentMeterSummary[], apartmentId: number): TileSummary | null {
  const forApartment = summaries.filter((summary) => summary.apartmentId === apartmentId);
  if (forApartment.length === 0) return null;
  const latest = forApartment.reduce((a, b) => (a.readingDate >= b.readingDate ? a : b));
  return {
    latestDate: latest.readingDate,
    lines: forApartment.map(({ meterTypeName, readingValue, consumption }) => ({
      name: meterTypeDisplayName(meterTypeName),
      value: readingValue,
      consumption,
    })),
  };
}

export function SettlementsPage() {
  const { t } = useTranslation();
  const currency = useSettingsStore((state) => state.settings.currency);
  const apartments = useApartmentsStore((state) => state.items);
  const refreshApartments = useApartmentsStore((state) => state.refresh);
  const meterTypes = useMetersStore((state) => state.meterTypes);
  const refreshMeterTypes = useMetersStore((state) => state.refreshMeterTypes);
  const series = useMetersStore((state) => state.series);
  const storedReadings = useMetersStore((state) => state.readings);
  const selectSeries = useMetersStore((state) => state.selectSeries);
  const saveReading = useMetersStore((state) => state.saveReading);
  const removeReading = useMetersStore((state) => state.removeReading);
  const latestSummaries = useMetersStore((state) => state.latestSummaries);
  const meterBalances = useMetersStore((state) => state.meterBalances);

  const [selectedApartmentId, setSelectedApartmentId] = useState<number | null>(null);
  const [meterTypeId, setMeterTypeId] = useState('');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<Editor>(null);
  const [pendingDelete, setPendingDelete] = useState<ReadingView | null>(null);
  const [showMeterTypes, setShowMeterTypes] = useState(false);

  useEffect(() => {
    refreshApartments();
    refreshMeterTypes();
  }, [refreshApartments, refreshMeterTypes]);

  useEffect(() => {
    const meterNumeric = Number(meterTypeId);
    selectSeries(
      selectedApartmentId !== null && meterTypeId !== ''
        ? { apartmentId: selectedApartmentId, meterTypeId: meterNumeric }
        : null,
    );
  }, [selectedApartmentId, meterTypeId, selectSeries]);

  const selectedApartment =
    selectedApartmentId !== null ? (apartments.find((apartment) => apartment.id === selectedApartmentId) ?? null) : null;
  const selectedMeter = meterTypes.find((meterType) => String(meterType.id) === meterTypeId) ?? null;
  const hasSelection = selectedApartment !== null && selectedMeter !== null && series !== null;

  const filteredApartments = useMemo(
    () => apartments.filter((apartment) => matchesSearch(apartment, search)),
    [apartments, search],
  );

  const readings = useMemo(() => (hasSelection ? storedReadings : []), [hasSelection, storedReadings]);

  const summariesByApartment = useMemo(() => {
    const map = new Map<number, TileSummary>();
    for (const apartment of apartments) {
      const summary = summarizeForApartment(latestSummaries, apartment.id);
      if (summary !== null) map.set(apartment.id, summary);
    }
    return map;
  }, [apartments, latestSummaries]);

  const rows: ReadingRow[] = useMemo(
    () => withConsumption(readings).map(({ reading, consumption }) => ({ ...reading, consumption })),
    [readings],
  );

  const columns: DataColumn<ReadingRow>[] = [
    {
      key: 'date',
      header: t('fields.date'),
      sortValue: (row) => row.readingDate,
      render: (row) => formatDate(row.readingDate),
    },
    {
      key: 'value',
      header: t('settlements.columns.reading'),
      align: 'right',
      sortValue: (row) => row.readingValue,
      render: (row) => <span className="font-medium text-neutral-900 dark:text-neutral-100">{formatNumber(row.readingValue)}</span>,
    },
    {
      key: 'consumption',
      header: t('settlements.columns.usedSincePrevious'),
      align: 'right',
      sortValue: (row) => row.consumption,
      render: (row) =>
        row.consumption === null ? (
          <span className="text-neutral-400">{t('settlements.firstReading')}</span>
        ) : (
          formatNumber(row.consumption)
        ),
    },
  ];

  const handleSave = (input: MeterReadingInput) => {
    const editingId = editor?.mode === 'edit' ? editor.reading.id : null;
    const outcome = attempt(
      () => {
        saveReading(input, editingId);
        refreshApartments();
      },
      editingId === null ? t('settlements.readingAdded') : t('settlements.readingUpdated'),
    );
    if (outcome.ok) setEditor(null);
  };

  if (selectedApartment !== null) {
    return (
      <>
        <PageHeader
          title={t('settlements.title')}
          description={t('settlements.description')}
          actions={
            <>
              <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => setSelectedApartmentId(null)}>
                {t('settlements.backToApartments')}
              </Button>
              <Button variant="secondary" icon={<Settings2 size={16} />} onClick={() => setShowMeterTypes(true)}>
                {t('settlements.meterTypes')}
              </Button>
              <Button
                icon={<Plus size={16} />}
                disabled={meterTypes.length === 0}
                onClick={() => {
                  if (meterTypeId === '' && meterTypes.length > 0) setMeterTypeId(String(meterTypes[0].id));
                  setEditor({ mode: 'create' });
                }}
              >
                {t('settlements.addReading')}
              </Button>
            </>
          }
        />

        {!hasSelection || selectedMeter === null ? (
          <EmptyState
            title={t('settlements.chooseMeterTitle', { number: selectedApartment.apartmentNumber })}
            description={
              meterTypes.length === 0 ? t('settlements.chooseDescriptionSetup') : t('settlements.chooseMeterDescription')
            }
            action={
              meterTypes.length === 0 ? (
                <Button variant="secondary" icon={<Settings2 size={16} />} onClick={() => setShowMeterTypes(true)}>
                  {t('settlements.addMeterType')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-6">
            <SelectInput
              aria-label={t('settlements.meterTypeLabel')}
              value={meterTypeId}
              onChange={(event) => setMeterTypeId(event.target.value)}
            >
              <option value="">{t('settlements.selectMeterType')}</option>
              {meterTypes.map((meterType) => (
                <option key={meterType.id} value={meterType.id}>
                  {meterTypeDisplayName(meterType.name)}
                </option>
              ))}
            </SelectInput>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                {rows.length === 0 ? (
                  <EmptyState
                    title={t('settlements.noReadingsTitle')}
                    description={t('settlements.noReadingsDescription', {
                      meter: meterTypeDisplayName(selectedMeter.name).toLowerCase(),
                      number: selectedApartment.apartmentNumber,
                    })}
                    action={
                      <Button icon={<Plus size={16} />} onClick={() => setEditor({ mode: 'create' })}>
                        {t('settlements.addReading')}
                      </Button>
                    }
                  />
                ) : (
                  <DataTable
                    columns={columns}
                    rows={rows}
                    getRowKey={(row) => row.id}
                    emptyMessage={t('settlements.noReadings')}
                    initialSort={{ key: 'date', direction: 'desc' }}
                    actions={(row) => (
                      <div className="flex justify-end gap-1">
                        <IconButton label={t('settlements.editReading')} onClick={() => setEditor({ mode: 'edit', reading: row })}>
                          <Pencil size={16} />
                        </IconButton>
                        <IconButton label={t('settlements.deleteReading')} tone="danger" onClick={() => setPendingDelete(row)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    )}
                  />
                )}
              </div>

              <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  <Gauge size={18} className="text-primary-700 dark:text-primary-400" />
                  {t('settlements.yearlySummaryTitle')}
                </h2>
                <YearlySummary readings={readings} />
              </section>
            </div>
          </div>
        )}

        {editor && selectedMeter ? (
          <MeterReadingForm
            reading={editor.mode === 'edit' ? editor.reading : null}
            apartmentId={selectedApartment.id}
            meterTypeId={selectedMeter.id}
            apartmentNumber={selectedApartment.apartmentNumber}
            meterTypeName={meterTypeDisplayName(selectedMeter.name)}
            series={readings}
            onClose={() => setEditor(null)}
            onSubmit={handleSave}
          />
        ) : null}

        {pendingDelete ? (
          <ConfirmDialog
            title={t('settlements.deleteTitle')}
            message={t('settlements.deleteMessage', {
              value: formatNumber(pendingDelete.readingValue),
              date: formatDate(pendingDelete.readingDate),
            })}
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => {
              const target = pendingDelete;
              setPendingDelete(null);
              attempt(() => {
                removeReading(target.id);
                refreshApartments();
              }, t('settlements.readingDeleted'));
            }}
          />
        ) : null}

        {showMeterTypes ? (
          <MeterTypesModal meterTypes={meterTypes} onClose={() => setShowMeterTypes(false)} />
        ) : null}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('settlements.title')}
        description={t('settlements.description')}
        actions={
          <Button variant="secondary" icon={<Settings2 size={16} />} onClick={() => setShowMeterTypes(true)}>
            {t('settlements.meterTypes')}
          </Button>
        }
      />

      <div className="mb-6">
        <SearchInput
          label={t('settlements.searchLabel')}
          placeholder={t('settlements.searchPlaceholder')}
          value={search}
          onChange={setSearch}
        />
      </div>

      {apartments.length === 0 ? (
        <EmptyState
          title={t('settlements.chooseTitle')}
          description={t('settlements.chooseDescriptionSetup')}
        />
      ) : filteredApartments.length === 0 ? (
        <EmptyState title={t('settlements.noMatchesTitle')} description={t('settlements.noMatchesDescription')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredApartments.map((apartment) => {
            const summary = summariesByApartment.get(apartment.id);
            return (
              <button
                key={apartment.id}
                type="button"
                onClick={() => {
                  setSelectedApartmentId(apartment.id);
                  const meterIdsWithReadings = latestSummaries
                    .filter((summary) => summary.apartmentId === apartment.id)
                    .map((summary) => summary.meterTypeId);
                  const preferred =
                    meterTypes.find((meterType) => meterIdsWithReadings.includes(meterType.id)) ?? meterTypes[0] ?? null;
                  setMeterTypeId(preferred === null ? '' : String(preferred.id));
                }}
                className="group flex flex-col items-start gap-2 rounded-xl border border-neutral-200 bg-white p-5 text-left shadow-sm transition hover:border-primary-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-primary-500"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                  <Building2 size={20} />
                </span>
                <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  {t('dashboard.paymentApartment', { number: apartment.apartmentNumber })}
                </span>
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {apartment.ownerName ?? t('settlements.noOwner')}
                </span>
                <span className="text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">{t('fields.balance')}: </span>
                  <BalanceText balance={meterBalances.get(apartment.id) ?? 0} currency={currency} />
                </span>
                {summary ? (
                  <div className="mt-1 w-full border-t border-neutral-200 pt-2 dark:border-neutral-800">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {t('settlements.latestReading', {
                        date: formatDate(summary.latestDate),
                      })}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {summary.lines.map((line) => (
                        <li key={line.name} className="flex justify-between gap-2 text-xs">
                          <span className="text-neutral-600 dark:text-neutral-400">{line.name}</span>
                          <span className="text-right font-medium text-neutral-900 dark:text-neutral-100">
                            {formatNumber(line.value)}
                            {line.consumption !== null ? (
                              <span className="ml-1 font-normal text-neutral-500 dark:text-neutral-400">
                                (+{formatNumber(line.consumption)})
                              </span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <span className="mt-1 border-t border-neutral-200 pt-2 text-xs text-neutral-400 dark:border-neutral-800">
                    {t('settlements.noReadingsShort')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {showMeterTypes ? (
        <MeterTypesModal meterTypes={meterTypes} onClose={() => setShowMeterTypes(false)} />
      ) : null}
    </>
  );
}
