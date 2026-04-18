import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { NEXT_STATUS_MAP, TERM_STATUS_VARIANT_MAP } from '@constants/term.constant';
import { TermListRow, TermStatus } from '@type/term/term.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

interface UseTermTableConfigProps {
    onAdvanceStatus: (id: string, currentStatus: TermStatus) => void;
    onEdit: (id: string) => void;
    onRequestDeleteRow: (id: string) => void;
    onView: (id: string) => void;
}

export function useTermTableConfig({
    onAdvanceStatus,
    onEdit,
    onRequestDeleteRow,
    onView
}: UseTermTableConfigProps) {
    const columnDefs = useMemo<ColDef<TermListRow>[]>(() => [
        {
            field: 'school_year_label',
            flex: 2,
            headerName: 'School Year',
            sortable: true
        },
        {
            field: 'term_type_label',
            flex: 2,
            headerName: 'Term Type',
            sortable: true
        },
        {
            field: 'start_date',
            flex: 2,
            headerName: 'Start Date',
            sortable: true
        },
        {
            field: 'end_date',
            flex: 2,
            headerName: 'End Date',
            sortable: true
        },
        {
            field: 'status',
            flex: 2,
            headerName: 'Status',
            sortable: true,
            cellRenderer: (params: { data: TermListRow }) => (
                <div className="flex h-full items-center">
                    <CommonBadgeStatus
                        label={params.data.status}
                        variant={TERM_STATUS_VARIANT_MAP[params.data.status]}
                    />
                </div>
            )
        }
    ], []);

    const tableActionConfig = useMemo(function() {
        return function(onDelete: (id: string) => void): TableActionConfig<TermListRow> {
            return {
                onEditClick: (row: TermListRow) => () => onEdit(row.id),
                menuOptions: (row: TermListRow): MenuOption[] => {
                    const nextStatus = NEXT_STATUS_MAP[row.status];
                    const canDelete = row.status === 'Upcoming' || row.status === 'Closed';

                    const options: MenuOption[] = [
                        {
                            preset: 'view',
                            onClick: () => onView(row.id)
                        },
                        {
                            preset: 'edit',
                            disabled: row.status === 'Closed',
                            onClick: () => onEdit(row.id)
                        }
                    ];

                    if (nextStatus) {
                        options.push({
                            children: (
                                <div className="flex gap-2 items-center">
                                    <span>Advance to {nextStatus}</span>
                                </div>
                            ),
                            onClick: () => onAdvanceStatus(row.id, row.status)
                        });
                    }

                    if (canDelete) {
                        options.push({
                            preset: 'delete',
                            onClick: () => onDelete(row.id)
                        });
                    }

                    return options;
                }
            };
        };
    }, [onAdvanceStatus, onEdit, onView]);

    return { columnDefs, tableActionConfig };
}