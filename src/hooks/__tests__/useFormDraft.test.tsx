import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonFormModal from '@components/modal/CommonFormModal';
import { hasRealFormChanges } from '@hooks/useFormDraft';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
    beforeEach, describe, expect, it, vi
} from 'vitest';

interface TestFormValues {
    department: string;
    description: string;
    name: string;
    password?: string;
}

const testFields: FormFieldConfig<TestFormValues>[] = [
    {
        label: 'Name', name: 'name', type: 'text'
    },
    {
        label: 'Description', name: 'description', type: 'text'
    },
    {
        label: 'Department', name: 'department', type: 'text'
    }
];

function TestComponent({
    defaultValues = {
        department: '', description: '', name: ''
    },
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

function TestModalForm({
    defaultValues = {
        department: 'Science', description: 'Initial desc', name: 'Biology'
    },
    formId = 'modal-test-form',
    onModalClosed
}: {
    defaultValues?: TestFormValues;
    formId?: string;
    onModalClosed?: VoidFunction;
}) {
    const [open, setOpen] = useState(true);
    const { control, handleSubmit } = useForm<TestFormValues>({
        defaultValues
    });

    return (
        <div>
            {!open && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                >
                    Reopen Modal
                </button>
            )}
            <CommonFormModal
                formContent={(
                    <CommonForm
                        control={control}
                        fields={testFields}
                        formProps={{ id: formId, onSubmit: handleSubmit(() => {}) }}
                    />
                )}
                formId={formId}
                open={open}
                onClose={() => {
                    setOpen(false);
                    onModalClosed?.();
                }}
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

        sessionStorage.setItem('au_draft_session_test-form', JSON.stringify(draftPayload));

        render(<TestComponent />);

        expect(screen.getByText(/Restore Unsaved Draft\?/i))
            .toBeInTheDocument();
        expect(screen.getByText(/You have unsaved changes from earlier/i))
            .toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Continue/i }))
            .toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Discard/i }))
            .toBeInTheDocument();
    });

    it('restores draft values into inputs when clicking Continue', async() => {
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

        expect(nameInput.value)
            .toBe('Restored Chemistry');
        expect(descInput.value)
            .toBe('Chemistry notes');
    });

    it('clears the draft and keeps blank inputs when clicking Discard', async() => {
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

        expect(sessionStorage.getItem('au_draft_session_test-form'))
            .toBeNull();

        const nameInput = container.querySelector('input[name="name"]') as HTMLInputElement;
        expect(nameInput.value)
            .toBe('');
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

    it('treats editing and reverting back to original value as no real changes and clears sessionStorage', async() => {
        expect(
            hasRealFormChanges(
                {
                    name: 'Biology', description: 'Initial desc', department: 'Science'
                },
                {
                    name: 'Biology', description: 'Initial desc', department: 'Science'
                }
            )
        )
            .toBe(false);

        const onModalClosed = vi.fn();
        render(<TestModalForm onModalClosed={onModalClosed} />);

        const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
        expect(nameInput.value)
            .toBe('Biology');

        // Edit value -> real change occurs and draft is saved
        fireEvent.change(nameInput, { target: { value: 'Biology Updated' } });
        await waitFor(() => {
            expect(sessionStorage.getItem('au_draft_session_modal-test-form')).not.toBeNull();
        });

        // Revert value back to original 'Biology' -> no real change and draft is removed
        fireEvent.change(nameInput, { target: { value: 'Biology' } });
        await waitFor(() => {
            expect(sessionStorage.getItem('au_draft_session_modal-test-form'))
                .toBeNull();
        });

        // Clicking Cancel closes immediately without Discard prompt
        const cancelBtn = screen.getByRole('button', { name: /^Cancel$/i });
        fireEvent.click(cancelBtn);

        expect(screen.queryByText(/Discard unsaved changes\?/i)).not.toBeInTheDocument();
        expect(onModalClosed)
            .toHaveBeenCalledTimes(1);
    });

    it('prompts Discard or Continue Editing when closing a form with real changes, and clears draft on Discard', async() => {
        const onModalClosed = vi.fn();
        render(<TestModalForm onModalClosed={onModalClosed} />);

        const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: 'Biology II' } });

        await waitFor(() => {
            expect(sessionStorage.getItem('au_draft_session_modal-test-form')).not.toBeNull();
        });

        // Attempt to close via Cancel button
        const cancelBtn = screen.getByRole('button', { name: /^Cancel$/i });
        fireEvent.click(cancelBtn);

        // Prompt should appear
        expect(screen.getByText(/Discard unsaved changes\?/i))
            .toBeInTheDocument();
        expect(onModalClosed).not.toHaveBeenCalled();

        // Click Continue Editing -> stays open, draft still present
        const continueEditingBtn = screen.getByRole('button', { name: /Continue Editing/i });
        fireEvent.click(continueEditingBtn);

        await waitFor(() => {
            expect(screen.queryByText(/Discard unsaved changes\?/i)).not.toBeInTheDocument();
        });
        expect(onModalClosed).not.toHaveBeenCalled();
        expect(sessionStorage.getItem('au_draft_session_modal-test-form')).not.toBeNull();

        // Attempt to close again and click Discard -> closes and clears draft so Restore Unsaved Draft will not appear
        fireEvent.click(cancelBtn);
        const discardBtn = screen.getByRole('button', { name: /^Discard$/i });
        fireEvent.click(discardBtn);

        expect(onModalClosed)
            .toHaveBeenCalledTimes(1);
        expect(sessionStorage.getItem('au_draft_session_modal-test-form'))
            .toBeNull();

        // Reopen modal -> should NOT show Restore Unsaved Draft
        const reopenBtn = screen.getByRole('button', { name: /Reopen Modal/i, hidden: true });
        fireEvent.click(reopenBtn);
        expect(screen.queryByText(/Restore Unsaved Draft\?/i)).not.toBeInTheDocument();
    });

    it('keeps draft in sessionStorage for Restore Unsaved Draft only when form closes unexpectedly (unmounts without programmed close)', async() => {
        const { unmount } = render(<TestModalForm />);

        const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: 'Unexpected Crash Edit' } });

        await waitFor(() => {
            expect(sessionStorage.getItem('au_draft_session_modal-test-form')).not.toBeNull();
        });

        // Simulate unexpected unmount (e.g., tab reload or route crash while modal is still open)
        unmount();

        expect(sessionStorage.getItem('au_draft_session_modal-test-form')).not.toBeNull();

        // Remounting the form now prompts Restore Unsaved Draft
        render(<TestModalForm />);
        expect(screen.getByText(/Restore Unsaved Draft\?/i))
            .toBeInTheDocument();
    });
});