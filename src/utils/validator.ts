import type { MeasureStandard, ValidateResult } from '@/types';

export const validateMeasure = (
  value: number,
  standard: MeasureStandard
): ValidateResult => {
  const { standardValue, allowDeviation, minValue, maxValue } = standard;

  let lowerBound = standardValue - allowDeviation;
  let upperBound = standardValue + allowDeviation;

  if (minValue !== undefined) {
    lowerBound = Math.max(lowerBound, minValue);
  }
  if (maxValue !== undefined) {
    upperBound = Math.min(upperBound, maxValue);
  }

  const deviation = value - standardValue;
  const deviationPercent = standardValue !== 0
    ? Math.round((deviation / standardValue) * 100 * 10) / 10
    : 0;

  const pass = value >= lowerBound && value <= upperBound;

  let message = '';
  if (pass) {
    message = `合格，偏差${deviation >= 0 ? '+' : ''}${deviation}${standard.unit}（${deviationPercent >= 0 ? '+' : ''}${deviationPercent}%）`;
  } else if (value < lowerBound) {
    message = `偏小，低于允许下限${lowerBound}${standard.unit}，实测${value}${standard.unit}`;
  } else {
    message = `偏大，高于允许上限${upperBound}${standard.unit}，实测${value}${standard.unit}`;
  }

  return { pass, deviation, deviationPercent, message };
};

export const formatDateTime = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatDate = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
