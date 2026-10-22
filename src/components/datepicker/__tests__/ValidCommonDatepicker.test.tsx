import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommonDatePicker } from '../ValidCommonDatepicker';
import { setLastWindowFocusTime } from '@utils/form.util';

describe('CommonDatePicker - Focus & Tab Revisit Behavior', () => {
    it('renders date picker sections properly', () => {
        render(
            <CommonDatePicker
                label="Birth Date"
                value="2026-10-22"
                onChange={vi.fn()}
            />
        );

        const monthSection = screen.getByRole('spinbutton', { name: 'Month' });
        expect(monthSection).toBeDefined();
    });

    it('does not open datepicker when focus is triggered by window / tab refocus', async () => {
        const handleOpen = vi.fn();
        const { container } = render(
            <CommonDatePicker
                label="Birth Date"
                value="2026-10-22"
                onChange={vi.fn()}
                onOpen={handleOpen}
            />
        );

        const inputBase = container.querySelector('.MuiPickersInputBase-root') as HTMLElement;
        expect(inputBase).toBeDefined();

        // Simulate returning to the tab (window focus happens right before active element focus)
        setLastWindowFocusTime(Date.now());

        fireEvent.focus(inputBase);

        // Datepicker should NOT open
        expect(handleOpen).not.toHaveBeenCalled();
    });

    it('opens datepicker when user explicitly clicks / focuses the input', async () => {
        const handleOpen = vi.fn();
        const { container } = render(
            <CommonDatePicker
                label="Birth Date"
                value="2026-10-22"
                onChange={vi.fn()}
                onOpen={handleOpen}
            />
        );

        const sectionsContainer = container.querySelector('.MuiPickersInputBase-sectionsContainer') as HTMLElement;
        expect(sectionsContainer).toBeDefined();

        // Normal interaction (no recent window refocus)
        setLastWindowFocusTime(0);

        const inputEl = container.querySelector('input') || sectionsContainer;
        fireEvent.pointerDown(inputEl);
        fireEvent.focus(inputEl);

        expect(handleOpen).toHaveBeenCalled();
    });

    it('blurs active element after closing / picking date so focus does not remain', async () => {
        const handleChange = vi.fn();
        const { container } = render(
            <CommonDatePicker
                label="Birth Date"
                value="2026-10-22"
                onChange={handleChange}
            />
        );

        const monthSection = screen.getByRole('spinbutton', { name: 'Month' });
        setLastWindowFocusTime(0);

        // Focus inside
        monthSection.focus();
        expect(document.activeElement).toBe(monthSection);

        // Simulate close
        const calendarButton = screen.getByRole('button', { name: /choose date/i });
        fireEvent.click(calendarButton);

        // When picker closes / accepts, blurPickerInput runs
        await waitFor(() => {
            expect(container.contains(document.activeElement)).toBe(false);
        }, { timeout: 300 });
    });
});

