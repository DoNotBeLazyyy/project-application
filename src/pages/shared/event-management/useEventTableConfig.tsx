import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { AnnouncementAudience } from '@type/announcement.type';
import { BadgeStatusVariant } from '@type/common/badge.type';
import { EventListRow } from '@type/event.type';
import { formatDate } from '@utils/date.util';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

interface UseEventTableConfigProps {
    onEdit: (id: string) => void;
    onView: (id: string) => void;
}

const AUDIENCE_META: Record<AnnouncementAudience, { label: string; variant: BadgeStatusVariant }> = {
    Faculty: { label: 'All Faculty', variant: 'success' },
    Global: { label: 'Everyone', variant: 'info' },
    Section: { label: 'Sections', variant: 'info' },
    Student: { label: 'All Students', variant: 'warning' }
};

export function useEventTableConfig({
    onEdit,
    onView
}: UseEventTableConfigProps) {
    const columnDefs = useMemo<ColDef<EventListRow>[]>(function() {
        return [
            {
                field: 'title',
                flex: 3,
                headerName: 'Title',
                sortable: true
            },
            {
                field: 'start_at',
                flex: 2,
                headerName: 'Start',
                sortable: true,
                valueFormatter: (params) => params.value
                    ? formatDate(new Date(params.value as string))
                    : '—'
            },
            {
                field: 'location',
                flex: 2,
                headerName: 'Location',
                sortable: false,
                valueFormatter: (params) => (params.value as string | null) ?? '—'
            },
            {
                field: 'target_audience',
                flex: 2,
                headerName: 'Audience',
                sortable: false,
                cellRenderer: (params: { data: EventListRow }) => {
                    const meta = AUDIENCE_META[params.data.target_audience];
                    const label = params.data.target_audience === 'Section'
                        ? `${params.data.section_count} Section(s)`
                        : meta.label;

                    return (
                        <div className="flex h-full items-center">
                            <CommonBadgeStatus label={label} variant={meta.variant} />
                        </div>
                    );
                }
            }
        ];
    }, []);

    const tableActionConfig = useMemo(function() {
        return function(onDelete: (id: string) => void): TableActionConfig<EventListRow> {
            return {
                onEditClick: (row: EventListRow) => () => onEdit(row.id),
                menuOptions: (row: EventListRow): MenuOption[] => [
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