import AppService from '../Class/AppService';
import LocaleService from './LocaleService';
import RenderNode from '../Class/RenderNode';
import DateFormatter, { type DateFormat } from '@wexample/js-date/Common/DateFormatter';
import {
  DATE_DISPLAY_AUTO,
  DATE_DISPLAY_DATE,
  DATE_DISPLAY_DATE_SHORT,
  DATE_DISPLAY_DATE_TIME,
  DATE_DISPLAY_DATE_TIME_FULL,
  DATE_DISPLAY_MONTH_YEAR,
  DATE_DISPLAY_TIME,
  DATE_RELATIVE_REFRESH_SECONDS,
  DateInput,
  dateParse,
  dateRelativeDiff
} from '@wexample/js-date/Helper/Date';

const TRANSLATION_DOMAIN = 'WexampleSymfonyLoaderBundle.common.system';

// What the server puts on a `<time>` so the browser knows how to redraw it.
const ATTRIBUTE_FORMAT = 'data-date-format';

/**
 * What plugs the framework-agnostic formatter into the page, and keeps it true.
 *
 * The rules of display live in `@wexample/js-date`; this says where the wording
 * comes from and which locale is current, then holds the elements carrying
 * `data-date-format` under watch. They are picked up as their render node mounts
 * and rewritten on a single shared timer, at the cadence the unit being displayed
 * deserves — seconds for "just now", an hour for "3 months ago".
 */
export default class DateService extends AppService {
  public static serviceName: string = 'date';
  public static dependencies: typeof AppService[] = [LocaleService];

  private readonly watched: Set<HTMLElement> = new Set();
  private tickTimeout: number | null = null;
  private formatterInstance: DateFormatter | null = null;

  registerHooks() {
    return {
      renderNode: {
        hookMounted: (renderNode: RenderNode) => {
          this.watchTree(renderNode.el);
        }
      }
    };
  }

  // Built on first use, so that the locale service is up by the time it is asked.
  private get formatter(): DateFormatter {
    if (!this.formatterInstance) {
      this.formatterInstance = new DateFormatter(
        (key: string, parameters: Record<string, string | number>): string =>
          (this.app.getServiceOrFail(LocaleService) as LocaleService)
            .trans(`${TRANSLATION_DOMAIN}::${key}`, parameters),
        (): string =>
          (this.app?.layout?.vars?.locale as string | undefined) || navigator.language
      );
    }

    return this.formatterInstance;
  }

  format(
    value: DateInput,
    format: DateFormat = DATE_DISPLAY_AUTO,
    locale?: string,
    now?: DateInput
  ): string {
    return this.formatter.format(value, format, locale, now);
  }

  formatAbsolute(date: Date, format: DateFormat, locale?: string): string {
    return this.formatter.formatAbsolute(date, format, locale);
  }

  formatRelative(value: DateInput, now?: DateInput): string {
    return this.formatter.formatRelative(value, now);
  }

  formatTime(value: DateInput, locale?: string): string {
    return this.format(value, DATE_DISPLAY_TIME, locale);
  }

  formatDate(value: DateInput, locale?: string): string {
    return this.format(value, DATE_DISPLAY_DATE, locale);
  }

  formatDateTime(value: DateInput, locale?: string): string {
    return this.format(value, DATE_DISPLAY_DATE_TIME, locale);
  }

  formatDateTimeFull(value: DateInput, locale?: string): string {
    return this.format(value, DATE_DISPLAY_DATE_TIME_FULL, locale);
  }

  formatDateShort(value: DateInput, locale?: string): string {
    return this.format(value, DATE_DISPLAY_DATE_SHORT, locale);
  }

  formatMonthYear(value: DateInput, locale?: string): string {
    return this.format(value, DATE_DISPLAY_MONTH_YEAR, locale);
  }

  /**
   * Takes every `<time data-date-format>` the given subtree holds under watch,
   * the root included when it is one itself.
   */
  watchTree(root: HTMLElement): void {
    if (!root) {
      return;
    }

    if (root.hasAttribute(ATTRIBUTE_FORMAT)) {
      this.watch(root);
    }

    root.querySelectorAll<HTMLElement>(`[${ATTRIBUTE_FORMAT}]`)
      .forEach((el: HTMLElement) => this.watch(el));
  }

  watch(el: HTMLElement): void {
    this.watched.add(el);
    this.refreshElement(el);
    this.scheduleTick();
  }

  unwatch(el: HTMLElement): void {
    this.watched.delete(el);
  }

  private refreshElement(el: HTMLElement): void {
    const format = el.getAttribute(ATTRIBUTE_FORMAT) as string;
    const value = el.getAttribute('datetime');

    el.textContent = this.format(value, format);
  }

  /**
   * How long a date displayed relatively stays true — seconds for "just now",
   * an hour for "3 months ago". Null when there is nothing to redraw.
   */
  refreshDelayMs(value: DateInput): number | null {
    const date = dateParse(value);

    if (!date) {
      return null;
    }

    const { unit } = dateRelativeDiff((Date.now() - date.getTime()) / 1000);

    return DATE_RELATIVE_REFRESH_SECONDS[unit] * 1000;
  }

  // How long the whole set stays true: the shortest of what each element needs,
  // so one timer serves them all without redrawing a year-old date every second.
  private nextDelayMs(): number | null {
    let shortest: number | null = null;

    for (const el of this.watched) {
      const delay = this.refreshDelayMs(el.getAttribute('datetime'));

      if (delay !== null && (shortest === null || delay < shortest)) {
        shortest = delay;
      }
    }

    return shortest;
  }

  private scheduleTick(): void {
    if (this.tickTimeout !== null) {
      return;
    }

    const delay = this.nextDelayMs();

    if (delay === null) {
      return;
    }

    this.tickTimeout = window.setTimeout(() => {
      this.tickTimeout = null;
      this.tick();
    }, delay);
  }

  private tick(): void {
    for (const el of this.watched) {
      // A render node taken off the page takes its dates with it.
      if (el.isConnected) {
        this.refreshElement(el);
      } else {
        this.watched.delete(el);
      }
    }

    this.scheduleTick();
  }
}
