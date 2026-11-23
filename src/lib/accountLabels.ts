import i18n from '../i18n';
import type { Account, AccountType } from '../domain/accounting/types';

export function accountTypeLabel(type: AccountType): string {
  return i18n.t(`accountType.${type}`);
}

export function accountDisplayName(account: Pick<Account, 'code' | 'name'>): string {
  return i18n.t(`accountName.${account.code}`, { defaultValue: account.name });
}
