import AppService from '../Class/AppService';

export type DateInput = Date | string | number | null | undefined;

export default class DateService extends AppService {
  public static serviceName: string = 'date';

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

  formatDate(
    value: DateInput,
    options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
    locale?: string
  ): string {
    const date = this.toDate(value);
    if (!date) {
      return '';
    }

    return new Intl.DateTimeFormat(this.resolveLocale(locale), options).format(date);
  }

  formatDateTime(
    value: DateInput,
    options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    },
    locale?: string
  ): string {
    const date = this.toDate(value);
    if (!date) {
      return '';
    }

    return new Intl.DateTimeFormat(this.resolveLocale(locale), options).format(date);
  }
}
