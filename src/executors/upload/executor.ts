import { gcloud, type GCloudOptions } from '../../utils/gcloud'

export type UploadExecutorSchema = GCloudOptions

export default async function runExecutor(options: UploadExecutorSchema) {
  try {
    const result = await gcloud(options)

    return result
  } catch (err) {
    console.error(err)

    return { success: false }
  }
}
