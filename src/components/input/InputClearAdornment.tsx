import { IconButton, InputAdornment } from '@mui/material';
import { XCircleIcon } from '@phosphor-icons/react';
import { MouseEvent } from 'react';

export interface InputClearAdornmentProps {
    // Vertical placement of the button inside the field
    alignSelf?: 'center' | 'flex-start';

    // Accessible label announced for the clear action
    ariaLabel?: string;

    // Icon size in pixels
    iconSize?: number;

    // Callback invoked when the clear button is pressed
    onClear: () => void;
}

/**
 * InputClearAdornment
 *
 * The shared end adornment that empties the field it belongs to and returns
 * focus to that same field. Hosted by CommonInput and CommonTextarea so every
 * text-like field exposes the same clear affordance.
 */
export default function InputClearAdornment({
    alignSelf = 'center',
    ariaLabel = 'Clear field',
    iconSize = 18,
    onClear
}: InputClearAdornmentProps) {
    return (
        <InputAdornment
            position="end"
            sx={{
                alignSelf,
                marginTop: alignSelf === 'flex-start'
                    ? '2px'
                    : 0
            }}
        >
            <IconButton
                aria-label={ariaLabel}
                edge="end"
                size="small"
                tabIndex={-1}
                onClick={onClear}
                onMouseDown={function(event: MouseEvent<HTMLButtonElement>) {
                    event.preventDefault();
                }}
            >
                <XCircleIcon size={iconSize} />
            </IconButton>
        </InputAdornment>
    );
}