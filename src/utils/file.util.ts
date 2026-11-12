const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];

// Largest file anyone can upload, matching the default "max upload size" system setting
export const MAX_UPLOAD_SIZE_MB = 25;

// Files that can run code on someone's computer are never accepted
const BLOCKED_UPLOAD_EXTENSIONS = ['bat', 'cmd', 'com', 'exe', 'msi', 'ps1', 'scr', 'sh', 'vbs'];

export interface UploadFileRules {
    // Extensions without the dot, e.g. ['pdf', 'docx']; leave out to allow any safe type
    allowedExtensions?: string[];
    maxSizeMb?: number;
}

/**
 * Gets a file's extension in lower case, without the dot.
 *
 * @param fileName - The file name, e.g. "Report.PDF".
 * @returns The extension, e.g. "pdf", or an empty string.
 */
export function getFileExtension(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.');

    return dotIndex > 0
        ? fileName.slice(dotIndex + 1)
            .toLowerCase()
        : '';
}

/**
 * Checks a file before upload, so a bad file is refused with a clear message.
 *
 * @param file - The chosen file.
 * @param rules - Size and type limits.
 * @returns A message saying what is wrong, or null when the file is fine.
 */
export function getUploadFileError(file: File, rules: UploadFileRules = {}): string | null {
    const maxSizeMb = rules.maxSizeMb ?? MAX_UPLOAD_SIZE_MB;
    const extension = getFileExtension(file.name);

    if (file.size === 0) {
        return `"${file.name}" is empty. Choose a file that has content.`;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
        return `"${file.name}" is larger than ${maxSizeMb} MB.`;
    }

    if (BLOCKED_UPLOAD_EXTENSIONS.includes(extension)) {
        return `"${file.name}" is a program file and cannot be uploaded.`;
    }

    const allowed = (rules.allowedExtensions ?? [])
        .map((item) => item.trim()
            .replace(/^\./, '')
            .toLowerCase())
        .filter(Boolean);

    if (allowed.length && !allowed.includes(extension)) {
        return `"${file.name}" is not an allowed file type. Allowed: ${allowed.join(', ')}.`;
    }

    return null;
}

/**
 * Builds a storage path that is safe for any file name, including spaces, # and emoji.
 * A random folder keeps two files with the same name apart.
 *
 * @param folder - The folder to store under, e.g. a section id.
 * @param fileName - The original file name.
 * @returns The storage path.
 */
export function buildStoragePath(folder: string, fileName: string): string {
    const safeName = fileName.replace(/[^\w.-]+/g, '_') || 'file';

    return `${folder}/${crypto.randomUUID()}/${safeName}`;
}

export function formatFileSize(bytes: number | null): string {
    if (bytes === null || Number.isNaN(bytes) || bytes < 0) {
        return '';
    }

    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < FILE_SIZE_UNITS.length - 1) {
        value = value / 1024;
        unitIndex = unitIndex + 1;
    }

    const rounded = unitIndex === 0
        ? String(value)
        : value.toFixed(1);

    return `${rounded} ${FILE_SIZE_UNITS[unitIndex]}`;
}

export function isImageFile(mimeType: string | null, fileName: string): boolean {
    if (mimeType && mimeType.startsWith('image/')) {
        return true;
    }

    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName);
}

export function extractClipboardFiles(clipboardData: DataTransfer | null): File[] {
    if (!clipboardData) {
        return [];
    }

    const items = Array.from(clipboardData.items);

    return items
        .filter(function(item) {
            return item.kind === 'file';
        })
        .map(function(item) {
            return item.getAsFile();
        })
        .filter(function(file): file is File {
            return file !== null;
        });
}

/**
 * Triggers a browser file download of CSV content with UTF-8 BOM encoding
 * so applications like Microsoft Excel correctly render special characters.
 */
export function exportCsvFile(filename: string, csvContent: string): void {
    const safeFilename = filename.endsWith('.csv')
        ? filename
        : `${filename}.csv`;
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', safeFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Triggers a direct file download in the browser, fetching as a Blob when possible
 * to prevent browsers from opening images or media in a new tab.
 */
export async function triggerFileDownload(url: string, filename: string): Promise<void> {
    if (!url) return;

    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    }
    catch {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'download';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}