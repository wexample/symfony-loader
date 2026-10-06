import AppService from '../Class/AppService';
import EventsService from './EventsService';
import Queue from '@wexample/js-helpers/Helper/Queue';
import ChunkedUploadTransport from '../Class/ChunkedUploadTransport';

export class UploadServiceEvents {
  public static QUEUED: string = 'upload:queued';
  public static START: string = 'upload:start';
  public static PROGRESS: string = 'upload:progress';
  public static SUCCESS: string = 'upload:success';
  public static ERROR: string = 'upload:error';
  public static COMPLETE: string = 'upload:complete';
  public static QUEUE_EMPTY: string = 'upload:queue-empty';
}

export type UploadStatus = 'queued' | 'uploading' | 'success' | 'error';

export type UploadOptions = {
  path?: string;
  method?: string;
  fieldName?: string;
  data?: { [key: string]: any };
  headers?: { [key: string]: string };
  withCredentials?: boolean;
  responseType?: XMLHttpRequestResponseType;
  // The size of each piece the file is sent in, said by the server that takes it.
  chunkSize?: number;
};

export type UploadTransport = {
  upload: (job: UploadJob) => Promise<any>;
};

export type UploadJob = {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  options: UploadOptions;
  context?: any;
  response?: any;
  error?: any;
  // Gives the upload up, whether it waits or runs (`cancel()`).
  controller?: AbortController;
  signal?: AbortSignal;
};

export default class UploadService extends AppService {
  public static dependencies: typeof AppService[] = [EventsService];
  public static serviceName: string = 'uploads';
  public static DEFAULT_EVENT_NAME: string = 'upload-handler:change';

  private queue: Queue<UploadJob, any>;
  private transport: UploadTransport | null = null;
  private registeredEvents: Set<string> = new Set();
  private onUploadChangeProxy: EventListener;
  private concurrency = 1;

  registerHooks() {
    return {
      app: {
        hookInit() {
          this.onUploadChangeProxy = this.onUploadChange.bind(this);
          this.registerEvent(UploadService.DEFAULT_EVENT_NAME);
          this.initQueue();

          // Pieces by default: any size, past any limit a single request has.
          if (!this.transport) {
            this.transport = new ChunkedUploadTransport(this);
          }
        },
      },
    };
  }

  registerEvent(name: string, el: EventTarget = window.document): void {
    if (this.registeredEvents.has(name)) {
      return;
    }

    this.app.services.events.listen(name, this.onUploadChangeProxy, el);
    this.registeredEvents.add(name);
  }

  onUploadChange(event: CustomEvent) {
    const detail = event.detail || {};
    const files: File[] = detail.files ? Array.from(detail.files) : (detail.file ? [detail.file] : []);

    if (!files.length) {
      return;
    }

    const options = this.extractOptions(detail);
    this.enqueueFiles(files, options, detail);
  }

  enqueueFiles(files: File[], options: UploadOptions = {}, context: any = {}) {
    this.ensureQueue();
    const jobs: UploadJob[] = [];

    for (const file of files) {
      const controller = new AbortController();
      const job: UploadJob = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        status: 'queued',
        progress: 0,
        options,
        context,
        controller,
        signal: controller.signal,
      };

      jobs.push(job);
      this.app.services.events.trigger(UploadServiceEvents.QUEUED, { job, context });
    }

    this.queue.enqueueMany(jobs);
  }

  // Gives an upload up: one waiting is skipped when its turn comes, one
  // running stops where it is.
  cancel(job: UploadJob): void {
    job.controller?.abort();
  }

  setTransport(transport: UploadTransport): void {
    this.transport = transport;
  }

  updateProgress(job: UploadJob, progress: number): void {
    job.progress = Math.max(0, Math.min(100, Math.round(progress)));
    this.app.services.events.trigger(UploadServiceEvents.PROGRESS, { job });
  }

  private initQueue() {
    this.queue = new Queue<UploadJob, any>({
      concurrency: this.concurrency,
      worker: (job) => this.sendJob(job),
      onItemStart: (job) => {
        job.status = 'uploading';
        this.app.services.events.trigger(UploadServiceEvents.START, { job });
      },
      onItemSuccess: (job, response) => {
        job.status = 'success';
        job.response = response;
        this.app.services.events.trigger(UploadServiceEvents.SUCCESS, { job });
      },
      onItemError: (job, error) => {
        job.status = 'error';
        job.error = error;
        this.app.services.events.trigger(UploadServiceEvents.ERROR, { job, error });
      },
      onItemDone: (job) => {
        this.app.services.events.trigger(UploadServiceEvents.COMPLETE, { job });
      },
      onDrain: () => {
        this.app.services.events.trigger(UploadServiceEvents.QUEUE_EMPTY);
      },
    });
  }

  private ensureQueue() {
    if (!this.queue) {
      this.initQueue();
    }
  }

  private sendJob(job: UploadJob): Promise<any> {
    if (!this.transport) {
      return Promise.reject(new Error('Upload transport is missing. Call setTransport().'));
    }

    if (job.signal?.aborted) {
      return Promise.reject(Object.assign(new Error('Upload cancelled.'), { cancelled: true }));
    }

    return this.transport.upload(job);
  }

  private extractOptions(detail: any): UploadOptions {
    return {
      ...(detail.options || {}),
      ...(detail.component?.options?.upload || {}),
    };
  }
}
