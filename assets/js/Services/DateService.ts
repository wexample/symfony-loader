import AppService from '../Class/AppService';

export type DateInput = Date | string | number | null | undefined;
export type DateFormatKey =
  | 'dateTimeFull'
  | 'dateTime'
  | 'dateOnly'
  | 'dateShort'
  | 'monthYear';
export type RelativeTimeUnit =
  | 'second'
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'year';

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

  formatRelative(
    value: DateInput,
    options: {
      now?: DateInput;
      unit?: RelativeTimeUnit;
      style?: Intl.RelativeTimeFormatStyle;
      numeric?: Intl.RelativeTimeFormatNumeric;
    } = {}
  ): string {
    const date = this.toDate(value);
    if (!date) {
      return '';
    }

    const now = this.toDate(options.now) || new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSeconds = diffMs / 1000;

    const unit = options.unit ?? this.resolveRelativeUnit(diffSeconds);
    const divider = this.getRelativeUnitDivider(unit);
    const valueInUnit = Math.round(diffSeconds / divider);

    const formatter = new Intl.RelativeTimeFormat(
      this.resolveLocale(),
      {
        style: options.style ?? 'long',
        numeric: options.numeric ?? 'auto',
      }
    );

    return formatter.format(valueInUnit, unit);
  }

  private resolveRelativeUnit(diffSeconds: number): RelativeTimeUnit {
    const absSeconds = Math.abs(diffSeconds);
    if (absSeconds < 60) return 'second';
    if (absSeconds < 3600) return 'minute';
    if (absSeconds < 86400) return 'hour';
    if (absSeconds < 604800) return 'day';
    if (absSeconds < 2592000) return 'week';
    if (absSeconds < 31536000) return 'month';
    return 'year';
  }

  private getRelativeUnitDivider(unit: RelativeTimeUnit): number {
    switch (unit) {
      case 'minute':
        return 60;
      case 'hour':
        return 3600;
      case 'day':
        return 86400;
      case 'week':
        return 604800;
      case 'month':
        return 2592000;
      case 'year':
        return 31536000;
      default:
        return 1;
    }
  }
}
