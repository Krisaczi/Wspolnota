import i18n from '../i18n';

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export function toFriendlyMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;

  console.error(error);
  const text = error instanceof Error ? error.message : String(error);

  if (/FOREIGN KEY constraint failed/i.test(text)) return i18n.t('errors.foreignKey');
  if (/CHECK constraint failed/i.test(text)) return i18n.t('errors.checkConstraint');
  if (/UNIQUE constraint failed/i.test(text)) return i18n.t('errors.uniqueConstraint');
  return i18n.t('errors.generic');
}
