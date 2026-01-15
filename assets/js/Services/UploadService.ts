import AppService from '../Class/AppService';
import EventsService from './EventsService';
import Queue from '@wexample/js-helpers/Helper/Queue';

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
  url?: string;
  method?: string;
  fieldName?: string;
  data?: { [key: string]: any };
  headers?: { [key: string]: string };
  withCredentials?: boolean;
  responseType?: XMLHttpRequestResponseType;
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
};

export default class UploadService extends AppService {
  public static dependencies: typeof AppService[] = [EventsService];
  public static serviceName: string = 'uploads';
  public static DEFAULT_EVENT_NAME: string = 'upload-handler:change';

  private queue: Queue<UploadJob, any>;
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
        },
      },
    };
  }

  registerEvent(name: string): void {
    if (this.registeredEvents.has(name)) {
      return;
    }

    this.app.services.events.listen(name, this.onUploadChangeProxy);
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
      const job: UploadJob = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        status: 'queued',
        progress: 0,
        options,
        context,
      };

      jobs.push(job);
      this.app.services.events.trigger(UploadServiceEvents.QUEUED, { job, context });
    }

    this.queue.enqueueMany(jobs);
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
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const method = (job.options.method || 'POST').toUpperCase();
      const url = job.options.url;

      if (!url) {
        reject(new Error('Upload url is missing.'));
        return;
      }

      xhr.open(method, url, true);

      if (job.options.responseType) {
        xhr.responseType = job.options.responseType;
      }

      if (job.options.withCredentials) {
        xhr.withCredentials = true;
      }

      if (job.options.headers) {
        Object.entries(job.options.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }

      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (event.lengthComputable) {
          job.progress = Math.round((event.loaded / event.total) * 100);
          this.app.services.events.trigger(UploadServiceEvents.PROGRESS, { job });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response ?? xhr.responseText);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}.`));
        }
      };

      xhr.onerror = () => reject(new Error('Upload failed due to a network error.'));
      xhr.onabort = () => reject(new Error('Upload was aborted.'));

      xhr.send(this.buildFormData(job));
    });
  }

  private buildFormData(job: UploadJob): FormData {
    const formData = new FormData();
    const fieldName = job.options.fieldName || 'file';

    if (job.options.data) {
      Object.entries(job.options.data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((entry) => formData.append(key, entry));
        } else if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
    }

    formData.append(fieldName, job.file);

    return formData;
  }

  private extractOptions(detail: any): UploadOptions {
    return {
      ...(detail.options || {}),
      ...(detail.component?.options?.upload || {}),
    };
  }
}
