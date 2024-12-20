import fs from 'fs'
import {createGzip} from 'zlib'

import FormData from 'form-data'

import {RequestBuilder} from './interfaces'
import {retryRequest} from './retry'

/** Multipart payload destined to be sent to Kloudfuse's API
 */
export interface MultipartPayload {
  content: Map<string, MultipartValue>
}

export type MultipartValue = MultipartStringValue | MultipartFileValue

export interface MultipartStringValue {
  type: 'string'
  value: string
  options: FormData.AppendOptions
}

export interface MultipartFileValue {
  type: 'file'
  path: string
  options: FormData.AppendOptions
}

export interface UploadOptions {
  /** Retries is the amount of upload retries before giving up. Some requests are never retried
   * (400, 413).
   */
  retries: number

  /** Whether to gzip the request */
  useGzip?: boolean

  /** Callback when upload fails (retries are not considered as failure)
   */
  onError(error: Error): void

  /** Callback to execute before retries
   */
  onRetry(error: Error, attempts: number): void

  /** Callback to execute before upload.
   */
  onUpload(): void
}

export enum UploadStatus {
  Success,
  Failure,
  Skipped,
}

/** Upload a MultipartPayload to Kloudfuse's API using the provided RequestBuilder.
 * This handles retries as well as logging information about upload if a logger is provided in
 * the options
 */
export const upload =
  (requestBuilder: RequestBuilder) =>
  async (payload: MultipartPayload, opts: UploadOptions): Promise<UploadStatus> => {
    opts.onUpload()
    try {
      await retryRequest(() => uploadMultipart(requestBuilder, payload, opts.useGzip ?? false), {
        onRetry: opts.onRetry as ((e: unknown, attempt: number) => any) | undefined,
        retries: opts.retries,
      })

      return UploadStatus.Success
    } catch (error) {
      if (error.response && error.response.statusText) {
        // Rewrite error to have formatted error string
        opts.onError(new Error(`${error.message} (${error.response.statusText})`))
      } else {
        // Default error handling
        opts.onError(error)
      }

      return UploadStatus.Failure
    }
  }

// Dependency follows-redirects sets a default maxBodyLength of 10 MB https://github.com/follow-redirects/follow-redirects/blob/b774a77e582b97174813b3eaeb86931becba69db/index.js#L391
// We don't want any hard limit enforced by the CLI, the backend will enforce a max size by returning 413 errors.
const maxBodyLength = Infinity

const gzipFile = async (filename: string) => {
  return new Promise<void>((resolve) => {
    fs.createReadStream(filename)
      .pipe(createGzip())
      .pipe(fs.createWriteStream(`${filename}.gz`))
      .on('finish', resolve)
  })
}

const uploadMultipart = async (request: RequestBuilder, payload: MultipartPayload, useGzip: boolean) => {
  const form = new FormData()
  payload.content.forEach(async (value: MultipartValue, key: string) => {
    switch (value.type) {
      case 'string':
        form.append(key, value.value, value.options)
        break
      case 'file':
        const filename = value.path
        const gzipReadStream = fs.createReadStream(filename)
          .pipe(createGzip());
        form.append(key, gzipReadStream, value.options)
        break
    }
  })

  let data: any = form
  let headers = form.getHeaders()
  // if (useGzip) {
  //   const gz = createGzip()
  //   data = data.pipe(gz)
  //   headers = {
  //     'Content-Encoding': 'gzip',
  //     ...headers,
  //   }
  // }
  //

  headers = {
    'Content-Type': 'multipart/form-data',
  };

  return request({
    data,
    headers,
    maxBodyLength,
    method: 'POST',
    url: 'v1/input',
  })
}
