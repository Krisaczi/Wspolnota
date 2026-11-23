import { isDesktop, saveReportBytes, type SavedFile } from '../../db/tauriBridge';

/**
 * Saves report bytes via the desktop save dialog, or downloads them through
 * the browser when running outside the desktop shell.
 */
export async function saveReport(
  defaultName: string,
  extension: string,
  filterName: string,
  mime: string,
  bytes: Uint8Array,
): Promise<SavedFile> {
  if (isDesktop()) {
    return saveReportBytes(defaultName, extension, filterName, bytes);
  }
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = defaultName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { path: defaultName, canceled: false };
}
