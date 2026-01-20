import AppService from '../Class/AppService';

export type DateInput = Date | string | number | null | undefined;
export type DateFormatKey =
  | 'dateTimeFull'
  | 'dateTime'
  | 'dateOnly'
  | 'dateShort'
  | 'monthYear';

export default class DateService extends AppService {
  public static serviceName: string = 'date';
  public static formats: Record<DateFormatKey, Intl.DateTimeFormatOptions> = {
    dateTimeFull: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    },
    dateTime: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    },
    dateOnly: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
    dateShort: {
      month: '2-digit',
      day: '2-digit',
    },
    monthYear: {
      year: 'numeric',
      month: '2-digit',
    },
  };

  private resolveLocale(locale?: string): string {
    return (
      locale ||
      (this.app?.layout?.vars?.locale as string | undefined) ||
      navigator.language
    );
  }

  private toDate(value: DateInput): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'number') {
      const stamp = value < 1e12 ? value * 1000 : value;
      const date = new Date(stamp);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  format(
    value: DateInput,
    format: DateFormatKey = 'dateTime',
    locale?: string,
    options?: Intl.DateTimeFormatOptions
  ): string {
    const date = this.toDate(value);
    if (!date) {
      return '';
    }

    const baseOptions = DateService.formats[format];
    const resolvedOptions = options ? { ...baseOptions, ...options } : baseOptions;

    return new Intl.DateTimeFormat(this.resolveLocale(locale), resolvedOptions).format(date);
  }

  formatDateTimeFull(value: DateInput, locale?: string): string {
    return this.format(value, 'dateTimeFull', locale);
  }

  formatDateTime(value: DateInput, locale?: string): string {
    return this.format(value, 'dateTime', locale);
  }

  formatDateOnly(value: DateInput, locale?: string): string {
    return this.format(value, 'dateOnly', locale);
  }

  formatDateShort(value: DateInput, locale?: string): string {
    return this.format(value, 'dateShort', locale);
  }

  formatMonthYear(value: DateInput, locale?: string): string {
    return this.format(value, 'monthYear', locale);
  }
}
