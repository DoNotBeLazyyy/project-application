import CommonTable from '@components/table/CommonTable';
import { useCurriculumTableConfig } from '@pages/dean/curriculum-map-management/useCurriculumTableConfig';
import { CurriculumMapEntry } from '@type/curriculum-map.type';

interface CurriculumTermTableProps {
    termTypeLabel: string;
    entries: CurriculumMapEntry[];
    totalUnits: number;
    onDelete: (id: string) => void;
    onView: (entry: CurriculumMapEntry) => void;
}

export default function CurriculumTermTable({
    termTypeLabel,
    entries,
    totalUnits,
    onDelete,
    onView
}: CurriculumTermTableProps) {
    const { columnDefs } = useCurriculumTableConfig({ onDelete, onView });

    const pinnedBottomRow = [{
        course_code: '',
        course_title: 'Total Units',
        lecture_units: totalUnits,
        laboratory_units: null,
        prerequisites: [],
        is_elective: false,
        id: '__total__'
    }];

    return (
        <div className="border border-(--mui-palette-divider) rounded-lg flex flex-1 flex-col gap-1 min-w-0 overflow-hidden bg-(--mui-palette-background-paper)">
            <div className="border-b border-(--mui-palette-divider) font-semibold px-3 py-1.5 bg-(--mui-palette-background-default)/60 text-(--mui-palette-text-primary) text-center text-xs uppercase tracking-wider">
                {termTypeLabel}
            </div>
            <div className="min-w-0 w-full overflow-x-auto print:overflow-visible">
                <div className="min-w-[480px] w-full print:min-w-0">
                    <CommonTable
                        domLayout="autoHeight"
                        isMobileCardDisabled
                        leadingColumnDefs={columnDefs}
                        pinnedBottomRowData={pinnedBottomRow}
                        rowData={entries}
                        suppressRowVirtualisation
                        onRowClicked={(params) => {
                            if (params.data.id === '__total__') return;
                            const target = params.event?.target as HTMLElement | undefined;
                            if (
                                target?.closest('button') ||
                                target?.closest('.no-print') ||
                                target?.tagName === 'BUTTON' ||
                                target?.tagName === 'SVG' ||
                                target?.tagName === 'PATH'
                            ) {
                                return;
                            }
                            onView(params.data);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}