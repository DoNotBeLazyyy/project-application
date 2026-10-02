import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { SectionListRow, SectionStatus } from '@type/section.type';
import { MobileCardColDef } from '@type/table.type';
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
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'section_code',
                flex: 1,
                headerName: 'Section Code',
                mobileCard: 'subtitle',
                sortable: true
            },
            {
                field: 'term_label',
                flex: 2,
                headerName: 'Term',
                sortable: true
            },
            {
                field: 'program_code',
                flex: 1,
                headerName: 'Program',
                sortable: true
            },
            {
                field: 'course_code',
                flex: 1,
                headerName: 'Course Code',
                mobileCard: 'hidden',
                sortable: true
            },
            {
                field: 'course_title',
                flex: 3,
                headerName: 'Course Title',
                mobileCard: 'title',
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
                onEditClick: (row: SectionListRow) => () => {
                    if (row.is_active_academic_year !== false) {
                        onEdit(row.id);
                    }
                },
                menuOptions: (row: SectionListRow): MenuOption[] => {
                    const isEditable = row.is_active_academic_year !== false;

                    return [
                        {
                            preset: 'view',
                            onClick: () => onView(row.id)
                        },
                        ...(isEditable
                            ? [
                                {
                                    preset: 'edit' as const,
                                    onClick: () => onEdit(row.id)
                                },
                                {
                                    preset: 'delete' as const,
                                    onClick: () => onDelete(row.id)
                                }
                            ]
                            : [])
                    ];
                }
            };
        };
    }, [onEdit, onView]);

    return { columnDefs, tableActionConfig };
}