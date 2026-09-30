import { describe, expect, it } from 'vitest';
import { validateUniqueQuestion } from '../pages/admin/evaluation-management/EvaluationTemplateForm';

describe('EvaluationTemplateForm validation', () => {
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
