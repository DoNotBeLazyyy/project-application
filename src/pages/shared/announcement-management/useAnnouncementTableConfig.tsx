import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { PushPinIcon } from '@phosphor-icons/react';
import { AnnouncementAudience, CommunicationListRow } from '@type/announcement.type';
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
                cellRenderer: (params: { data: CommunicationListRow }) => {
                    const isEvent = params.data.item_type === 'Event';
                    return (
                        <div className="flex h-full items-center">
                            <CommonBadgeStatus
                                label={params.data.item_type}
                                variant={isEvent ? 'success' : 'info'}
                            />
                        </div>
                    );
                },
                field: 'item_type',
                flex: 1.5,
                headerName: 'Type',
                mobileCard: 'meta',
                sortable: false
            },
            {
                cellRenderer: (params: { data: CommunicationListRow }) => (
                    <div className="flex h-full items-center gap-2">
                        {params.data.is_pinned && (
                            <PushPinIcon
                                className="text-(--mui-palette-primary-main) shrink-0"
                                size={14}
                                weight="fill"
                            />
                        )}
                        <span className="text-(--mui-palette-text-primary) text-sm font-medium truncate">
                            {params.data.title}
                        </span>
                    </div>
                ),
                field: 'title',
                flex: 3,
                headerName: 'Title',
                mobileCard: 'title',
                sortable: true
            },
            {
                cellRenderer: (params: { data: CommunicationListRow }) => {
                    const meta = AUDIENCE_META[params.data.target_audience] || {
                        label: params.data.target_audience,
                        variant: 'info' as const
                    };
                    const label = params.data.target_audience === 'Section'
                        ? `${params.data.section_count || 1} Section(s)`
                        : meta.label;

                    return (
                        <div className="flex h-full items-center">
                            <CommonBadgeStatus label={label} variant={meta.variant} />
                        </div>
                    );
                },
                field: 'target_audience',
                flex: 2,
                headerName: 'Audience',
                mobileCard: 'meta',
                sortable: false
            },
            {
                field: 'date',
                flex: 2,
                headerName: 'Date',
                mobileCard: 'meta',
                sortable: true,
                valueFormatter: (params) => params.value
                    ? formatDate(new Date(params.value as string))
                    : '—'
            },
            {
                cellRenderer: (params: { data: CommunicationListRow }) => {
                    const display = params.data.author_name
                        || (params.data.item_type === 'Event' && params.data.location ? params.data.location : 'Staff');

                    return (
                        <div className="flex h-full items-center">
                            <span className="text-(--mui-palette-text-secondary) text-sm truncate">
                                {display}
                            </span>
                        </div>
                    );
                },
                field: 'author_name',
                flex: 2,
                headerName: 'Posted By',
                mobileCard: 'subtitle',
                sortable: false
            }
        ];
    }, []);

    const tableActionConfig = useMemo(function() {
        return function(onDelete: (id: string) => void): TableActionConfig<CommunicationListRow> {
            return {
                menuOptions: (row: CommunicationListRow): MenuOption[] => [
                    {
                        onClick: () => onView(row.id),
                        preset: 'view'
                    },
                    {
                        onClick: () => onEdit(row.id),
                        preset: 'edit'
                    },
                    {
                        onClick: () => onDelete(row.id),
                        preset: 'delete'
                    }
                ],
                onEditClick: (row: CommunicationListRow) => () => onEdit(row.id)
            };
        };
    }, [onEdit, onView]);

    return { columnDefs, tableActionConfig };
}