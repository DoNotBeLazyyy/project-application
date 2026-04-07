import { classMerge } from '@utils/css.util';
import { useTranslation } from 'react-i18next';

export interface PaginationInfoProps {
    // Additional class name
    className?: string;

    // The last row index currently visible on the page
    endRow: number;

    // The first row index currently visible on the page
    startRow: number;

    // The absolute total number of elements across all pages
    totalElements: number;
}

/**
 * PaginationInfo
 *
 * A presentation component that displays the current row visibility range
 * against the total number of elements in the dataset.
 *
 * @example
 * <PaginationInfo
 *  endRow={20}
 *  startRow={11}
 *  totalElements={100}
 * />
 */
export default function PaginationInfo({
    className,
    endRow,
    startRow,
    totalElements
}: PaginationInfoProps) {
    const { t } = useTranslation(); // Translation hook

    return (
        <div
            className={
                classMerge(
                    'absolute min-w-max right-[16px] text-[var(--mui-tokens-color-neutral-600)] top-[50%] translate-y-[-50%] tw_body_small',
                    className
                )
            }
        >
            <span>
                {t('showing_rows_info', {
                    endRow,
                    startRow,
                    totalElements
                })}
            </span>
        </div>
    );
}