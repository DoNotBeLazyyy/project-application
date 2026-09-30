import { describe, expect, it } from 'vitest';
import { QUESTION_COLUMNS, validateUniqueQuestion } from '../pages/admin/evaluation-management/EvaluationTemplateForm';

describe('EvaluationTemplateForm mobile responsiveness & validation', () => {
    it('sets a minimum width on the question_text column to prevent crushing on mobile screens', () => {
        const questionColumn = QUESTION_COLUMNS.find((col) => col.key === 'question_text');
        expect(questionColumn).toBeDefined();
        expect(questionColumn?.minWidth).toBeGreaterThanOrEqual(280);
        expect(questionColumn?.flex).toBe(1);
    });

    it('sets appropriate width for required column', () => {
        const requiredColumn = QUESTION_COLUMNS.find((col) => col.key === 'is_required');
        expect(requiredColumn).toBeDefined();
        expect(requiredColumn?.width).toBe(80);
    });

    it('validates unique questions correctly', () => {
        const formValues = {
            questions: [
                { question_text: 'Explains concepts clearly', is_required: true },
                { question_text: 'Provides timely feedback', is_required: true }
            ]
        };

        expect(validateUniqueQuestion('Explains concepts clearly', formValues)).toBe(true);
        expect(validateUniqueQuestion('Unique question', formValues)).toBe(true);

        const duplicateFormValues = {
            questions: [
                { question_text: 'Explains concepts clearly', is_required: true },
                { question_text: 'explains concepts clearly ', is_required: true }
            ]
        };
        expect(validateUniqueQuestion('Explains concepts clearly', duplicateFormValues)).toBe('Question must be unique');
    });

    it('handles empty or whitespace strings in unique question validator', () => {
        const formValues = {
            questions: [
                { question_text: '', is_required: true },
                { question_text: '   ', is_required: true }
            ]
        };
        expect(validateUniqueQuestion('', formValues)).toBe(true);
        expect(validateUniqueQuestion('   ', formValues)).toBe(true);
    });
});
