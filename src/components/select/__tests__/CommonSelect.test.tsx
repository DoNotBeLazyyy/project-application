import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('CommonSelect', () => {
    it('displays "No option available" and is disabled/unclickable when options are empty', () => {
        render(
            <CommonSelect
                options={[]}
                value=""
            />
        );

        expect(screen.getByText('No option available'))
            .toBeInTheDocument();

        const combobox = screen.getByRole('combobox');
        expect(combobox)
            .toHaveAttribute('aria-disabled', 'true');

        fireEvent.click(combobox);
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('displays "No option available" when options is undefined and value is non-empty', () => {
        render(
            <CommonSelect
                options={undefined as unknown as CommonSelectOption[]}
                value="previous_value"
            />
        );

        expect(screen.getByText('No option available'))
            .toBeInTheDocument();

        const combobox = screen.getByRole('combobox');
        expect(combobox)
            .toHaveAttribute('aria-disabled', 'true');

        fireEvent.click(combobox);
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('renders regular options when options are present', () => {
        render(
            <CommonSelect
                options={[
                    { label: 'Option 1', value: '1' },
                    { label: 'Option 2', value: '2' }
                ]}
                value="1"
            />
        );

        expect(screen.getByText('Option 1'))
            .toBeInTheDocument();
        const combobox = screen.getByRole('combobox');
        expect(combobox).not.toHaveAttribute('aria-disabled', 'true');
    });
});