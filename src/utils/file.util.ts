const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];

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
    URL.revokeObjectURL(url);
}