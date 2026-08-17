import TableCardActionMenu, { TableCardActionMenuProps } from '@components/table-card/TableCardActionMenu';
import TableCardInput, { TableCardInputProps } from '@components/table-card/TableCardInput';

export interface TableCardControlsProps {
    // Table action menu props
    tableButtonsProps?: TableCardActionMenuProps;

    // Table input props
    tableInputProps?: TableCardInputProps;

    hasInput?: boolean;
}

export default function TableCardControls({
    hasInput = true,
    tableButtonsProps,
    tableInputProps
}: TableCardControlsProps) {
    return (
        <div className="flex flex-wrap gap-2 items-center justify-end min-w-0 w-full">
            {hasInput && (
                <div className="flex-1 min-w-0 sm:max-w-64">
                    <TableCardInput {...tableInputProps} />
                </div>
            )}
            <TableCardActionMenu {...tableButtonsProps} />
        </div>
    );
}