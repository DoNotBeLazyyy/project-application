import CommonMultiSelect from '@components/select/CommonMultiSelect';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('CommonMultiSelect', () => {
    const options = [
        { label: '1st Year', value: '1' },
        { label: 'Curriculum Development and Evaluation in Secondary Education', value: '2' },
        { label: '3rd Year', value: '3' }
    ];

    it('renders selected options as chips with complete content visible', () => {
        const handleChange = vi.fn();
        render(
            <CommonMultiSelect
                options={options}
                value={['1', '2']}
                onChange={handleChange}
            />
        );

        const firstChip = screen.getByText('1st Year');
        const longChip = screen.getByText('Curriculum Development and Evaluation in Secondary Education');

        expect(firstChip)
            .toBeInTheDocument();
        expect(longChip)
            .toBeInTheDocument();

        // Check that chip title contains full label
        const chipContainer = longChip.closest('.MuiChip-root');
        expect(chipContainer)
            .toHaveAttribute(
                'title',
                'Curriculum Development and Evaluation in Secondary Education'
            );
    });

    it('calls onChange with updated values when delete icon is clicked', () => {
        const handleChange = vi.fn();
        render(
            <CommonMultiSelect
                options={options}
                value={['1', '2']}
                onChange={handleChange}
            />
        );

        const deleteIcons = document.querySelectorAll('.MuiChip-deleteIcon');
        expect(deleteIcons.length)
            .toBe(2);

        fireEvent.click(deleteIcons[0]);
        expect(handleChange)
            .toHaveBeenCalledWith(['2']);
    });

    it('does not render delete icons when readOnly or disabled', () => {
        const handleChange = vi.fn();
        const { rerender } = render(
            <CommonMultiSelect
                options={options}
                readOnly
                value={['1']}
                onChange={handleChange}
            />
        );

        expect(document.querySelectorAll('.MuiChip-deleteIcon').length)
            .toBe(0);

        rerender(
            <CommonMultiSelect
                disabled
                options={options}
                value={['1']}
                onChange={handleChange}
            />
        );

        expect(document.querySelectorAll('.MuiChip-deleteIcon').length)
            .toBe(0);
    });

    it('displays "No option available" and is disabled/unclickable when options are empty', () => {
        const handleChange = vi.fn();
        render(
            <CommonMultiSelect
                options={[]}
                value={[]}
                onChange={handleChange}
            />
        );

        const input = screen.getByPlaceholderText('No option available');
        expect(input)
            .toBeInTheDocument();
        expect(input)
            .toBeDisabled();

        // Autocomplete popup button should not be clickable or should be disabled
        const popupBtn = document.querySelector('.MuiAutocomplete-popupIndicator');
        if (popupBtn) {
            expect(popupBtn)
                .toBeDisabled();
        }

        fireEvent.click(input);
        expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
});