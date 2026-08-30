import CommonInput, { CommonInputProps } from '@components/input/CommonInput';
import { InputAdornment, Tooltip } from '@mui/material';
import { InfoIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { KeyboardEventDivElement } from '@type/common.type';
import { MouseEvent } from 'react';

export type TableCardInputProps = CommonInputProps & {
    // Fields the backing list RPC matches the search term against
    searchHints?: readonly string[];
    onSearch?: () => void;
};

/**
 * TableCardInput
 *
 * The pill-shaped search field rendered in every table card header. It exposes
 * a hoverable hint listing the fields the search term is matched against and a
 * clear button inherited from CommonInput.
 */
export default function TableCardInput({
    searchHints,
    onKeyDown,
    onSearch,
    ...props
}: TableCardInputProps) {
    function handleKeyDown(event: KeyboardEventDivElement) {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (onSearch) {
                onSearch();
            }
            else {
                onKeyDown?.(event);
            }
            return;
        }

        onKeyDown?.(event);
    }

    const hasHints = Boolean(searchHints?.length);

    return (
        <CommonInput
            className="min-w-0"
            fullWidth
            isRoundedFull
            placeholder="Search"
            size="small"
            sx={{
                '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                    height: '2.25rem',
                    maxHeight: '2.25rem',
                    padding: 'var(--mui-tokens-spacing-2) var(--mui-tokens-spacing-3)',
                    '@media (pointer: coarse)': {
                        height: '2.25rem',
                        maxHeight: '2.25rem'
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'var(--mui-palette-primary-main)',
                        borderWidth: '1px'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'var(--mui-palette-primary-dark)'
                    },
                    '&.Mui-focused': {
                        backgroundColor: 'var(--mui-tokens-color-brand-100)'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'var(--mui-palette-primary-main)',
                        borderWidth: '1px'
                    }
                },
                ...props.sx
            }}
            variant="outlined"
            {...props}
            slotProps={{
                input: {
                    startAdornment: (
                        <InputAdornment position="start">
                            <button
                                aria-label="Submit search"
                                className="-ml-1 active:bg-slate-200 active:scale-95 bg-transparent cursor-pointer duration-200 flex focus-visible:ring-(--mui-palette-primary-main)/40 focus-visible:ring-2 focus:outline-hidden h-6.5 hover:bg-slate-100 hover:scale-110 hover:text-(--mui-palette-primary-dark) items-center justify-center rounded-full text-(--mui-palette-primary-main) transition-all w-6.5"
                                title="Click to search"
                                type="button"
                                onClick={onSearch}
                                onMouseDown={function(event: MouseEvent<HTMLButtonElement>) {
                                    event.preventDefault();
                                }}
                            >
                                <MagnifyingGlassIcon
                                    size={17}
                                    weight="bold"
                                />
                            </button>
                        </InputAdornment>
                    ),
                    endAdornment: hasHints
                        ? (
                            <InputAdornment position="end">
                                <Tooltip
                                    arrow
                                    placement="top"
                                    title={
                                        <div className="flex flex-col gap-1 py-1">
                                            <span className="font-semibold">
                                                Search matches any of:
                                            </span>
                                            <ul className="flex flex-col gap-0.5 list-disc pl-4">
                                                {searchHints?.map(function(hint) {
                                                    return <li key={hint}>{hint}</li>;
                                                })}
                                            </ul>
                                            <span className="opacity-80">
                                                Press Enter or click search to search
                                            </span>
                                        </div>
                                    }
                                >
                                    <span
                                        aria-label="Searchable fields"
                                        className="cursor-help flex items-center text-(--mui-palette-grey-600)"
                                        tabIndex={0}
                                    >
                                        <InfoIcon size={18} />
                                    </span>
                                </Tooltip>
                            </InputAdornment>
                        )
                        : undefined
                }
            }}
            onKeyDown={handleKeyDown}
        />
    );
}