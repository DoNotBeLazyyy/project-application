export const MATERIAL_URL_PATTERN = {
    message: 'Enter a valid URL starting with http:// or https://',
    value: /^https?:\/\/\S+$/i
};

export function isBlankText(value: unknown): boolean {
    return !String(value ?? '')
        .trim();
}