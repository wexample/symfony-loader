import AppService from '../Class/AppService';
import App from '../Class/App';
import BannerService from './BannerService';
import LocaleService from './LocaleService';

export type PendingWritesOptions = {
  savingMessage?: string;
  savedMessage?: string;
  failedMessage?: string;
  savedTimeout?: number;
};

const DEFAULT_OPTIONS: Required<PendingWritesOptions> = {
  savingMessage: 'WexampleSymfonyLoaderBundle.common.system::frontend.banner.pending_writes_saving.message',
  savedMessage: 'WexampleSymfonyLoaderBundle.common.system::frontend.banner.pending_writes_saved.message',
  failedMessage: 'WexampleSymfonyLoaderBundle.common.system::frontend.banner.pending_writes_failed.message',
  savedTimeout: 4000,
};

const BANNER_ID = 'pending-writes';

/**
 * Writes sent in the background, and the reader told about them.
 *
 * A page saving without a submit button — a cell, an inline field, an
 * autosaved form — hands each write to `track()`. The first one shows a
 * sticky "Saving…" banner, the last one to settle replaces it with "All
 * changes saved", which fades. A write that failed keeps the banner up with a
 * retry link, and leaving the page while anything is pending or failed asks
 * for confirmation: the reader is the one who loses the change.
 */
export default class PendingWritesService extends AppService {
  public static serviceName: string = 'pendingWrites';
  public static dependencies: typeof AppService[] = [BannerService];

  private options: Required<PendingWritesOptions>;
  private pending: number = 0;
  private failed: (() => Promise<unknown>)[] = [];
  private beforeUnloadHandler: ((event: BeforeUnloadEvent) => void) | null = null;

  constructor(app: App, options: PendingWritesOptions = {}) {
    super(app);
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  setOptions(options: PendingWritesOptions = {}): void {
    this.options = {
      ...this.options,
      ...options,
    };
  }

  registerHooks() {
    return {
      app: {
        hookInit: () => {
          this.registerBeforeUnload();
        },
      },
    };
  }

  /**
   * Runs the write and resolves or rejects as it does. Taking the function
   * rather than its promise is what lets a failed write be sent again.
   */
  async track<T>(write: () => Promise<T>): Promise<T> {
    this.pending += 1;

    if (this.pending === 1) {
      await this.showBanner('info', this.options.savingMessage, { sticky: true });
    }

    try {
      return await write();
    } catch (error) {
      this.failed.push(write);
      throw error;
    } finally {
      this.pending -= 1;

      if (this.pending === 0) {
        await this.settle();
      }
    }
  }

  hasUnsavedWrites(): boolean {
    return this.pending > 0 || this.failed.length > 0;
  }

  async retry(): Promise<void> {
    const writes = this.failed;
    this.failed = [];

    // The caller of each write already had its rejection; a second failure
    // lands in the banner again, not in the console.
    await Promise.all(writes.map((write) => this.track(write).catch(() => undefined)));
  }

  private async settle(): Promise<void> {
    if (this.failed.length) {
      await this.showBanner('error', this.options.failedMessage, {
        sticky: true,
        actions: { retry: () => void this.retry() },
      });
      return;
    }

    await this.showBanner('success', this.options.savedMessage, {
      timeout: this.options.savedTimeout,
    });
  }

  private async showBanner(
    type: 'info' | 'success' | 'error',
    message: string,
    options: { sticky?: boolean; timeout?: number; actions?: Record<string, () => void> }
  ): Promise<void> {
    const bannerService = this.app.getServiceOrFail(BannerService) as BannerService;
    const localeService = this.app.getServiceOrFail(LocaleService) as LocaleService;

    await bannerService.show({
      id: BANNER_ID,
      type,
      message: localeService.trans(message),
      ...options,
    });
  }

  private registerBeforeUnload(): void {
    if (this.beforeUnloadHandler) {
      return;
    }

    this.beforeUnloadHandler = (event: BeforeUnloadEvent) => {
      if (!this.hasUnsavedWrites()) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }
}
