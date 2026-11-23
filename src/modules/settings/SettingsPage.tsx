import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Languages, Moon, RotateCcw, Save, Sun, Upload } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, TextInput } from '../../components/ui/FormFields';
import { PageHeader } from '../../components/ui/PageHeader';
import { setAppLanguage, type AppLanguage } from '../../i18n';
import { attempt } from '../../lib/attempt';
import { toFriendlyMessage } from '../../lib/errors';
import { validateSettings, type SettingsFormValues } from '../../domain/validation/settings';
import type { FieldErrors } from '../../domain/validation/common';
import { downloadBackup, pickRestoreFile, resetAllData, restoreFromBackup } from '../../services/backupService';
import { useSettingsStore } from '../../stores/settingsStore';
import { toast } from '../../stores/toastStore';
import { useUiStore, type Theme } from '../../stores/uiStore';

const THEME_OPTIONS: { value: Theme; labelKey: string; icon: typeof Sun }[] = [
  { value: 'light', labelKey: 'settings.appearance.light', icon: Sun },
  { value: 'dark', labelKey: 'settings.appearance.dark', icon: Moon },
];

const LANGUAGE_OPTIONS: { value: AppLanguage; labelKey: string }[] = [
  { value: 'pl', labelKey: 'settings.language.polish' },
  { value: 'en', labelKey: 'settings.language.english' },
];

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const saveSettings = useSettingsStore((state) => state.save);
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);

  const [values, setValues] = useState<SettingsFormValues>({
    communityName: settings.communityName,
    currency: settings.currency,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  useEffect(() => {
    setValues({ communityName: settings.communityName, currency: settings.currency });
  }, [settings]);

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    const result = validateSettings(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    attempt(() => saveSettings(result.data), t('settings.community.saved'));
  };

  const handleReset = async () => {
    setConfirmReset(false);
    try {
      await resetAllData();
      window.location.reload();
    } catch (error) {
      toast.error(toFriendlyMessage(error));
    }
  };

  const handleRestore = async () => {
    setConfirmRestore(false);
    try {
      const path = await pickRestoreFile();
      if (!path) return;
      await restoreFromBackup(path);
    } catch (error) {
      toast.error(toFriendlyMessage(error));
    }
  };

  return (
    <>
      <PageHeader title={t('settings.title')} description={t('settings.description')} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{t('settings.community.title')}</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{t('settings.community.description')}</p>
          <form onSubmit={handleSave} noValidate className="mt-5 space-y-5">
            <Field label={t('settings.community.name')} htmlFor="communityName" error={errors.communityName}>
              <TextInput
                id="communityName"
                value={values.communityName}
                error={errors.communityName}
                onChange={(event) => setValues((current) => ({ ...current, communityName: event.target.value }))}
              />
            </Field>
            <Field
              label={t('settings.community.currency')}
              htmlFor="currency"
              error={errors.currency}
              hint={t('settings.community.currencyHint')}
            >
              <TextInput
                id="currency"
                maxLength={3}
                className="uppercase"
                value={values.currency}
                error={errors.currency}
                onChange={(event) => setValues((current) => ({ ...current, currency: event.target.value }))}
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" icon={<Save size={16} />}>
                {t('settings.community.save')}
              </Button>
            </div>
          </form>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
              <Languages size={18} className="text-primary-700 dark:text-primary-400" />
              {t('settings.language.title')}
            </h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{t('settings.language.description')}</p>
            <div role="radiogroup" aria-label={t('settings.language.label')} className="mt-5 grid grid-cols-2 gap-3">
              {LANGUAGE_OPTIONS.map((option) => {
                const selected = i18n.language === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setAppLanguage(option.value)}
                    className={`flex items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium transition-colors duration-150 ${
                      selected
                        ? 'border-primary-500 bg-primary-50 text-primary-900 dark:bg-primary-900/30 dark:text-primary-100'
                        : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {t(option.labelKey)}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{t('settings.appearance.title')}</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{t('settings.appearance.description')}</p>
            <div role="radiogroup" aria-label={t('settings.appearance.label')} className="mt-5 grid grid-cols-2 gap-3">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTheme(option.value)}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors duration-150 ${
                      selected
                        ? 'border-primary-500 bg-primary-50 text-primary-900 dark:bg-primary-900/30 dark:text-primary-100'
                        : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Icon size={16} />
                    {t(option.labelKey)}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{t('settings.data.title')}</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{t('settings.data.description')}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                variant="secondary"
                icon={<Download size={16} />}
                onClick={() => attempt(downloadBackup, t('settings.data.backupCreated'))}
              >
                {t('settings.data.downloadBackup')}
              </Button>
              <Button
                variant="secondary"
                icon={<Upload size={16} />}
                onClick={() => setConfirmRestore(true)}
              >
                {t('settings.data.restoreBackup')}
              </Button>
              <Button variant="danger" icon={<RotateCcw size={16} />} onClick={() => setConfirmReset(true)}>
                {t('settings.data.resetAll')}
              </Button>
            </div>
          </section>
        </div>
      </div>

      {confirmRestore ? (
        <ConfirmDialog
          title={t('settings.data.restoreTitle')}
          message={t('settings.data.restoreMessage')}
          confirmLabel={t('settings.data.restoreConfirm')}
          onCancel={() => setConfirmRestore(false)}
          onConfirm={handleRestore}
        />
      ) : null}

      {confirmReset ? (
        <ConfirmDialog
          title={t('settings.data.eraseTitle')}
          message={t('settings.data.eraseMessage')}
          confirmLabel={t('settings.data.eraseConfirm')}
          onCancel={() => setConfirmReset(false)}
          onConfirm={handleReset}
        />
      ) : null}
    </>
  );
}
