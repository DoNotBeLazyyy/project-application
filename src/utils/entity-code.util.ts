const STOP_WORDS = new Set([
    'AND', 'OR', 'OF', 'TO', 'IN', 'FOR', 'WITH', 'A', 'AN', 'THE', 'ON', 'AT', 'BY', 'FROM', '&'
]);

/**
 * Clean string and split into meaningful uppercase words
 */
export function extractWords(text: string, filterStopWords = true): string[] {
    if (!text || !text.trim()) return [];
    const clean = text.trim()
        .replace(/[^a-zA-Z0-9\s]/g, ' ');
    const rawWords = clean.split(/\s+/)
        .filter(Boolean);
    if (!filterStopWords) return rawWords;

    const significant = rawWords.filter((w) => !STOP_WORDS.has(w.toUpperCase()));
    return significant.length > 0
        ? significant
        : rawWords;
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
        return word.slice(0, 4)
            .toUpperCase();
    }

    let acronym = '';
    for (const w of words) {
        if (/^\d+$/.test(w)) {
            acronym += w;
        }
        else {
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
    const existingSet = new Set(existingCodes
        .filter(Boolean)
        .map((c) => c.trim()
            .toUpperCase()));

    if (!existingSet.has(candidate.toUpperCase())) return candidate;

    const sep = candidate.toLowerCase() === candidate && candidate.includes('_')
        ? '_'
        : '-';
    let seq = 2;
    let nextCandidate = `${candidate}${sep}${seq}`;
    while (existingSet.has(nextCandidate.toUpperCase())) {
        seq += 1;
        nextCandidate = `${candidate}${sep}${seq}`;
    }
    return nextCandidate;
}

const ORG_PREFIX_MAP: Record<string, string> = {
    COLLEGE: 'CO',
    DEPARTMENT: 'DE',
    SCHOOL: 'SC',
    FACULTY: 'FA',
    INSTITUTE: 'IN',
    DIVISION: 'DI'
};

/**
 * System-generates a unique Department Code based on department name.
 * e.g., "College of Education" / "College of Educ" -> "COEDU"
 * "College of Engineering" -> "COENG"
 * "Department of Education" / "Department of Educ" -> "DEEDU"
 * "Department of Engineering" -> "DEENG"
 * "School of Business" -> "SCBUS"
 * "Computer Science" -> "CS"
 * "Information Technology" -> "IT"
 * "Mathematics" -> "MATH"
 */
export function generateDepartmentCode(name: string, existingCodes?: string[]): string {
    if (!name || !name.trim()) return '';
    const clean = name.trim()
        .replace(/[^a-zA-Z0-9\s]/g, ' ');
    const rawWords = clean.split(/\s+/)
        .filter(Boolean);
    const stopWords = new Set(['AND', 'OR', 'OF', 'TO', 'IN', 'FOR', 'WITH', 'THE', 'A', 'AN', 'AT', 'BY', '&']);
    const words = rawWords.filter((w) => !stopWords.has(w.toUpperCase()));

    if (words.length === 0) return 'DEP';

    let code = '';
    const firstWordUpper = words[0].toUpperCase();
    const orgPrefix = ORG_PREFIX_MAP[firstWordUpper];

    if (orgPrefix && words.length > 1) {
        const disciplineWords = words.slice(1);
        if (disciplineWords.length === 1) {
            const discWord = disciplineWords[0].toUpperCase();
            code = `${orgPrefix}${discWord.slice(0, 3)}`;
        }
        else {
            const initials = disciplineWords.map((w) => w[0].toUpperCase())
                .join('');
            code = `${orgPrefix}${initials}`;
        }
    }
    else if (words.length === 1) {
        code = words[0].slice(0, 4)
            .toUpperCase();
    }
    else if (words.length === 2) {
        const w1 = words[0].toUpperCase();
        const w2 = words[1].toUpperCase();
        code = `${w1[0]}${w2[0]}`;
    }
    else {
        code = words.map((w) => w[0].toUpperCase())
            .join('');
    }

    return ensureUniqueCode(code, existingCodes);
}

/**
 * System-generates a unique Program Code based on program name.
 * e.g., "Bachelor of Science in Computer Science" -> "BSCS"
 * "Bachelor of Science in Information Technology" -> "BSIT"
 * "Bachelor of Science in Civil Engineering" -> "BSCE"
 * "Bachelor of Science in Computer Engineering" -> "BSCPE"
 * "Associate in Computer Technology" -> "ACT"
 */
export function generateProgramCode(name: string, existingCodes?: string[]): string {
    if (!name || !name.trim()) return '';
    const clean = name.trim()
        .replace(/[^a-zA-Z0-9\s]/g, ' ');
    const rawWords = clean.split(/\s+/)
        .filter(Boolean);
    const stopWords = new Set(['AND', 'OR', 'OF', 'TO', 'IN', 'FOR', 'WITH', 'THE', 'A', 'AN', 'AT', 'BY', '&']);
    const words = rawWords.filter((w) => !stopWords.has(w.toUpperCase()));

    if (words.length === 0) return 'PRG';

    let degree = '';
    let majorWords = words;

    const firstWord = words[0].toUpperCase();
    const secondWord = words.length > 1
        ? words[1].toUpperCase()
        : '';

    if (firstWord.startsWith('BACHELOR')) {
        degree = secondWord.startsWith('ARTS')
            ? 'BA'
            : 'BS';
        majorWords = words.slice(secondWord.startsWith('SCIENCE') || secondWord.startsWith('ARTS')
            ? 2
            : 1);
    }
    else if (firstWord.startsWith('MASTER')) {
        degree = secondWord.startsWith('ARTS')
            ? 'MA'
            : 'MS';
        majorWords = words.slice(secondWord.startsWith('SCIENCE') || secondWord.startsWith('ARTS')
            ? 2
            : 1);
    }
    else if (firstWord.startsWith('DOCTOR')) {
        degree = 'PHD';
        majorWords = words.slice(1);
    }
    else if (firstWord.startsWith('ASSOCIATE')) {
        degree = 'ACT';
        majorWords = words.slice(1);
    }

    let majorCode = '';
    if (majorWords.length === 0) {
        majorCode = words.map((w) => w[0].toUpperCase())
            .join('');
    }
    else if (majorWords.length === 1) {
        majorCode = majorWords[0].slice(0, 4)
            .toUpperCase();
    }
    else if (majorWords.length === 2) {
        const mw1 = majorWords[0].toUpperCase();
        const mw2 = majorWords[1].toUpperCase();
        if (mw1 === 'COMPUTER' && mw2.startsWith('ENG')) {
            majorCode = 'CPE';
        }
        else if (mw1 === 'INDUSTRIAL') {
            majorCode = 'INDT';
        }
        else if (mw1 === 'ELECTRICAL') {
            majorCode = 'EE';
        }
        else if (mw1 === 'ELECTRONICS') {
            majorCode = 'ECE';
        }
        else if (mw1 === 'MECHANICAL') {
            majorCode = 'ME';
        }
        else if (mw1 === 'CHEMICAL') {
            majorCode = 'CHE';
        }
        else {
            majorCode = (mw1[0] + mw2[0]).toUpperCase();
        }
    }
    else {
        majorCode = majorWords.map((w) => w[0].toUpperCase())
            .join('');
    }

    const fullCode = degree
        ? `${degree}${majorCode}`
        : majorCode;
    return ensureUniqueCode(fullCode, existingCodes);
}

/**
 * System-generates a unique Course Type Code based on label.
 * e.g., "Lecture" -> "LEC", "Laboratory" -> "LAB", "Tutorial" -> "TUT"
 */
export function generateCourseTypeCode(label: string, existingCodes?: string[]): string {
    if (!label || !label.trim()) return '';
    const trimmed = label.trim()
        .toUpperCase();
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
    const trimmed = label.trim()
        .toUpperCase();
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
 * System-generates a unique Role Code based on label.
 * e.g., "Dean Secretary" -> "DEAN_SECRETARY", "Department Head" -> "DEPARTMENT_HEAD"
 */
export function generateRoleCode(label: string, existingCodes?: string[]): string {
    if (!label || !label.trim()) return '';
    const clean = label.trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    const candidate = clean || 'ROLE';
    return ensureUniqueCode(candidate, existingCodes);
}

/**
 * System-generates a unique Special Grade Code based on label.
 * e.g., "Incomplete" -> "INC", "Failure Due to Absences" -> "FDA", "Dropped" -> "DRP"
 */
export function generateSpecialGradeCode(label: string, existingCodes?: string[]): string {
    if (!label || !label.trim()) return '';
    const trimmed = label.trim()
        .toUpperCase();
    if (trimmed.startsWith('INCOMPLETE')) return ensureUniqueCode('INC', existingCodes);
    if (trimmed.startsWith('DROPPED') || trimmed.startsWith('DROP')) return ensureUniqueCode('DRP', existingCodes);
    if (trimmed.startsWith('WITHDRAW') || trimmed.startsWith('WITHDRAWAL')) return ensureUniqueCode('W', existingCodes);
    if (trimmed.includes('FAILURE DUE TO ABSENCE')) return ensureUniqueCode('FDA', existingCodes);
    if (trimmed.includes('NO GRADE')) return ensureUniqueCode('NG', existingCodes);
    if (trimmed.includes('OFFICIAL DROP')) return ensureUniqueCode('OD', existingCodes);

    const acronym = generateAcronym(label, 'SPG');
    return ensureUniqueCode(acronym, existingCodes);
}

/**
 * System-generates a unique Academic Threshold Code based on label.
 * e.g., "Summa Cum Laude" -> "summa_cum_laude", "Good Standing" -> "good_standing"
 */
export function generateAcademicThresholdCode(label: string, existingCodes?: string[]): string {
    if (!label || !label.trim()) return '';
    const clean = label.trim()
        .replace(/['’]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    const candidate = clean || 'threshold';
    return ensureUniqueCode(candidate, existingCodes);
}