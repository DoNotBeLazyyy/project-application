import CommonFormModal, { CommonFormModalProps } from '@components/modal/CommonFormModal';
import SortFieldsEditor from '@components/modal/sort-modal/SortFieldsEditor';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import { SortStringDto } from '@type/http.type';
import { useEffect, useState } from 'react';

export interface FilterSortModalProps extends CommonFormModalProps {
    currentSort: SortStringDto[];
    sortColumns: SortColumn[];
    onApplySort: (sort: SortStringDto[]) => void;
}

/**
 * FilterSortModal
 *
 * Combines a page's filter form and the shared sort field editor into one
 * dialog with a single Apply action, instead of two separate menu entries and
 * modals. The filter section keeps whatever page-specific form is supplied as
 * `formContent`; clicking Apply submits that form (via the existing
 * formId/type="submit" wiring) and commits the sort selection in the same click.
 */
export default function FilterSortModal({
    cardProps,
    currentSort,
    formContent,
    onReset,
    open,
    sortColumns,
    onApplySort,
    ...rest
}: FilterSortModalProps) {
    const [localSort, setLocalSort] = useState<SortStringDto[]>([]);

    useEffect(function() {
        if (open) {
            setLocalSort([...currentSort]);
        }
    }, [open, currentSort]);

    function handleApplyClick() {
        onApplySort(localSort);
    }

    function handleResetClick() {
        setLocalSort([]);
        onReset?.();
    }

    return (
        <CommonFormModal
            {...rest}
            cardProps={{
                cardHeaderProps: {
                    subheader: 'Configure parameters to customize list content.',
                    title: 'Filter & Sort Records',
                    ...cardProps?.cardHeaderProps
                },
                ...cardProps
            }}
            confirmText={rest.confirmText ?? 'Apply Changes'}
            containerClassName={rest.containerClassName ?? 'max-w-full w-[32rem]'}
            formButtonsProps={{
                ...rest.formButtonsProps,
                confirmProps: {
                    onClick: handleApplyClick,
                    ...rest.formButtonsProps?.confirmProps
                }
            }}
            formContent={
                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-3">
                        <span className="font-bold text-(--mui-palette-brand-700) text-xs tracking-wider uppercase">
                            Filter Options
                        </span>
                        {formContent}
                    </div>
                    <div className="bg-(--mui-palette-grey-200) h-px" />
                    <div className="flex flex-col gap-3">
                        <span className="font-bold text-(--mui-palette-warning-dark) text-xs tracking-wider uppercase">
                            Sort Configuration
                        </span>
                        <SortFieldsEditor
                            columns={sortColumns}
                            value={localSort}
                            onChange={setLocalSort}
                        />
                    </div>
                </div>
            }
            open={open}
            onReset={onReset
                ? handleResetClick
                : undefined}
        />
    );
}