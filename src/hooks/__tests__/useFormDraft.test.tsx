import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface TestFormValues {
    department: string;
    description: string;
    name: string;
    password?: string;
}

const testFields: FormFieldConfig<TestFormValues>[] = [
    { label: 'Name', name: 'name', type: 'text' },
    { label: 'Description', name: 'description', type: 'text' },
    { label: 'Department', name: 'department', type: 'text' }
];

function TestComponent({
    defaultValues = { department: '', description: '', name: '' },
    formId = 'test-form',
    enableDraftRecovery
}: {
    defaultValues?: TestFormValues;
    formId?: string;
    enableDraftRecovery?: boolean;
}) {
    const { control, handleSubmit } = useForm<TestFormValues>({
        defaultValues
    });

    return (
        <div>
            <CommonForm
                control={control}
                enableDraftRecovery={enableDraftRecovery}
                fields={testFields}
                formProps={{ id: formId, onSubmit: handleSubmit(() => {}) }}
            />
        </div>
    );
}

describe('useFormDraft & CommonForm draft restoration', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    it('does not open prompt if no previous draft exists in sessionStorage', () => {
        render(<TestComponent />);
        expect(screen.queryByText(/Restore Unsaved Draft\?/i)).not.toBeInTheDocument();
    });

    it('prompts the user if an unsaved draft exists in sessionStorage', () => {
        const draftPayload = {
            pathname: window.location.pathname,
            timestamp: Date.now(),
            values: { name: 'Restored Biology', description: 'Bio department draft' }
        };

        // Key includes user prefix (defaulting to session or userId)
        const keys = Object.keys(sessionStorage);
        sessionStorage.setItem('au_draft_session_test-form', JSON.stringify(draftPayload));

        render(<TestComponent />);

        expect(screen.getByText(/Restore Unsaved Draft\?/i)).toBeInTheDocument();
        expect(screen.getByText(/You have unsaved changes from earlier/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Discard/i })).toBeInTheDocument();
    });

    it('restores draft values into inputs when clicking Continue', async () => {
        const draftPayload = {
            pathname: window.location.pathname,
            timestamp: Date.now(),
            values: { name: 'Restored Chemistry', description: 'Chemistry notes' }
        };
        sessionStorage.setItem('au_draft_session_test-form', JSON.stringify(draftPayload));

        const { container } = render(<TestComponent />);

        const continueBtn = screen.getByRole('button', { name: /Continue/i });
        fireEvent.click(continueBtn);

        await waitFor(() => {
            expect(screen.queryByText(/Restore Unsaved Draft\?/i)).not.toBeInTheDocument();
        });

        const nameInput = container.querySelector('input[name="name"]') as HTMLInputElement;
        const descInput = container.querySelector('input[name="description"]') as HTMLInputElement;

        expect(nameInput.value).toBe('Restored Chemistry');
        expect(descInput.value).toBe('Chemistry notes');
    });

    it('clears the draft and keeps blank inputs when clicking Discard', async () => {
        const draftPayload = {
            pathname: window.location.pathname,
            timestamp: Date.now(),
            values: { name: 'Discarded Name', description: 'Discarded desc' }
        };
        sessionStorage.setItem('au_draft_session_test-form', JSON.stringify(draftPayload));

        const { container } = render(<TestComponent />);

        const discardBtn = screen.getByRole('button', { name: /Discard/i });
        fireEvent.click(discardBtn);

        await waitFor(() => {
            expect(screen.queryByText(/Restore Unsaved Draft\?/i)).not.toBeInTheDocument();
        });

        expect(sessionStorage.getItem('au_draft_session_test-form')).toBeNull();

        const nameInput = container.querySelector('input[name="name"]') as HTMLInputElement;
        expect(nameInput.value).toBe('');
    });

    it('does not prompt when form is marked as filter form', () => {
        const draftPayload = {
            pathname: window.location.pathname,
            timestamp: Date.now(),
            values: { name: 'Filter Value' }
        };
        sessionStorage.setItem('au_draft_session_filter-courses-form', JSON.stringify(draftPayload));

        render(<TestComponent formId="filter-courses-form" />);

        expect(screen.queryByText(/Restore Unsaved Draft\?/i)).not.toBeInTheDocument();
    });
});
