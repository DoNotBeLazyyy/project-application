
import PaginationInput from '@components/pagination/PaginationInput';
import { OutlinedInputProps } from '@mui/material';
import { Trans } from 'react-i18next';

export interface PaginationInputInfoProps {
    // Total number of pages available for navigation
    totalPages: number;

    // Input props
    inputProps: OutlinedInputProps
}

/**
 * PaginationInputInfo
 *
 * A localized pagination layout component that orchestrates the placement
 * of the page input relative to the total page count.
 *
 * @example
 * <PaginationInputInfo
 *  totalPages={50}
 *  inputProps={{
 *      value={currentPage}
 *      onChange={handleChange}
 *  }}
 * />
 */
export default function PaginationInputInfo({
    totalPages,
    inputProps
}: PaginationInputInfoProps) {
    return (
        <div className="flex gap-[var(--mui-tokens-spacing-3)] items-center text-[var(--mui-tokens-color-neutral-900)] tw_body_small w-auto">
            <Trans
                components={{
                    input: <PaginationInput {...inputProps} />
                }}
                i18nKey="page_of_total"
                values={{ totalPages }}
            />
        </div>
    );
}