import { areFormValuesEqual, hasRealFormChanges, useHasRealChanges } from '@hooks/use-has-real-changes';
import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

describe('areFormValuesEqual & hasRealFormChanges', () => {
    it('treats null, undefined, and empty string as equivalent', () => {
        expect(areFormValuesEqual(null, ''))
            .toBe(true);
        expect(areFormValuesEqual('', undefined))
            .toBe(true);
        expect(areFormValuesEqual(undefined, null))
            .toBe(true);
        expect(areFormValuesEqual('', ''))
            .toBe(true);
        expect(areFormValuesEqual(null, null))
            .toBe(true);
    });

    it('treats numeric strings and numbers as equivalent', () => {
        expect(areFormValuesEqual(100, '100'))
            .toBe(true);
        expect(areFormValuesEqual('42', 42))
            .toBe(true);
        expect(areFormValuesEqual(0, '0'))
            .toBe(true);
        expect(areFormValuesEqual(100, '101'))
            .toBe(false);
    });

    it('handles nested objects and arrays correctly', () => {
        const objA = {
            name: 'Item 1', count: 5, tags: ['a', 'b']
        };
        const objB = {
            name: 'Item 1', count: '5', tags: ['a', 'b']
        };
        expect(hasRealFormChanges(objA, objB))
            .toBe(false);

        const objModified = {
            name: 'Item 1', count: 6, tags: ['a', 'b']
        };
        expect(hasRealFormChanges(objModified, objA))
            .toBe(true);
    });

    it('returns false when a field is changed and reverted back to original', () => {
        const initial = {
            title: 'Hello', description: 'World', active: true
        };
        const modified = {
            title: 'Hello World', description: 'World', active: true
        };
        expect(hasRealFormChanges(modified, initial))
            .toBe(true);

        const reverted = {
            title: 'Hello', description: 'World', active: true
        };
        expect(hasRealFormChanges(reverted, initial))
            .toBe(false);
    });
});

describe('useHasRealChanges hook', () => {
    function FormTestComponent({ defaultValues = { title: 'Initial Title' } }: { defaultValues?: { title: string } }) {
        const { control, register } = useForm({ defaultValues });
        const hasChanges = useHasRealChanges(control);

        return (
            <div>
                <input
                    aria-label="Title"
                    {...register('title')}
                />
                <span data-testid="change-status">{hasChanges
                    ? 'HAS_CHANGES'
                    : 'NO_CHANGES'}</span>
            </div>
        );
    }

    it('accurately indicates changes and updates when reverted', () => {
        render(<FormTestComponent defaultValues={{ title: 'Original' }} />);
        const input = screen.getByLabelText('Title') as HTMLInputElement;
        const status = screen.getByTestId('change-status');

        expect(status.textContent)
            .toBe('NO_CHANGES');

        // Modify input
        fireEvent.change(input, { target: { value: 'Original modified' } });
        expect(status.textContent)
            .toBe('HAS_CHANGES');

        // Revert back to original
        fireEvent.change(input, { target: { value: 'Original' } });
        expect(status.textContent)
            .toBe('NO_CHANGES');
    });
});