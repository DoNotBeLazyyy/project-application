import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { announceFormError } from '@utils/form.util';
import { describe, expect, it } from 'vitest';

describe('CommonInfoTooltip - Form Error & Focus Auto-Display', () => {
    it('automatically opens error tooltip when input in the same container receives focus', () => {
        render(
            <div className="flex flex-col">
                <CommonInfoTooltip
                    content="First name is required"
                    label="This field has a problem"
                    variant="error"
                />
                <input
                    name="first_name"
                    placeholder="First Name"
                />
            </div>
        );

        const button = screen.getByRole('button', { name: 'This field has a problem' });
        expect(button)
            .toHaveAttribute('aria-expanded', 'false');

        const input = screen.getByPlaceholderText('First Name');
        fireEvent.focusIn(input);

        expect(button)
            .toHaveAttribute('aria-expanded', 'true');
    });

    it('automatically opens when FORM_ERROR_EVENT is dispatched for its field', async() => {
        render(
            <div className="flex flex-col">
                <CommonInfoTooltip
                    content="Email is required"
                    label="This field has a problem"
                    variant="error"
                />
                <input
                    name="email"
                    placeholder="Email"
                />
            </div>
        );

        const button = screen.getByRole('button', { name: 'This field has a problem' });
        expect(button)
            .toHaveAttribute('aria-expanded', 'false');

        await act(async() => {
            announceFormError({
                count: 1,
                firstErrorField: 'email',
                message: 'Email is required'
            });
        });

        expect(button)
            .toHaveAttribute('aria-expanded', 'true');
    });

    it('opens by default when defaultOpen is true', () => {
        render(
            <div className="flex flex-col">
                <CommonInfoTooltip
                    content="Required field"
                    defaultOpen={true}
                    label="This field has a problem"
                    variant="error"
                />
                <input name="username" />
            </div>
        );

        const button = screen.getByRole('button', { name: 'This field has a problem' });
        expect(button)
            .toHaveAttribute('aria-expanded', 'true');
    });

    it('shows error icons simultaneously for multiple invalid fields in a form', () => {
        render(
            <form>
                <div className="flex flex-col">
                    <label>First Name</label>
                    <CommonInfoTooltip
                        content="First name is required"
                        label="First Name problem"
                        variant="error"
                    />
                    <input name="first_name" />
                </div>
                <div className="flex flex-col">
                    <label>Last Name</label>
                    <CommonInfoTooltip
                        content="Last name is required"
                        label="Last Name problem"
                        variant="error"
                    />
                    <input name="last_name" />
                </div>
            </form>
        );

        const errorButtons = screen.getAllByRole('button');
        expect(errorButtons)
            .toHaveLength(2);
        expect(screen.getByRole('button', { name: 'First Name problem' }))
            .toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Last Name problem' }))
            .toBeInTheDocument();
    });
});