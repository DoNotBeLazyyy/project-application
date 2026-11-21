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
                    // In normal flow so it never covers the controls; it moves beside them only
                    // when the pagination bar itself is wide enough (e.g. not squeezed by the AI panel)
                    'min-w-max order-last text-(--mui-tokens-color-neutral-600) text-center tw_body_small w-full @3xl:col-start-3 @3xl:justify-self-end @3xl:order-none @3xl:pr-4 @3xl:text-right @3xl:w-auto',
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