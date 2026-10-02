/**
 * Generates an acronym or short slug from a course title.
 * Examples:
 * - "Data Structures and Algorithms" -> "DSA"
 * - "Object-Oriented Programming" -> "OOP"
 * - "Introduction to Computing" -> "IC"
 * - "Database Management Systems 1" -> "DBMS1"
 * - "Chemistry" -> "CHEM"
 * - "Calculus 2" -> "CALC2"
 */
export function generateTitleAcronym(title: string): string {
    if (!title || !title.trim()) return '';

    const STOP_WORDS = new Set([
        'AND', 'OR', 'OF', 'TO', 'IN', 'FOR', 'WITH', 'A', 'AN', 'THE', 'ON', 'AT', 'BY', 'FROM', '&'
    ]);

    // Clean special characters except letters, digits, and spaces
    const cleanTitle = title.trim().replace(/[^a-zA-Z0-9\s]/g, ' ');
    const rawWords = cleanTitle.split(/\s+/).filter(Boolean);

    if (rawWords.length === 0) return '';

    // Filter out stop words
    const significantWords = rawWords.filter((w) => !STOP_WORDS.has(w.toUpperCase()));
    const wordsToUse = significantWords.length > 0 ? significantWords : rawWords;

    if (wordsToUse.length === 1) {
        const word = wordsToUse[0];
        const match = word.match(/^([a-zA-Z]+)(\d*)$/);
        if (match) {
            const textPart = match[1].slice(0, 4).toUpperCase();
            const numPart = match[2];
            return `${textPart}${numPart}`;
        }
        return word.slice(0, 4).toUpperCase();
    }

    // Multiple words: extract initials and any trailing number
    let acronym = '';
    for (let i = 0; i < wordsToUse.length; i++) {
        const w = wordsToUse[i];
        if (/^\d+$/.test(w)) {
            acronym += w;
        } else {
            const letter = w[0].toUpperCase();
            const trailingDigits = w.match(/\d+$/)?.[0] || '';
            acronym += letter + trailingDigits;
        }
    }

    return acronym.toUpperCase();
}

export interface GenerateCourseCodeParams {
    departmentCode?: string;
    departmentName?: string;
    title: string;
    courseCount: number;
    existingCodes?: string[];
}

/**
 * System-generates a standardized course code based on:
 * 1. Department code (or department name acronym)
 * 2. Course title acronym/slug
 * 3. Incrementation based on how many courses the department currently has
 *
 * Example:
 * Department: CS, Title: "Data Structures and Algorithms", Count: 0 -> "CS-DSA101"
 * Department: IT, Title: "Introduction to Computing", Count: 1 -> "IT-IC102"
 */
export function generateCourseCode({
    departmentCode,
    departmentName,
    title,
    courseCount,
    existingCodes = []
}: GenerateCourseCodeParams): string {
    const acronym = generateTitleAcronym(title);
    if (!acronym) return '';

    // Resolve department prefix
    let deptPrefix = (departmentCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!deptPrefix && departmentName) {
        deptPrefix = generateTitleAcronym(departmentName).slice(0, 4);
    }
    if (!deptPrefix) {
        deptPrefix = 'CRS';
    }

    // Incrementation starts at 101 + existing course count
    let increment = 101 + Math.max(0, courseCount);
    let codeCandidate = `${deptPrefix}-${acronym}${increment}`;

    // Normalize existing codes for collision avoidance
    const normalizedExisting = new Set(existingCodes.map((c) => c.toUpperCase().trim()));

    // Increment until a unique code is found
    while (normalizedExisting.has(codeCandidate)) {
        increment += 1;
        codeCandidate = `${deptPrefix}-${acronym}${increment}`;
    }

    return codeCandidate;
}
