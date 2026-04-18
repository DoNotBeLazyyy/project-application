import CommonCard, { CommonCardProps } from '@components/card/CommonCard';
import TableCardControls, { TableCardControlsProps } from '@components/table-card/TableCardControls';
import CommonFormTable, { CommonFormTableProps } from '@components/table/CommonFormTable';
import { FieldValues } from 'react-hook-form';

interface CommonFormTableCardProps<TRow, TForm extends FieldValues> {
    cardProps: CommonCardProps;
    controlProps: TableCardControlsProps;
    formTableProps: CommonFormTableProps<TRow, TForm>;
}

export default function CommonFormTableCard<TRow, TForm extends FieldValues>({
    cardProps,
    controlProps,
    formTableProps
}: CommonFormTableCardProps<TRow, TForm>) {
    return (
        <CommonCard
            className="h-full w-full"
            {...cardProps}
            cardHeaderProps={{
                action: (
                    <TableCardControls
                        {...controlProps}
                        hasInput={false}
                    />
                ),
                ...cardProps.cardHeaderProps
            }}
        >
            <CommonFormTable {...formTableProps} />
        </CommonCard>
    );
}