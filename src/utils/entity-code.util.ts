const STOP_WORDS = new Set([
    'AND', 'OR', 'OF', 'TO', 'IN', 'FOR', 'WITH', 'A', 'AN', 'THE', 'ON', 'AT', 'BY', 'FROM', '&'
]);

/**
 * Clean string and split into meaningful uppercase words
 */
export function extractWords(text: string, filterStopWords = true): string[] {
    if (!text || !text.trim()) return [];
    const clean = text.trim().replace(/[^a-zA-Z0-9\s]/g, ' ');
    const rawWords = clean.split(/\s+/).filter(Boolean);
    if (!filterStopWords) return rawWords;

    const significant = rawWords.filter((w) => !STOP_WORDS.has(w.toUpperCase()));
    return significant.length > 0 ? significant : rawWords;
}

/**
 * Generate acronym initials from multiple words, or first 3-4 letters from a single word.
 */
export function generateAcronym(text: string, defaultPrefix = 'GEN'): string {
    const words = extractWords(text, true);
    if (words.length === 0) return defaultPrefix;

    if (words.length === 1) {
        const word = words[0];
        const match = word.match(/^([a-zA-Z]+)(\d*)$/);
        if (match) {
            return (match[1].slice(0, 4) + match[2]).toUpperCase();
        }
        return word.slice(0, 4).toUpperCase();
    }

    let acronym = '';
    for (const w of words) {
        if (/^\d+$/.test(w)) {
            acronym += w;
        } else {
            const letter = w[0].toUpperCase();
            const trailingDigits = w.match(/\d+$/)?.[0] || '';
            acronym += letter + trailingDigits;
        }
    }
    return acronym.toUpperCase() || defaultPrefix;
}

/**
 * Ensures code uniqueness against a set of existing codes by appending a numeric counter if needed.
 */
export function ensureUniqueCode(candidate: string, existingCodes?: string[]): string {
    if (!existingCodes || existingCodes.length === 0) return candidate;
    const existingSet = new Set(existingCodes.map((c) => c.trim().toUpperCase()));

    if (!existingSet.has(candidate.toUpperCase())) return candidate;

    let seq = 2;
    let nextCandidate = `${candidate}-${seq}`;
    while (existingSet.has(nextCandidate.toUpperCase())) {
        seq += 1;
        nextCandidate = `${candidate}-${seq}`;
    }
    return nextCandidate;
}

/**
 * System-generates a unique Department Code based on department name.
 * e.g., "College of Computer Studies" -> "CCS"
 * "College of Engineering" -> "COE"
 * "Mathematics" -> "MATH"
 */
export function generateDepartmentCode(name: string, existingCodes?: string[]): string {
    if (!name || !name.trim()) return '';
    const acronym = generateAcronym(name, 'DEP');
    return ensureUniqueCode(acronym, existingCodes);
}

/**
 * System-generates a unique Program Code based on program name.
 * e.g., "Bachelor of Science in Computer Science" -> "BSCS"
 * "Bachelor of Science in Information Technology" -> "BSIT"
 * "Associate in Computer Technology" -> "ACT"
 */
export function generateProgramCode(name: string, existingCodes?: string[]): string {
    if (!name || !name.trim()) return '';
    const acronym = generateAcronym(name, 'PRG');
    return ensureUniqueCode(acronym, existingCodes);
}

/**
 * System-generates a unique Course Type Code based on label.
 * e.g., "Lecture" -> "LEC", "Laboratory" -> "LAB", "Tutorial" -> "TUT"
 */
export function generateCourseTypeCode(label: string, existingCodes?: string[]): string {
    if (!label || !label.trim()) return '';
    const trimmed = label.trim().toUpperCase();
    if (trimmed.startsWith('LECTURE')) return ensureUniqueCode('LEC', existingCodes);
    if (trimmed.startsWith('LABORATORY')) return ensureUniqueCode('LAB', existingCodes);
    if (trimmed.startsWith('TUTORIAL')) return ensureUniqueCode('TUT', existingCodes);
    if (trimmed.startsWith('CLINICAL')) return ensureUniqueCode('CLN', existingCodes);
    if (trimmed.startsWith('PRACTICUM')) return ensureUniqueCode('PRAC', existingCodes);

    const acronym = generateAcronym(label, 'CT');
    return ensureUniqueCode(acronym, existingCodes);
}

/**
 * System-generates a unique Program Level Code based on label.
 * e.g., "Undergraduate" -> "UG", "Postgraduate" -> "PG", "Graduate" -> "GRAD", "Doctorate" -> "DOC"
 */
