import i18n from '../../i18n';
import { roundMoney } from '../../lib/money';
import { isValidDate } from '../../lib/periods';
import { ACCOUNT_TYPES, type AccountInput, type AccountType, type JournalEntryInput } from '../accounting/types';
import { fail, requireText, type FieldErrors, type ValidationResult } from './common';

const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.-]*$/;

export function validateAccountInput(
  raw: { code: string; name: string; type: string; openingBalance: string; openingBalanceDate: string },
  takenCodes: ReadonlySet<string>,
): ValidationResult<AccountInput> {
  const errors: FieldErrors = {};
  const code = raw.code.trim();
  if (code.length === 0) errors.code = i18n.t('validation.accountCodeRequired');
  else if (code.length > 20) errors.code = i18n.t('validation.accountCodeLength');
  else if (!CODE_PATTERN.test(code)) errors.code = i18n.t('validation.accountCodePattern');
  else if (takenCodes.has(code)) errors.code = i18n.t('validation.accountCodeTaken');

  const name = requireText(raw.name, i18n.t('validation.labels.accountName'), errors, 'name', 80);
  const type = ACCOUNT_TYPES.find((value) => value === raw.type);
  if (!type) errors.type = i18n.t('validation.chooseAccountType');

  const openingBalance = roundMoney(Number(raw.openingBalance.trim().replace(',', '.')));
  if (raw.openingBalance.trim() !== '' && !Number.isFinite(openingBalance)) {
    errors.openingBalance = i18n.t('validation.mustBeNumber', { label: i18n.t('accounting.chart.openingBalance') });
  }
  const hasOpeningBalance = Number.isFinite(openingBalance) && openingBalance !== 0;
  let openingBalanceDate: string | null = null;
  if (raw.openingBalanceDate.trim() !== '') {
    if (!isValidDate(raw.openingBalanceDate)) {
      errors.openingBalanceDate = i18n.t('validation.entryDate');
    } else {
      openingBalanceDate = raw.openingBalanceDate;
    }
  } else if (hasOpeningBalance) {
    errors.openingBalanceDate = i18n.t('validation.entryDate');
  }

  if (Object.keys(errors).length > 0 || !type) return fail(errors);
  return {
    ok: true,
    data: {
      code,
      name,
      type: type as AccountType,
      openingBalance: hasOpeningBalance ? openingBalance : 0,
      openingBalanceDate: hasOpeningBalance ? openingBalanceDate : null,
    },
  };
}

export interface AccountRule {
  id: number;
  active: boolean;
  type: AccountType;
}

export function validateJournalEntryInput(
  input: JournalEntryInput,
  accounts: ReadonlyMap<number, AccountRule>,
): ValidationResult<JournalEntryInput> {
  const errors: FieldErrors = {};
  const description = requireText(input.description, i18n.t('validation.labels.description'), errors, 'description', 200);
  if (!isValidDate(input.entryDate)) errors.entryDate = i18n.t('validation.entryDate');

  if (input.lines.length < 2) errors.lines = i18n.t('validation.twoLines');

  let debitTotal = 0;
  let creditTotal = 0;
  input.lines.forEach((line, index) => {
    const account = line.accountId === null ? undefined : accounts.get(line.accountId);
    if (!account) errors[`line.${index}.account`] = i18n.t('validation.chooseAccount');
    else if (!account.active) errors[`line.${index}.account`] = i18n.t('validation.accountArchived');

    const debit = roundMoney(line.debitAmount);
    const credit = roundMoney(line.creditAmount);
    const validAmounts =
      Number.isFinite(debit) && Number.isFinite(credit) && debit >= 0 && credit >= 0;
    if (!validAmounts) {
      errors[`line.${index}.amount`] = i18n.t('validation.amountNumbers');
    } else if ((debit > 0) === (credit > 0)) {
      errors[`line.${index}.amount`] = i18n.t('validation.oneSide');
    }
    debitTotal += debit;
    creditTotal += credit;
  });

  if (!errors.lines && roundMoney(debitTotal) !== roundMoney(creditTotal)) {
    errors.lines = i18n.t('validation.debitsCredits', {
      debits: roundMoney(debitTotal).toFixed(2),
      credits: roundMoney(creditTotal).toFixed(2),
    });
  }

  if (Object.keys(errors).length > 0) return fail(errors);
  return {
    ok: true,
    data: {
      entryDate: input.entryDate,
      description,
      lines: input.lines.map((line) => ({
        accountId: line.accountId,
        debitAmount: roundMoney(line.debitAmount),
        creditAmount: roundMoney(line.creditAmount),
      })),
    },
  };
}
