import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import type { OwnerView } from '../../domain/types';
import { formatDate } from '../../lib/periods';
import { useOwnersStore } from '../../stores/ownersStore';

interface OwnerHistoryModalProps {
  owner: OwnerView;
  onClose: () => void;
}

export function OwnerHistoryModal({ owner, onClose }: OwnerHistoryModalProps) {
  const { t } = useTranslation();
  const getHistory = useOwnersStore((state) => state.getHistory);
  const history = useMemo(() => getHistory(owner.id), [getHistory, owner.id]);

  return (
    <Modal
      title={t('owners.history.title', { name: owner.fullName })}
      description={t('owners.history.description')}
      size="lg"
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('actions.close')}
        </Button>
      }
    >
      {history.length === 0 ? (
        <EmptyState title={t('owners.history.emptyTitle')} description={t('owners.history.emptyDescription')} />
      ) : (
        <ol className="relative space-y-4 border-l border-neutral-200 pl-6 dark:border-neutral-700">
          {history.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-primary-700 bg-white dark:bg-neutral-900" />
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {t('dashboard.paymentApartment', { number: entry.apartmentNumber })}
                <span className="ml-2 font-normal text-neutral-500 dark:text-neutral-400">{formatDate(entry.transferDate)}</span>
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <span>{entry.fromOwnerName ?? t('apartments.noOwner')}</span>
                <ArrowRight size={14} className="text-neutral-400" />
                <span className="font-medium">{entry.toOwnerName}</span>
              </p>
              {entry.note ? <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{entry.note}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