export function generateProgramLevelCode(label: string, existingCodes?: string[]): string {
    if (!label || !label.trim()) return '';
    const trimmed = label.trim().toUpperCase();
    if (trimmed.startsWith('UNDERGRADUATE')) return ensureUniqueCode('UG', existingCodes);
    if (trimmed.startsWith('POSTGRADUATE')) return ensureUniqueCode('PG', existingCodes);
    if (trimmed.startsWith('GRADUATE')) return ensureUniqueCode('GRAD', existingCodes);
    if (trimmed.startsWith('DOCTORATE') || trimmed.startsWith('DOCTORAL')) return ensureUniqueCode('DOC', existingCodes);
    if (trimmed.startsWith('MASTERS') || trimmed.startsWith('MASTERAL')) return ensureUniqueCode('MST', existingCodes);
    if (trimmed.startsWith('SENIOR HIGH')) return ensureUniqueCode('SHS', existingCodes);

    const acronym = generateAcronym(label, 'LVL');
    return ensureUniqueCode(acronym, existingCodes);
}

/**
 * System-generates a unique Term Type Code based on label.
 * e.g., "1st Semester" -> "SEM-1", "2nd Semester" -> "SEM-2", "Summer" -> "SUMMER"
 */
export function generateTermTypeCode(label: string, existingCodes?: string[]): string {
    if (!label || !label.trim()) return '';
    const trimmed = label.trim().toUpperCase();
    const semMatch = trimmed.match(/(?:1ST|FIRST|1)\s*SEM/i);
    if (semMatch) return ensureUniqueCode('SEM-1', existingCodes);

    const sem2Match = trimmed.match(/(?:2ND|SECOND|2)\s*SEM/i);
    if (sem2Match) return ensureUniqueCode('SEM-2', existingCodes);

    const sem3Match = trimmed.match(/(?:3RD|THIRD|3)\s*SEM/i);
    if (sem3Match) return ensureUniqueCode('SEM-3', existingCodes);

    const triMatch = trimmed.match(/(?:1ST|FIRST|1)\s*TRI/i);
    if (triMatch) return ensureUniqueCode('TRI-1', existingCodes);

    const tri2Match = trimmed.match(/(?:2ND|SECOND|2)\s*TRI/i);
    if (tri2Match) return ensureUniqueCode('TRI-2', existingCodes);

    const tri3Match = trimmed.match(/(?:3RD|THIRD|3)\s*TRI/i);
    if (tri3Match) return ensureUniqueCode('TRI-3', existingCodes);

    if (trimmed.includes('SUMMER')) return ensureUniqueCode('SUMMER', existingCodes);
    if (trimmed.includes('MIDYEAR')) return ensureUniqueCode('MIDYEAR', existingCodes);

    const acronym = generateAcronym(label, 'TERM');
    return ensureUniqueCode(acronym, existingCodes);
}

/**
 * System-generates a unique Role Code based on label.
 * e.g., "Dean Secretary" -> "DEAN_SECRETARY", "Department Head" -> "DEPARTMENT_HEAD"
 */
export function generateRoleCode(label: string, existingCodes?: string[]): string {
    if (!label || !label.trim()) return '';
    const clean = label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const candidate = clean || 'ROLE';
    return ensureUniqueCode(candidate, existingCodes);
}

/**
 * System-generates a unique Special Grade Code based on label.
 * e.g., "Incomplete" -> "INC", "Failure Due to Absences" -> "FDA", "Dropped" -> "DRP"
 */
export function generateSpecialGradeCode(label: string, existingCodes?: string[]): string {
    if (!label || !label.trim()) return '';
    const trimmed = label.trim().toUpperCase();
    if (trimmed.startsWith('INCOMPLETE')) return ensureUniqueCode('INC', existingCodes);
    if (trimmed.startsWith('DROPPED') || trimmed.startsWith('DROP')) return ensureUniqueCode('DRP', existingCodes);
    if (trimmed.startsWith('WITHDRAW') || trimmed.startsWith('WITHDRAWAL')) return ensureUniqueCode('W', existingCodes);
    if (trimmed.includes('FAILURE DUE TO ABSENCE')) return ensureUniqueCode('FDA', existingCodes);
    if (trimmed.includes('NO GRADE')) return ensureUniqueCode('NG', existingCodes);
    if (trimmed.includes('OFFICIAL DROP')) return ensureUniqueCode('OD', existingCodes);

    const acronym = generateAcronym(label, 'SPG');
    return ensureUniqueCode(acronym, existingCodes);
}
