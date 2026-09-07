/** Media library + product image management. */
export {
  ALLOWED_IMAGE_MIME,
  MAX_MEDIA_IMAGE_BYTES,
  validateImageUpload,
  assertSafeStoragePath,
  buildProductImagePath,
  buildGeneralMediaPath,
} from "@/features/media/validation";
export { MediaPicker } from "@/features/media/components/MediaPicker";
export { UploadDropzone } from "@/features/media/components/UploadDropzone";
export type { MediaPickerSelection } from "@/features/media/components/MediaPicker";
