import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { TrashIcon } from '@phosphor-icons/react';
import { CurriculumMapEntry } from '@type/curriculum-map.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

interface UseCurriculumTableConfigProps {
    onDelete: (id: string) => void;
    onView: (entry: CurriculumMapEntry) => void;
}

export function useCurriculumTableConfig({
    onDelete
}: UseCurriculumTableConfigProps) {
    const columnDefs = useMemo<ColDef<CurriculumMapEntry>[]>(function() {
        return [
            {
                field: 'course_code',
                flex: 1,
                headerName: 'Code',
                minWidth: 80,
                sortable: false
            },
            {
                field: 'course_title',
                flex: 2.5,
                headerName: 'Title',
                minWidth: 150,
                sortable: false,
                cellRenderer: (params: { data: CurriculumMapEntry }) => {
                    const isTotal = params.data.id === '__total__';

                    return (
                        <div className="flex h-full items-center">
                            <span
                                className={isTotal
                                    ? 'font-semibold text-(--mui-palette-text-primary)'
                                    : ''}>
                                {isTotal
                                    ? 'Total Units'
                                    : params.data.course_title}
                            </span>
                        </div>
                    );
                }
            },
            {
                field: 'lecture_units',
                flex: 0.8,
                headerName: 'Lec',
                minWidth: 48,
                sortable: false,
                cellRenderer: (params: { data: CurriculumMapEntry }) => (
                    <div className="flex h-full items-center justify-end">
                        {params.data.lecture_units || ''}
                    </div>
                )
            },
            {
                field: 'laboratory_units',
                flex: 0.8,
                headerName: 'Lab',
                minWidth: 48,
                sortable: false,
                cellRenderer: (params: { data: CurriculumMapEntry }) => (
                    <div className="flex h-full items-center justify-center">
                        {params.data.laboratory_units || ''}
                    </div>
                )
            },
            {
                colId: 'prerequisites',
                flex: 1.5,
                headerName: 'Pre-req',
                minWidth: 85,
                sortable: false,
                cellRenderer: (params: { data: CurriculumMapEntry }) => {
                    if (params.data.id === '__total__') return null;

                    return (
                        <div className="flex h-full items-center">
                            <span className="text-xs">
                                {params.data.prerequisites.length > 0
                                    ? params.data.prerequisites.map((prereq) => prereq.code)
                                        .join(', ')
                                    : 'None'
                                }
                            </span>
                        </div>
                    );
                }
            },
            {
                colId: 'is_elective',
                headerName: '',
                maxWidth: 90,
                minWidth: 70,
                sortable: false,
                cellRenderer: (params: { data: CurriculumMapEntry }) => (
                    <div className="flex h-full items-center justify-center">
                        {params.data.is_elective && (
                            <span className="whitespace-nowrap">
                                <CommonBadgeStatus
                                    label="Elective"
                                    variant="info"
                                />
                            </span>
                        )}
                    </div>
                )
            },
            {
                colId: 'actions',
                headerName: '',
                maxWidth: 48,
                minWidth: 44,
                sortable: false,
                cellClass: 'no-print',
                headerClass: 'no-print',
                cellRenderer: (params: { data: CurriculumMapEntry }) => {
                    if (params.data.id === '__total__') return null;
                    return (
                        <div className="flex h-full items-center justify-center">
                            <button
                                className="cursor-pointer flex h-8 items-center justify-center rounded-full text-(--mui-palette-error-main) transition-colors w-8 hover:bg-(--mui-palette-error-main)/10"
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.nativeEvent?.stopImmediatePropagation?.();
                                    onDelete(params.data.id);
                                }}
                            >
                                <TrashIcon
                                    size={20}
                                    weight="bold"
                                />
                            </button>
                        </div>
                    );
                }
            }
        ];
    }, [onDelete]);

    return { columnDefs };
}