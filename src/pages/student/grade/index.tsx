import CommonCard from '@components/card/CommonCard';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import { CommonSelectOption } from '@components/select/CommonSelect';
import ValidCommonSelect from '@components/select/ValidCommonSelect';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { getTerms } from '@services/section.service';
import { listStudentGrades } from '@services/student-portal.service';
import { SortStringDto } from '@type/http.type';
import { MyGradeListRow, MyGradesFilterValues } from '@type/student-portal.type';
import { ColDef } from 'ag-grid-community';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'course_code', label: 'Course Code' },
    { field: 'course_title', label: 'Course Title' },
    { field: 'term_label', label: 'Term' },
    { field: 'grading_period_sequence', label: 'Grading Period' }
];

export default function StudentGrades() {
    const [termOptions, setTermOptions] = useState<CommonSelectOption[]>([]);
    const [activeTermId, setActiveTermId] = useState('');

    const filterMethods = useForm<MyGradesFilterValues>({
        defaultValues: { term_id: '' }
    });

    const watchedTermId = filterMethods.watch('term_id');

    useEffect(function() {
        async function fetchTerms() {
            const result = await getTerms();

            if (result.data) {
                const options = result.data.map((t) => ({ label: t.label, value: t.id }));
                setTermOptions(options);

                if (options.length > 0) {
                    filterMethods.setValue('term_id', options[0].value);
                    setActiveTermId(options[0].value);
                }
            }
        }

        fetchTerms();
    }, []);

    useEffect(function() {
        setActiveTermId(watchedTermId);
    }, [watchedTermId]);

    const columnDefs = useMemo<ColDef<MyGradeListRow>[]>(function() {
        return [
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
                field: 'section_code',
                flex: 1,
                headerName: 'Section',
                sortable: false
            },
            {
                field: 'grading_period_name',
                flex: 1,
                headerName: 'Period',
                sortable: true
            },
            {
                field: 'raw_grade',
                flex: 1,
                headerName: 'Raw',
                sortable: false,
                valueFormatter: (params) => params.value != null
                    ? `${params.value}%`
                    : '—'
            },
            {
                field: 'final_grade',
                flex: 1,
                headerName: 'Final',
                sortable: false,
                valueFormatter: (params) => params.value != null
                    ? `${params.value}%`
                    : '—'
            },
            {
                field: 'transmuted_grade',
                flex: 1,
                headerName: 'Transmuted',
                sortable: false,
                valueFormatter: (params) => params.value != null
                    ? String(params.value)
                    : params.data?.special_grade ?? '—'
            }
        ];
    }, []);

    async function fetchGrades(
        page: number,
        size: number,
        _search: string,
        sort: SortStringDto[]
    ) {
        return listStudentGrades(page, size, sort, activeTermId);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonCard className="flex gap-3 items-center p-3">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm whitespace-nowrap">
                    Term
                </span>
                <div className="w-72">
                    <ValidCommonSelect
                        control={filterMethods.control}
                        fullWidth
                        name="term_id"
                        options={termOptions}
                        size="small"
                    />
                </div>
            </CommonCard>
            <div className="flex-1 min-h-0">
                <CommonTableCard<MyGradeListRow>
                    cardHeaderProps={{
                        subheader: 'Released grades where evaluation is completed.',
                        title: 'My Grades'
                    }}
                    dependencies={[activeTermId]}
                    sortColumns={SORT_COLUMNS}
                    tableProps={{
                        leadingColumnDefs: columnDefs
                    }}
                    uniqueIdKey="enrollment_id"
                    onFetch={fetchGrades}
                />
            </div>
        </div>
    );
}