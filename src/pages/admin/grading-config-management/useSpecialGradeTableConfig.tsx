import { CommonBadgeState } from '@components/badge/CommonBadgeState';
import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { SpecialGradeConfig } from '@type/grading-config.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

interface UseSpecialGradeTableConfigProps {
    onEdit: (id: string) => void;
    onRequestDeleteRow: (id: string) => void;
    onView: (id: string) => void;
}

export function useSpecialGradeTableConfig({
    onEdit,
    onView
}: UseSpecialGradeTableConfigProps) {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                cellRenderer: (params: { data: SpecialGradeConfig }) => (
                    <div className="flex h-full items-center">
                        <span className="bg-(--mui-tokens-color-neutral-100) border border-(--mui-tokens-color-neutral-300) font-bold font-mono px-2 py-0.5 rounded text-(--mui-palette-primary-main) text-xs">
                            {params.data.code}
                        </span>
                    </div>
                ),
                field: 'code',
                flex: 1,
                headerName: 'Code',
                maxWidth: 130,
                minWidth: 100,
                mobileCard: 'subtitle',
                sortable: true
            },
            {
                cellRenderer: (params: { data: SpecialGradeConfig }) => (
                    <div className="flex flex-col h-full justify-center">
                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                            {params.data.label}
                        </span>
                        {params.data.description && (
                            <span className="line-clamp-1 text-(--mui-palette-text-secondary) text-xs">
                                {params.data.description}
                            </span>
                        )}
                    </div>
                ),
                field: 'label',
                flex: 2.5,
                headerName: 'Label & Description',
                minWidth: 200,
                mobileCard: 'title',
                sortable: true
            },
            {
                cellRenderer: (params: { data: SpecialGradeConfig }) => (
                    <div className="flex h-full items-center text-(--mui-palette-text-secondary) text-sm">
                        {params.data.min_absence_percentage
                            ? `${params.data.min_absence_percentage}%`
                            : '—'}
                    </div>
                ),
                field: 'min_absence_percentage',
                flex: 1.2,
                headerName: 'Min Absence %',
                minWidth: 130,
                sortable: true
            },
            {
                cellRenderer: (params: { data: SpecialGradeConfig }) => (
                    <div className="flex h-full items-center">
                        {params.data.requires_completion
                            ? (
                                <span className="font-medium text-(--mui-palette-text-primary) text-xs">
                                    Required {params.data.completion_deadline_days
                                        ? `(${params.data.completion_deadline_days}d)`
                                        : ''}
                                </span>
                            )
                            : (
                                <span className="text-(--mui-palette-text-disabled) text-xs">
                                    None
                                </span>
                            )}
                    </div>
                ),
                field: 'requires_completion',
                flex: 1.5,
                headerName: 'Completion',
                minWidth: 140,
                sortable: true
            },
            {
                cellRenderer: (params: { data: SpecialGradeConfig }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.is_passing
                                ? 'Passing'
                                : 'Non-Passing'}
                            variant={params.data.is_passing
                                ? 'success'
                                : 'error'}
                        />
                    </div>
                ),
                field: 'is_passing',
                flex: 1.2,
                headerName: 'Passing Mark',
                minWidth: 130,
                sortable: true
            },
            {
                cellRenderer: (params: { data: SpecialGradeConfig }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeState
                            label={params.data.is_active
                                ? 'Active'
                                : 'Inactive'}
                            variant={params.data.is_active
                                ? 'active'
                                : 'inactive'}
                        />
                    </div>
                ),
                field: 'is_active',
                flex: 1,
                headerName: 'Status',
                minWidth: 110,
                mobileCard: 'meta',
                sortable: true
            }
        ];
    }, []);

    const tableActionConfig = useMemo(function() {
        return function(onDelete: (id: string) => void): TableActionConfig<SpecialGradeConfig> {
            return {
                onEditClick: (row: SpecialGradeConfig) => () => onEdit(row.id ?? row.code),
                menuOptions: (row: SpecialGradeConfig): MenuOption[] => [
                    {
                        preset: 'view',
                        onClick: () => onView(row.id ?? row.code)
                    },
                    {
                        preset: 'edit',
                        onClick: () => onEdit(row.id ?? row.code)
                    },
                    {
                        preset: 'delete',
                        onClick: () => onDelete(row.id ?? row.code)
                    }
                ]
            };
        };
    }, [onEdit, onView]);

    return { columnDefs, tableActionConfig };
}