import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { SectionListRow, SectionStatus } from '@type/section.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

interface UseSectionTableConfigProps {
    onEdit: (id: string) => void;
    onRequestDeleteRow: (id: string) => void;
    onView: (id: string) => void;
}

const STATUS_VARIANT_MAP: Record<SectionStatus, 'success' | 'error' | 'warning' | 'info'> = {
    Open: 'success',
    Full: 'warning',
    Ongoing: 'info',
    Closed: 'error',
    Cancelled: 'info'
};

export function useSectionTableConfig({
    onEdit,
    onView
}: UseSectionTableConfigProps) {
    const columnDefs = useMemo<ColDef<SectionListRow>[]>(function() {
        return [
            {
                field: 'section_code',
                flex: 1,
                headerName: 'Section Code',
                sortable: true
            },
            {
                field: 'term_label',
                flex: 2,
                headerName: 'Term',
                sortable: true
            },
            {
                field: 'course_code',
                flex: 1,
                headerName: 'Course Code',
                sortable: true
            },
            {
                field: 'course_title',
                flex: 3,
                headerName: 'Course Title',
                sortable: true
            },
            {
                field: 'faculty_name',
                flex: 2,
                headerName: 'Faculty',
                sortable: true
            },
            {
                field: 'room',
                flex: 1,
                headerName: 'Room',
                sortable: false
            },
            {
                field: 'max_slots',
                flex: 1,
                headerName: 'Max Slots',
                sortable: false
            },
            {
                field: 'status',
                flex: 1,
                headerName: 'Status',
                sortable: false,
                cellRenderer: (params: { data: SectionListRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.status}
                            variant={STATUS_VARIANT_MAP[params.data.status]}
                        />
                    </div>
                )
            }
        ];
    }, []);

    const tableActionConfig = useMemo(function() {
        return function(onDelete: (id: string) => void): TableActionConfig<SectionListRow> {
            return {
                onEditClick: (row: SectionListRow) => () => onEdit(row.id),
                menuOptions: (row: SectionListRow): MenuOption[] => [
                    {
                        preset: 'view',
                        onClick: () => onView(row.id)
                    },
                    {
                        preset: 'edit',
                        onClick: () => onEdit(row.id)
                    },
                    {
                        preset: 'delete',
                        onClick: () => onDelete(row.id)
                    }
                ]
            };
        };
    }, [onEdit, onView]);

    return { columnDefs, tableActionConfig };
}