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
    onDelete,
    onView
}: UseCurriculumTableConfigProps) {
    const columnDefs = useMemo<ColDef<CurriculumMapEntry>[]>(function() {
        return [
            {
                field: 'course_code',
                headerName: 'Code',
                flex: 1,
                sortable: false
            },
            {
                field: 'course_title',
                headerName: 'Title',
                flex: 3,
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
                headerName: 'Lec',
                flex: 1,
                sortable: false,
                cellRenderer: (params: { data: CurriculumMapEntry }) => (
                    <div className="flex h-full items-center justify-end">
                        {params.data.lecture_units || ''}
                    </div>
                )
            },
            {
                field: 'laboratory_units',
                headerName: 'Lab',
                flex: 1,
                sortable: false,
                cellRenderer: (params: { data: CurriculumMapEntry }) => (
                    <div className="flex h-full items-center justify-center">
                        {params.data.laboratory_units || ''}
                    </div>
                )
            },
            {
                colId: 'prerequisites',
                headerName: 'Pre-req',
                flex: 2,
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
                maxWidth: 80,
                minWidth: 80,
                sortable: false,
                cellRenderer: (params: { data: CurriculumMapEntry }) => (
                    <div className="flex h-full items-center">
                        {params.data.is_elective && (
                            <CommonBadgeStatus
                                label="Elective"
                                variant="info"
                            />
                        )}
                    </div>
                )
            },
            {
                colId: 'actions',
                headerName: '',
                maxWidth: 40,
                minWidth: 40,
                sortable: false,
                cellClass: 'no-print',
                headerClass: 'no-print',
                cellRenderer: (params: { data: CurriculumMapEntry }) => {
                    if (params.data.id === '__total__') return null;
                    return (
                        <div className="flex h-full items-center justify-center">
                            <TrashIcon
                                className="cursor-pointer text-(--mui-palette-error-main)"
                                size={14}
                                weight="bold"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(params.data.id);
                                }}
                            />
                        </div>
                    );
                }
            }
        ];
    }, [onDelete]);

    return { columnDefs };
}