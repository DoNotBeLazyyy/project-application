import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

interface Values {
    title: string;
    code: string;
}

const FIELDS: FormFieldConfig<Values>[] = [
    {
        label: 'Title', name: 'title', rules: { required: 'Title is required' }, type: 'text'
    },
    {
        label: 'Code', name: 'code', rules: { required: 'Code is required' }, type: 'text'
    }
];

function TestForm() {
    const { control, handleSubmit } = useForm<Values>({
        defaultValues: { title: '', code: '' },
        mode: 'onSubmit',
        reValidateMode: 'onChange'
    });

    return (
        <form onSubmit={handleSubmit(() => {})}>
            <CommonForm
                component="div"
                control={control}
                enableDraftRecovery={false}
                fields={FIELDS}
            />
            <button type="submit">Save</button>
        </form>
    );
}

describe('CommonForm - error focus', () => {
    it('keeps focus in the field being fixed instead of jumping to the next error', async() => {
        const user = userEvent.setup();
        const { container } = render(<TestForm />);

        await user.click(screen.getByRole('button', { name: /save/i }));

        const titleInput = container.querySelector<HTMLInputElement>('input[name="title"]')!;
        await waitFor(() => expect(document.activeElement)
            .toBe(titleInput));

        // Fixing Title makes Code the first error; focus must stay in Title while typing
        await user.type(titleInput, 'Business');
        await new Promise((resolve) => setTimeout(resolve, 120));

        expect(titleInput.value)
            .toBe('Business');
        expect(document.activeElement)
            .toBe(titleInput);
    });
});