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
                    'min-w-max order-last text-(--mui-tokens-color-neutral-600) text-center tw_body_small w-full lg:absolute lg:right-4 lg:text-right lg:top-[50%] lg:translate-y-[-50%] lg:w-auto',
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