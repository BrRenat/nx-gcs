import path from 'path'

import mime from 'mime'
import { glob } from 'glob'
import debug from 'debug'
import Bottleneck from 'bottleneck'
import { Storage, BucketMetadata, Bucket } from '@google-cloud/storage'

import { parseEnvObj } from './parse-env'

export type GCloudOptions = {
  keyFilename: string
  bucketName: string
  sources: string[]
  bucketDir: string
  baseDir?: string
  failEmpty?: boolean
  gzip?: string[]
  access?: string
  retries?: number
  concurrent?: number
  cwd?: string
  metadata?: BucketMetadata
}

const log = debug('NX_GCS')

type UploadFileOptions = {
  baseDir: GCloudOptions['baseDir']
  bucketDir: GCloudOptions['bucketDir']
  access: GCloudOptions['access']
  gzipSet: Set<string>
  metadata: GCloudOptions['metadata']
}

async function uploadFile(file: string, bucket: Bucket, { bucketDir, access, gzipSet, metadata, baseDir }: UploadFileOptions) {
  const opts = {
    destination: `${bucketDir}/${baseDir ? file.replace(`${baseDir}/`, '') : file}`,
    resumable: false,
    public: access === 'public',
    gzip: gzipSet.has(path.extname(file)),
    metadata: {
      contentType: mime.getType(file) || 'application/octet-stream',
      cacheControl: 'public, max-age=31536000',
      ...metadata,
    },
  }

  const [result] = await bucket.upload(file, opts)

  log('file %s uploaded', result.name)

  return result
}

export const gcloud = async (options: GCloudOptions) => {
  const {
    keyFilename,
    bucketName,
    sources,
    bucketDir,
    cwd,
    gzip,
    baseDir,
    failEmpty,
    retries = 3,
    concurrent = 1,
    metadata = {},
    access = 'private',
  } = parseEnvObj(options)

  log('called with: %o)', {
    keyFilename,
    bucketName,
    sources,
    bucketDir,
    cwd,
    metadata,
    access,
    gzip,
  })

  const limiter = new Bottleneck({
    maxConcurrent: concurrent,
  })

  const ctx: { success?: boolean; uploaded: string[]; err?: unknown } = { uploaded: [] }

  const gcs = new Storage({ keyFilename })
  const bucket = gcs.bucket(bucketName)

  log('bucket: %s', bucketName)

  const [firstFile, ...queuedFiles] = sources.flatMap((source) => glob.sync(source, { cwd, nodir: true }))

  log('uploading files: %o', [firstFile, ...queuedFiles])

  if (!firstFile) {
    ctx.success = !failEmpty
    log('no files for uploading')
    return ctx
  }

  const gzipSet = gzip && gzip.length ? new Set<string>(gzip) : new Set<string>()

  try {
    const pRetry = (await import('p-retry')).default
    // firstly try to upload one file (check credentials, destination conflict)
    await uploadFile(firstFile, bucket, { bucketDir, access, gzipSet, baseDir, metadata })

    // bulk upload files with retries and rate limit
    const uploadJobs = queuedFiles.map((filePath) => {
      return pRetry(() => uploadFile(filePath, bucket, { bucketDir, access, baseDir, gzipSet, metadata }), { retries })
    })

    await limiter.schedule(() => Promise.all(uploadJobs))

    log('uploading files to Google Cloud Storage completed')
    ctx.success = true
  } catch (err) {
    log('uploading files to Google Cloud Storage failed', err)
    ctx.success = false
    ctx.err = err
  }

  return ctx
}
