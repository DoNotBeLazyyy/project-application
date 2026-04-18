import { classMerge } from '@utils/css.util';

export interface PaginationInfoProps {
    className?: string;
    endRow: number;
    startRow: number;
    totalElements: number;
}

export default function PaginationInfo({
    className,
    endRow,
    startRow,
    totalElements
}: PaginationInfoProps) {
    return (
        <div
            className={
                classMerge(
                    'absolute min-w-max right-4 text-(--mui-tokens-color-neutral-600) top-[50%] translate-y-[-50%] tw_body_small',
                    className
                )
            }
        >
            <span>
                {`Showing ${startRow}-${endRow} of ${totalElements}`}
            </span>
        </div>
    );
}