import CommonButton from '@components/button/CommonButton';
import TableCardActionMenu, { TableCardActionMenuProps } from '@components/table-card/TableCardActionMenu';
import TableCardInput, { TableCardInputProps } from '@components/table-card/TableCardInput';
import { ListIcon, SquaresFourIcon } from '@phosphor-icons/react';

export interface TableCardControlsProps {
    hasInput?: boolean;
    showViewToggle?: boolean;
    tableButtonsProps?: TableCardActionMenuProps;
    tableInputProps?: TableCardInputProps;
    viewMode?: 'table' | 'grid';
    onToggleViewMode?: (mode: 'table' | 'grid') => void;
}

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
            {showViewToggle && onToggleViewMode && (
                <div className="bg-(--mui-palette-grey-100) flex gap-0.5 items-center p-0.5 rounded-lg">
                    <CommonButton
                        aria-label="Grid View"
                        className="min-w-0 px-2 py-1"
                        color={viewMode === 'grid'
                            ? 'primary'
                            : 'inherit'}
                        size="small"
                        variant={viewMode === 'grid'
                            ? 'contained'
                            : 'text'}
                        onClick={function() {
                            onToggleViewMode('grid');
                        }}
                    >
                        <SquaresFourIcon
                            size={16}
                            weight={viewMode === 'grid'
                                ? 'bold'
                                : 'regular'} />
                    </CommonButton>
                    <CommonButton
                        aria-label="Table View"
                        className="min-w-0 px-2 py-1"
                        color={viewMode === 'table'
                            ? 'primary'
                            : 'inherit'}
                        size="small"
                        variant={viewMode === 'table'
                            ? 'contained'
                            : 'text'}
                        onClick={function() {
                            onToggleViewMode('table');
                        }}
                    >
                        <ListIcon
                            size={16}
                            weight={viewMode === 'table'
                                ? 'bold'
                                : 'regular'} />
                    </CommonButton>
                </div>
            )}
            <TableCardActionMenu {...tableButtonsProps} />
        </div>
    );
}