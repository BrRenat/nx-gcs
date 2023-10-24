import executor, { UploadExecutorSchema } from '../src/executors/upload/executor'

describe('Upload Executor', () => {
  it('can upload to bucket', async () => {
    const options: UploadExecutorSchema = {
      keyFilename: './gcs.json',
      bucketName: 'react-cdn.streamlayer.io',
      sources: ['./dist/**/*'],
      baseDir: 'dist',
      failEmpty: true,
      bucketDir: 'gcs-test',
      access: 'private'
    }

    const output = await executor(options)

    expect(output.success).toBe(true)
  }, 60000)
})
