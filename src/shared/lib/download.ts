/**
 * Persuades the browser to download the given Blob under the specified filename.
 *
 * Creates temp object URL, attaches it to a hidden anchor element, clicks it,
 * and cleans up both the anchor and the URL after a short delay. Safe to call
 * multiple times in a row — each call uses its own URL.
 *
 * @param blob - Content to download. The MIME type is preserved inside blob-object and
 *   passed to the browser as the file's content type.
 * @param filename - Name of the file to save, including extension.
 *   The browser may append a numeric suffix if a file with the same name
 *   already exists in the download folder.
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 5000);
}
