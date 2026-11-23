import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {t('actions.cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel ?? t('actions.delete')}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-100 text-error-700 dark:bg-error-900/40 dark:text-error-500">
          <AlertTriangle size={20} />
        </div>
        <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{message}</p>
      </div>
    </Modal>
  );
}
