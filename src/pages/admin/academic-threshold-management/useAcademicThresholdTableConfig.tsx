import { CommonBadgeState } from '@components/badge/CommonBadgeState';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { AcademicThreshold } from '@type/academic-threshold.type';
import { MobileCardColDef } from '@type/table.type';
import { formatGwaBand, formatThresholdDiscount } from '@utils/academic-threshold.util';
import { useMemo } from 'react';

interface UseAcademicThresholdTableConfigProps {
    onEdit: (id: string) => void;
    onView: (id: string) => void;
}

/**
 * Table view of the threshold ladder. The columns mirror the grid card's facts
 * so the two views read the same, and the row menu offers View and Edit only -
 * a seeded threshold is retired by clearing Active, never deleted.
 */
export function useAcademicThresholdTableConfig({
    onEdit,
    onView
}: UseAcademicThresholdTableConfigProps) {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                cellRenderer: (params: { data: AcademicThreshold }) => (
                    <div className="flex font-semibold h-full items-center text-(--mui-palette-text-primary) text-sm">
                        {params.data.label}
                    </div>
                ),
                field: 'label',
                flex: 2.5,
                headerName: 'Threshold',
                minWidth: 200,
                mobileCard: 'title',
                sortable: true
            },
            {
                cellRenderer: (params: { data: AcademicThreshold }) => (
                    <div className="flex font-medium h-full items-center text-(--mui-palette-text-primary) text-sm">
                        {formatGwaBand(params.data.min_gwa, params.data.max_gwa)}
                    </div>
                ),
                field: 'max_gwa',
                flex: 1.3,
                headerName: 'GWA Band',
                minWidth: 140,
                sortable: true
            },
            {
                cellRenderer: (params: { data: AcademicThreshold }) => (
                    <div className="flex font-medium h-full items-center text-(--mui-palette-text-primary) text-sm">
                        {params.data.category === 'Standing' || params.data.min_subject_grade === null
                            ? (
                                <span className="text-(--mui-palette-text-disabled) text-xs">
                                    None
                                </span>
                            )
                            : (
                                <span className="font-mono text-xs">
                                    &le; {Number(params.data.min_subject_grade)
                                        .toFixed(2)}
                                </span>
                            )}
                    </div>
                ),
                field: 'min_subject_grade',
                flex: 1.3,
                headerName: 'Min Subj Grade',
                minWidth: 140,
                sortable: true
            },
            {
                cellRenderer: (params: { data: AcademicThreshold }) => (
                    <div className="flex h-full items-center">
                        {params.data.category === 'Standing'
                            ? (
                                <span className="text-(--mui-palette-text-disabled) text-xs">
                                    Not applicable
                                </span>
                            )
                            : (
                                <span
                                    className={params.data.requires_no_failing
                                        ? 'font-medium text-blue-600 text-xs'
                                        : 'font-medium text-(--mui-palette-text-primary) text-xs'}
                                >
                                    {params.data.requires_no_failing
                                        ? 'Required'
                                        : 'Not required'}
                                </span>
                            )}
                    </div>
                ),
                field: 'requires_no_failing',
                flex: 1.3,
                headerName: 'No Failing Grade',
                minWidth: 150,
                sortable: true
            },
            {
                cellRenderer: (params: { data: AcademicThreshold }) => (
                    <div className="flex h-full items-center text-(--mui-palette-text-secondary) text-sm">
                        {formatThresholdDiscount(params.data)}
                    </div>
                ),
                field: 'scholarship_discount_pct',
                flex: 1.1,
                headerName: 'Discount',
                minWidth: 120,
                sortable: true
            },
            {
                cellRenderer: (params: { data: AcademicThreshold }) => (
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

    const tableActionConfig = useMemo<TableActionConfig<AcademicThreshold>>(function() {
        return {
            onEditClick: (row: AcademicThreshold) => () => onEdit(row.id),
            menuOptions: (row: AcademicThreshold): MenuOption[] => [
                {
                    preset: 'view',
                    onClick: () => onView(row.id)
                },
                {
                    preset: 'edit',
                    onClick: () => onEdit(row.id)
                }
            ]
        };
    }, [onEdit, onView]);

    return { columnDefs, tableActionConfig };
}