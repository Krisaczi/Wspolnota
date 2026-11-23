import i18n from '../i18n';

const DEFAULT_METER_TYPE_KEYS = new Map([
  ['cold water', 'coldWater'],
  ['hot water', 'hotWater'],
  ['electricity', 'electricity'],
  ['gas', 'gas'],
  ['heating', 'heating'],
]);

export function meterTypeDisplayName(name: string): string {
  const key = DEFAULT_METER_TYPE_KEYS.get(name.trim().toLowerCase());
  return key ? i18n.t(`settlements.meterTypeNames.${key}`) : name;
}
