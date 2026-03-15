import { Client } from '../types';

export type MandatoryClientFieldKey = 'telegram_group_id' | 'start_date' | 'program_duration_months';

export interface MandatoryClientField {
  key: MandatoryClientFieldKey;
  label: string;
}

const mandatoryFieldLabels: Record<MandatoryClientFieldKey, string> = {
  telegram_group_id: 'ID grupo Telegram',
  start_date: 'Fecha inicio primer programa',
  program_duration_months: 'Duracion primer programa',
};


const hasTextValue = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  return value.trim().length > 0;
};

const hasPositiveNumber = (value: unknown): boolean => {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
  }
  return false;
};

export const getMissingMandatoryClientFields = (client: Client): MandatoryClientField[] => {
  const missing: MandatoryClientField[] = [];

  if (!hasTextValue(client.telegram_group_id)) {
    missing.push({ key: 'telegram_group_id', label: mandatoryFieldLabels.telegram_group_id });
  }

  if (!hasTextValue(client.start_date)) {
    missing.push({ key: 'start_date', label: mandatoryFieldLabels.start_date });
  }

  if (!hasPositiveNumber(client.program_duration_months)) {
    missing.push({ key: 'program_duration_months', label: mandatoryFieldLabels.program_duration_months });
  }

  return missing;
};

export const isMandatoryClientOnboardingEnforced = (client: Client): boolean => {
  return !!client;
};
