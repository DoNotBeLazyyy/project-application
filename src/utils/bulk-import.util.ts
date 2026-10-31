// Finds the 1-based row a plain error message refers to: "Row 3 ..." or "<a value of that row>: ..."
export function findErrorRow(error: string, rows: Record<string, string>[]): number | null {
    const rowMatch = /^Row #?(\d+)\b/i.exec(error);
    if (rowMatch) return Number(rowMatch[1]);

    const subject = error.split(':')[0]
        .trim()
        .toLowerCase();
    if (!subject) return null;

    const index = rows.findIndex((row) => Object.values(row)
        .some((value) => String(value ?? '')
            .trim()
            .toLowerCase() === subject));
    return index >= 0
        ? index + 1
        : null;
}

export function getTargetEntityName(title?: string, entityName?: string): string {
    if (entityName?.trim()) return entityName.trim();
    if (title) {
        let cleaned = title.trim();
        cleaned = cleaned.replace(/\s*—\s*(preview|results)\s*$/i, '');
        cleaned = cleaned.replace(/\s*\(csv\)\s*$/i, '');
        cleaned = cleaned.replace(/^(bulk\s+)?(import|enroll|upload)\s+/i, '');
        cleaned = cleaned.trim();
        if (cleaned) return cleaned;
    }
    return 'Records';
}