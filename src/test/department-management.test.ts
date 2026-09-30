import { describe, expect, it } from 'vitest';
import { getDepartmentFormFields } from '@pages/admin/department-management/DepartmentForm';

describe('DepartmentForm - Code and Name field configurations', () => {
    it('enables the department code field when isCodeDisabled is not provided (edit & create modes)', () => {
        const fields = getDepartmentFormFields(false, undefined);
        const codeField = fields.find((f) => f.name === 'code');

        expect(codeField).toBeDefined();
        expect(codeField?.disabled).toBeFalsy();
        expect(codeField?.rules).toEqual({ required: 'Department code is required' });
    });

    it('enables the department code field when isCodeDisabled is false', () => {
        const fields = getDepartmentFormFields(false, false);
        const codeField = fields.find((f) => f.name === 'code');

        expect(codeField).toBeDefined();
        expect(codeField?.disabled).toBeFalsy();
        expect(codeField?.rules).toEqual({ required: 'Department code is required' });
    });

    it('disables the department code field only when explicitly requested', () => {
        const fields = getDepartmentFormFields(false, true);
        const codeField = fields.find((f) => f.name === 'code');

        expect(codeField).toBeDefined();
        expect(codeField?.disabled).toBe(true);
        expect(codeField?.rules).toBeUndefined();
    });

    it('disables all fields including code and name when form disabled is true (view mode)', () => {
        const fields = getDepartmentFormFields(true, false);
        const codeField = fields.find((f) => f.name === 'code');
        const nameField = fields.find((f) => f.name === 'name');

        expect(codeField?.disabled).toBe(true);
        expect(nameField?.disabled).toBe(true);
    });

    it('enforces required rule on the name field', () => {
        const fields = getDepartmentFormFields(false);
        const nameField = fields.find((f) => f.name === 'name');

        expect(nameField).toBeDefined();
        expect(nameField?.disabled).toBeFalsy();
        expect(nameField?.rules).toEqual({ required: 'Department name is required' });
    });
});
