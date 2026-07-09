import { CommonInputProps } from '@components/input/CommonInput';
import TableCardActionMenu, { TableCardActionMenuProps } from '@components/table-card/TableCardActionMenu';
import TableCardInput from '@components/table-card/TableCardInput';

export interface TableCardControlsProps {
    // Table action menu props
    tableButtonsProps?: TableCardActionMenuProps;

    // Table input props
    tableInputProps?: CommonInputProps;

    hasInput?: boolean;
}

export default function TableCardControls({
    hasInput = true,
    tableButtonsProps,
    tableInputProps
}: TableCardControlsProps) {
    return (
        <div className="flex gap-2 items-center">
            {hasInput && <TableCardInput {...tableInputProps} />}
            <TableCardActionMenu {...tableButtonsProps} />
        </div>
    );
}