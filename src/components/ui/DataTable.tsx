import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type SortValue = string | number | null;

export interface DataColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => SortValue;
  align?: 'left' | 'right';
  className?: string;
}

type SortDirection = 'asc' | 'desc';

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  emptyMessage: string;
  actions?: (row: T) => ReactNode;
  initialSort?: { key: string; direction: SortDirection };
}

function compareValues(a: SortValue, b: SortValue): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function DataTable<T>({ columns, rows, getRowKey, emptyMessage, actions, initialSort }: DataTableProps<T>) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(initialSort ?? null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column?.sortValue) return rows;
    const direction = sort.direction === 'asc' ? 1 : -1;
    const getValue = column.sortValue;
    return [...rows].sort((a, b) => direction * compareValues(getValue(a), getValue(b)));
  }, [rows, sort, columns]);

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' };
      return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800/60">
            <tr>
              {columns.map((column) => {
                const sortable = Boolean(column.sortValue);
                const isActive = sort?.key === column.key;
                const SortIcon = !sortable ? null : !isActive ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400 ${
                      column.align === 'right' ? 'text-right' : 'text-left'
                    } ${column.className ?? ''}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="inline-flex items-center gap-1 rounded transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
                      >
                        {column.header}
                        {SortIcon ? <SortIcon size={14} className={isActive ? 'opacity-100' : 'opacity-40'} /> : null}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {actions ? <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">{t('actions.actions')}</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr key={getRowKey(row)} className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 text-neutral-800 dark:text-neutral-200 ${column.align === 'right' ? 'text-right tabular-nums' : 'text-left'} ${column.className ?? ''}`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                  {actions ? <td className="px-4 py-3 text-right">{actions(row)}</td> : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
