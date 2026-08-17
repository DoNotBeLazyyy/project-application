import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { PushPinIcon } from '@phosphor-icons/react';
import { AnnouncementAudience, AnnouncementListRow } from '@type/announcement.type';
import { BadgeStatusVariant } from '@type/common/badge.type';
import { MobileCardColDef } from '@type/table.type';
import { formatDate } from '@utils/date.util';
import { useMemo } from 'react';

interface UseAnnouncementTableConfigProps {
    onEdit: (id: string) => void;
    onView: (id: string) => void;
}

const AUDIENCE_META: Record<AnnouncementAudience, { label: string; variant: BadgeStatusVariant }> = {
    Faculty: { label: 'All Faculty', variant: 'success' },
    Global: { label: 'Everyone', variant: 'info' },
    Section: { label: 'Sections', variant: 'info' },
    Student: { label: 'All Students', variant: 'warning' }
};

export function useAnnouncementTableConfig({
    onEdit,
    onView
}: UseAnnouncementTableConfigProps) {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'title',
                flex: 3,
                headerName: 'Title',
                mobileCard: 'title',
                sortable: true,
                cellRenderer: (params: { data: AnnouncementListRow }) => (
                    <div className="flex h-full items-center gap-2">
                        {params.data.is_pinned && (
                            <PushPinIcon
                                className="text-(--mui-palette-primary-main)"
                                size={14}
                                weight="fill"
                            />
                        )}
                        <span className="text-(--mui-palette-text-primary) text-sm">
                            {params.data.title}
                        </span>
                    </div>
                )
            },
            {
                field: 'target_audience',
                flex: 2,
                headerName: 'Audience',
                sortable: false,
                cellRenderer: (params: { data: AnnouncementListRow }) => {
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
            },
            {
                field: 'author_name',
                flex: 2,
                headerName: 'Posted By',
                mobileCard: 'subtitle',
                sortable: false
            },
            {
                field: 'created_at',
                flex: 2,
                headerName: 'Posted On',
                sortable: true,
                valueFormatter: (params) => params.value
                    ? formatDate(new Date(params.value as string))
                    : '—'
            }
        ];
    }, []);

    const tableActionConfig = useMemo(function() {
        return function(onDelete: (id: string) => void): TableActionConfig<AnnouncementListRow> {
            return {
                onEditClick: (row: AnnouncementListRow) => () => onEdit(row.id),
                menuOptions: (row: AnnouncementListRow): MenuOption[] => [
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