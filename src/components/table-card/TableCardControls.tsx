import { CommonInputProps } from '@components/input/CommonInput';
import TableCardButtons, { TableCardButtonsProps } from '@components/table-card/TableCardButtons';
import TableCardInput from '@components/table-card/TableCardInput';

export interface TableCardControlsProps {
    // Table button props
    tableButtonsProps?: TableCardButtonsProps;

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
            <TableCardButtons {...tableButtonsProps} />
        </div>
    );
}