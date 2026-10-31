import CommonInput from '@components/input/CommonInput';
import CommonNumberInput from '@components/input/CommonNumberInput';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

describe('CommonNumberInput - Leading Zero Handling', () => {
    function ControlledNumberInput({ initialValue = 0 }: { initialValue?: number }) {
        const [val, setVal] = useState<number | undefined>(initialValue);
        return (
            <CommonNumberInput
                aria-label="number-input"
                value={val}
                onChange={setVal}
            />
        );
    }

    it('changes value to "3" instead of "03" when user types "3" after "0"', () => {
        render(<ControlledNumberInput initialValue={0} />);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        expect(input.value)
            .toBe('0');

        // Simulate typing '3' when current value is '0' (producing '03' in DOM)
        fireEvent.change(input, { target: { value: '03' } });

        expect(input.value)
            .toBe('3');
    });

    it('keeps single "0" instead of "00" when user types "0" after "0"', () => {
        render(<ControlledNumberInput initialValue={0} />);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        expect(input.value)
            .toBe('0');

        fireEvent.change(input, { target: { value: '00' } });

        expect(input.value)
            .toBe('0');
    });

    it('allows typing decimals such as "0." and "0.5"', () => {
        render(<ControlledNumberInput initialValue={0} />);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        fireEvent.change(input, { target: { value: '0.' } });
        expect(input.value)
            .toBe('0.');

        fireEvent.change(input, { target: { value: '0.5' } });
        expect(input.value)
            .toBe('0.5');
    });

    it('calls onChange with parsed number 3', () => {
        const handleChange = vi.fn();
        render(<CommonNumberInput
            aria-label="number-input"
            value={0}
            onChange={handleChange}
               />);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        fireEvent.change(input, { target: { value: '03' } });

        expect(handleChange)
            .toHaveBeenCalledWith(3);
    });
});

describe('CommonInput - type="number" Leading Zero Handling', () => {
    function ControlledCommonNumber({ initialValue = 0 }: { initialValue?: number | string }) {
        const [val, setVal] = useState<number | string>(initialValue);
        return (
            <CommonInput
                aria-label="common-number-input"
                type="number"
                value={val}
                onChange={(e) => setVal(e.target.value)}
            />
        );
    }

    it('normalizes "03" to "3" for CommonInput with type="number"', () => {
        render(<ControlledCommonNumber initialValue={0} />);
        const input = screen.getByRole('spinbutton') as HTMLInputElement;

        fireEvent.change(input, { target: { value: '03' } });

        expect(input.value)
            .toBe('3');
    });
});