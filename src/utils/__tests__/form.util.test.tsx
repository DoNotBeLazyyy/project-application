import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
    announceFormError,
    blurActiveElementWithin,
    checkForMessage,
    focusAndOpenFirstErrorField,
    FORM_ERROR_EVENT,
    getLastWindowFocusTime,
    setLastWindowFocusTime
} from '../form.util';
import CommonStepperInput from '@components/input/CommonStepperInput';

describe('form.util - Error Focus & Autofill Handling', () => {
    describe('checkForMessage', () => {
        it('identifies the first error key and message correctly', () => {
            const errors = {
                title: { message: 'Title is required', type: 'required' },
                code: { message: 'Code is required', type: 'required' }
            };

            const result = checkForMessage(errors as any);
            expect(result.count).toBe(2);
            expect(result.firstError).toEqual({
                key: 'title',
                message: 'Title is required'
            });
        });
    });

    describe('announceFormError', () => {
        it('dispatches the FORM_ERROR_EVENT custom event with details', () => {
            const listener = vi.fn();
            window.addEventListener(FORM_ERROR_EVENT, listener);

            announceFormError({
                count: 1,
                firstErrorField: 'birth_date',
                message: 'Birth date is required.'
            });

            expect(listener).toHaveBeenCalled();
            const event = listener.mock.calls[0][0] as CustomEvent;
            expect(event.detail).toEqual({
                count: 1,
                firstErrorField: 'birth_date',
                message: 'Birth date is required.'
            });

            window.removeEventListener(FORM_ERROR_EVENT, listener);
        });
    });

    describe('focusAndOpenFirstErrorField', () => {
        it('focuses regular input when error occurs', async () => {
            const input = document.createElement('input');
            input.setAttribute('name', 'first_name');
            document.body.appendChild(input);

            const focusSpy = vi.spyOn(input, 'focus');
            focusAndOpenFirstErrorField('first_name');

            await new Promise((r) => setTimeout(r, 60));

            expect(focusSpy).toHaveBeenCalled();
            document.body.removeChild(input);
        });

        it('focuses combobox and triggers mousedown to open dropdown for select', async () => {
            const container = document.createElement('div');
            const hiddenInput = document.createElement('input');
            hiddenInput.setAttribute('name', 'gender');
            hiddenInput.className = 'MuiSelect-nativeInput';

            const combobox = document.createElement('div');
            combobox.setAttribute('role', 'combobox');

            container.appendChild(hiddenInput);
            container.appendChild(combobox);
            document.body.appendChild(container);

            const focusSpy = vi.spyOn(combobox, 'focus');
            const dispatchSpy = vi.spyOn(combobox, 'dispatchEvent');

            focusAndOpenFirstErrorField('gender');

            await new Promise((r) => setTimeout(r, 60));

            expect(focusSpy).toHaveBeenCalled();
            expect(dispatchSpy).toHaveBeenCalled();

            document.body.removeChild(container);
        });

        it('focuses a date field without opening its calendar, so the date can be typed', async () => {
            const container = document.createElement('div');
            const input = document.createElement('input');
            input.setAttribute('name', 'birth_date');

            const calendarButton = document.createElement('button');
            calendarButton.setAttribute('aria-label', 'Choose date');

            container.appendChild(input);
            container.appendChild(calendarButton);
            document.body.appendChild(container);

            const clickSpy = vi.spyOn(calendarButton, 'click');

            focusAndOpenFirstErrorField('birth_date');

            await new Promise((r) => setTimeout(r, 60));

            expect(clickSpy).not.toHaveBeenCalled();
            expect(document.activeElement).toBe(input);

            document.body.removeChild(container);
        });
    });

    describe('CommonStepperInput - Autofill & Clamping Prevention', () => {
        it('preserves empty value and does not autofill with 0 or min when cleared', () => {
            const handleChange = vi.fn();
            render(
                <CommonStepperInput
                    label="Units"
                    min={1}
                    value={3}
                    onChange={handleChange}
                />
            );

            const input = screen.getByRole('spinbutton');
            expect(input).toHaveValue(3);

            // Clear input to empty string
            fireEvent.change(input, { target: { value: '' } });
            expect(handleChange).toHaveBeenCalledWith(undefined);
        });

        it('does not auto-clamp to max on input so user can type freely without assuming 10', () => {
            const handleChange = vi.fn();
            render(
                <CommonStepperInput
                    label="Units"
                    min={0}
                    max={10}
                    value={3}
                    onChange={handleChange}
                />
            );

            const input = screen.getByRole('spinbutton');
            // User types 32 (e.g. typing 2 after 3)
            fireEvent.change(input, { target: { value: '32' } });
            // It should NOT automatically coerce to 10
            expect(handleChange).toHaveBeenCalledWith(32);
        });

        it('allows user to replace value with a smaller number like 2', () => {
            const handleChange = vi.fn();
            render(
                <CommonStepperInput
                    label="Units"
                    min={0}
                    max={10}
                    value={3}
                    onChange={handleChange}
                />
            );

            const input = screen.getByRole('spinbutton');
            fireEvent.change(input, { target: { value: '2' } });
            expect(handleChange).toHaveBeenCalledWith(2);
        });
    });

    describe('Window Focus & Active Element Blur Helpers', () => {
        it('tracks window focus time correctly', () => {
            const now = Date.now();
            setLastWindowFocusTime(now);
            expect(getLastWindowFocusTime()).toBe(now);

            // Simulating window focus event
            window.dispatchEvent(new Event('focus'));
            expect(getLastWindowFocusTime()).toBeGreaterThanOrEqual(now);
        });

        it('blurs active element within container', () => {
            const container = document.createElement('div');
            const input = document.createElement('input');
            container.appendChild(input);
            document.body.appendChild(container);

            input.focus();
            expect(document.activeElement).toBe(input);

            blurActiveElementWithin(container);
            expect(document.activeElement).not.toBe(input);

            document.body.removeChild(container);
        });

        it('does not blur active element if outside container', () => {
            const container = document.createElement('div');
            const insideInput = document.createElement('input');
            const outsideInput = document.createElement('input');
            container.appendChild(insideInput);
            document.body.appendChild(container);
            document.body.appendChild(outsideInput);

            outsideInput.focus();
            expect(document.activeElement).toBe(outsideInput);

            blurActiveElementWithin(container);
            expect(document.activeElement).toBe(outsideInput);

            document.body.removeChild(container);
            document.body.removeChild(outsideInput);
        });
    });
});
