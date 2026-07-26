export const QUESTIONS_PER_PAGE = 10;

export const EVALUATION_SCOPE_OPTIONS = [
    { label: 'Per Grading Period', value: 'Period' },
    { label: 'Per Term', value: 'Term' }
];

export const TERM_EVALUATION_SCOPE_OPTIONS = [
    { label: 'Use institution default', value: '' },
    ...EVALUATION_SCOPE_OPTIONS
];

export const EVALUATION_SCOPE_HELPER = 'Per Grading Period asks students for one evaluation each Prelim, Midterm and Finals. Per Term asks for a single evaluation covering the whole term.';