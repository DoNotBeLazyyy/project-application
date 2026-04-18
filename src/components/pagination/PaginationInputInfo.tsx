
import { CommonInputProps } from '@components/input/CommonInput';
import PaginationInput from '@components/pagination/PaginationInput';

export interface PaginationInputInfoProps {
    // Determines whether it has total page or not
    hasTotalPage?: boolean;

    // Input props
    inputProps?: CommonInputProps

    // Total number of pages available for navigation
    totalPages?: number;
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
    hasTotalPage,
    inputProps,
    totalPages
}: PaginationInputInfoProps) {
    return (
        <div className="flex gap-(--mui-tokens-spacing-3) items-center text-(--mui-tokens-color-neutral-900) tw_body_small w-auto">
            <PaginationInput {...inputProps} />
            {hasTotalPage && (
                <span>
                    of {totalPages}
                </span>
            )}
        </div>
    );
}