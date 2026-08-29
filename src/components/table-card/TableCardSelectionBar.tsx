import CommonButton from '@components/button/CommonButton';
import { TrashIcon } from '@phosphor-icons/react';
import { TableCardSelectionBarProps } from '@type/table-card.type';

export default function TableCardSelectionBar({
    entityName = 'Record',
    extraActions,
    isDeleting = false,
    selectedCount,
    totalCount,
    onClearSelection,
    onDeleteSelected,
    onSelectAll
}: TableCardSelectionBarProps) {
    if (selectedCount <= 0) {
        return null;
    }

    return (
        <div className="bg-(--mui-palette-brand-50) border border-(--mui-palette-brand-200) flex flex-wrap gap-3 items-center justify-between px-3 py-2.5 rounded-xl transition-all">
            <div className="flex gap-3 items-center">
                <span className="bg-(--mui-palette-brand-600) flex font-bold h-7 items-center justify-center rounded-lg shadow-xs text-white text-xs w-7">
                    {selectedCount}
                </span>
                <div>
                    <span className="block font-bold text-(--mui-palette-brand-900) text-xs">
                        {selectedCount} {entityName}{selectedCount > 1
                            ? 's'
                            : ''} Selected
                    </span>
                    <span className="block text-(--mui-palette-brand-700) text-[11px] opacity-80">
                        Bulk actions active
                    </span>
                </div>
                {onSelectAll && selectedCount < totalCount && (
                    <>
                        <span className="bg-(--mui-palette-brand-200) h-5 hidden sm:block w-px" />
                        <button
                            className="cursor-pointer font-bold hover:underline text-(--mui-palette-brand-700) text-xs underline-offset-2"
                            type="button"
                            onClick={onSelectAll}
                        >
                            Select All ({totalCount})
                        </button>
                    </>
                )}
            </div>

            <div className="flex gap-2 items-center">
                {extraActions}

                {onDeleteSelected && (
                    <CommonButton
                        color="error"
                        disabled={isDeleting}
                        size="small"
                        startIcon={<TrashIcon size={16} weight="bold" />}
                        variant="outlined"
                        onClick={onDeleteSelected}
                    >
                        Delete Selected ({selectedCount})
                    </CommonButton>
                )}

                <CommonButton
                    color="inherit"
                    size="small"
                    variant="text"
                    onClick={onClearSelection}
                >
                    Cancel
                </CommonButton>
            </div>
        </div>
    );
}