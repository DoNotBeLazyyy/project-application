export const MATERIAL_URL_PATTERN = {
    message: 'Enter a valid URL starting with http:// or https://',
    value: /^https?:\/\/\S+$/i
};

export function isBlankText(value: unknown): boolean {
    return !String(value ?? '')
        .trim();
}

/**
 * Storage refuses empty files with a confusing message, so they are caught when picked.
 * Returns the error to show, or null when the file can be uploaded.
 */
export function getEmptyFileError(file: File | null): string | null {
    if (file && file.size === 0) {
        return `"${file.name}" is empty (0 bytes). Choose a file that has content.`;
    }
    return null;
}