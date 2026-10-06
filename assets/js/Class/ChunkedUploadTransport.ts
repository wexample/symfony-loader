import type UploadService from '../Services/UploadService';
import type { UploadJob, UploadTransport } from '../Services/UploadService';

// A file sent in pieces, one request each: a size no server limit on one
// request stands in the way of, and a piece lost on the way is sent again
// rather than the whole file. Where it goes is the job's `path` — an address
// the server signed for one directory —, how big each piece is its
// `chunkSize`, both said by the page that offered the upload.
export default class ChunkedUploadTransport implements UploadTransport {
  public static DEFAULT_CHUNK_SIZE = 1024 * 1024;
  public static RETRIES = 3;

  constructor(private readonly service: UploadService) {
  }

  async upload(job: UploadJob): Promise<any> {
    const path = job.options.path;

    if (!path) {
      throw new Error(`No address to send "${job.file.name}" to.`);
    }

    const chunkSize = Math.max(64 * 1024, job.options.chunkSize || ChunkedUploadTransport.DEFAULT_CHUNK_SIZE);
    const total = job.file.size;
    const uploadId = job.id;
    let offset = 0;
    let response: any = null;

    // An empty file still makes one request: it has to exist on the other side.
    do {
      const chunk = job.file.slice(offset, offset + chunkSize);
      response = await this.sendWithRetries(job, path, {
        upload_id: uploadId,
        file_name: job.file.name,
        offset,
        total,
      }, chunk);
      offset += chunk.size;
    } while (offset < total);

    return response;
  }

  private async sendWithRetries(job: UploadJob, path: string, fields: Record<string, any>, chunk: Blob): Promise<any> {
    let attempt = 0;

    for (;;) {
      try {
        return await this.send(job, path, fields, chunk);
      } catch (error) {
        if (job.signal?.aborted || ++attempt >= ChunkedUploadTransport.RETRIES) {
          throw error;
        }
      }
    }
  }

  private send(job: UploadJob, path: string, fields: Record<string, any>, chunk: Blob): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const body = new FormData();

      Object.entries(fields).forEach(([key, value]) => body.append(key, String(value)));
      body.append(job.options.fieldName || 'chunk', chunk, job.file.name);

      xhr.open(job.options.method || 'POST', path);
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      Object.entries(job.options.headers || {}).forEach(([key, value]) => xhr.setRequestHeader(key, value));
      xhr.responseType = 'json';

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && job.file.size > 0) {
          this.service.updateProgress(job, ((fields.offset + event.loaded) / job.file.size) * 100);
        }
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300
        ? resolve(xhr.response)
        : reject(Object.assign(new Error(xhr.response?.error || `Upload failed (${xhr.status}).`), { status: xhr.status })));
      xhr.onerror = () => reject(new Error('Upload failed: the connection was lost.'));
      xhr.onabort = () => reject(Object.assign(new Error('Upload cancelled.'), { cancelled: true }));

      job.signal?.addEventListener('abort', () => xhr.abort(), { once: true });
      xhr.send(body);
    });
  }
}
