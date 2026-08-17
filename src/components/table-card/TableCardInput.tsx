import CommonInput, { CommonInputProps } from '@components/input/CommonInput';
import { InputAdornment, Tooltip } from '@mui/material';
import { InfoIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { KeyboardEventDivElement } from '@type/common.type';

export type TableCardInputProps = CommonInputProps & {
    // Fields the backing list RPC matches the search term against
    searchHints?: readonly string[];
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
    ...props
}: TableCardInputProps) {
    function handleKeyDown(event: KeyboardEventDivElement) {
        if (event.key === 'Enter') {
            event.preventDefault();
            onKeyDown?.(event);
        }
    }

    const hasHints = Boolean(searchHints?.length);

    return (
        <CommonInput
            className="min-w-0"
            fullWidth
            isRoundedFull
            placeholder="Search"
            size="small"
            variant="outlined"
            {...props}
            slotProps={{
                input: {
                    startAdornment: (
                        <InputAdornment position="start">
                            <MagnifyingGlassIcon
                                color="var(--mui-palette-grey-900)"
                                size={20}
                            />
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
                                                Press Enter to search
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