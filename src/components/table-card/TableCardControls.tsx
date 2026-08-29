import TableCardActionMenu, { TableCardActionMenuProps } from '@components/table-card/TableCardActionMenu';
import TableCardInput, { TableCardInputProps } from '@components/table-card/TableCardInput';

export interface TableCardControlsProps {
    hasInput?: boolean;
    showViewToggle?: boolean;
    tableButtonsProps?: TableCardActionMenuProps;
    tableInputProps?: TableCardInputProps;
    viewMode?: 'table' | 'grid';
    onToggleViewMode?: (mode: 'table' | 'grid') => void;
}

/**
 * TableCardControls
 *
 * The standard (non-selection) table card header controls: a right-aligned
 * search field followed by a single action affordance. The grid/list toggle is
 * not rendered here - it is handed to TableCardActionMenu, which surfaces it
 * inside the three-dots menu to keep the toolbar to one control.
 */
export default function TableCardControls({
    hasInput = true,
    showViewToggle = true,
    tableButtonsProps,
    tableInputProps,
    viewMode = 'grid',
    onToggleViewMode
}: TableCardControlsProps) {
    return (
        <div className="flex flex-wrap gap-2 items-center justify-end min-w-0 w-full">
            {hasInput && (
                <div className="flex-1 min-w-0 sm:max-w-64">
                    <TableCardInput {...tableInputProps} />
                </div>
            )}
            <TableCardActionMenu
                {...tableButtonsProps}
                showViewToggle={showViewToggle}
                viewMode={viewMode}
                onToggleViewMode={onToggleViewMode}
            />
        </div>
    );
}