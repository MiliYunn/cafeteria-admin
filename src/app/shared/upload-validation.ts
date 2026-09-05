export const ACCEPTED_FILES = '.jpg,.jpeg,.png,.webp,.gif,.pdf';
export function validateFile(file: Pick<File, 'name' | 'size'>): string | null {
  if (!/\.(jpe?g|png|webp|gif|pdf)$/i.test(file.name))
    return 'Choose a JPG, PNG, WebP, GIF, or PDF file.';
  if (file.size > 5 * 1024 * 1024) return 'The file must be 5 MB or smaller.';
  if (!file.size) return 'Empty files cannot be uploaded.';
  return null;
}
