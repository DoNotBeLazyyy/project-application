import BulkImportModal from '@components/modal/BulkImportModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import { useTermOptions } from '@hooks/use-term-options';
import EnrollmentStudentFilterForm from '@pages/registrar/enrollment-management/EnrollmentStudentFilterForm';
import EnrollmentStudentGridCard from '@pages/registrar/enrollment-management/EnrollmentStudentGridCard';
import EnrollmentWorkspaceModal from '@pages/registrar/enrollment-management/EnrollmentWorkspaceModal';
import { useEnrollmentStudentTableConfig } from '@pages/registrar/enrollment-management/use-enrollment-student-table-config';
import AssignProgramModal from '@pages/shared/records/AssignProgramModal';
import { bulkEnrollStudents, getEnrollmentTargetTerm, listEnrollmentStudents } from '@services/enrollment.service';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import { EnrollmentBulkRow, EnrollmentStudentFilterValues, EnrollmentStudentRow } from '@type/enrollment.type';
import { SortStringDto } from '@type/http.type';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'student_number', label: 'Student No.' },
    { field: 'student_name', label: 'Student Name' },
    { field: 'program_code', label: 'Program' },
    { field: 'year_level', label: 'Year Level' },
    { field: 'enrolled_units', label: 'Enrolled Units' },
    { field: 'enrollment_state', label: 'Enrollment State' }
];

const FILTER_FORM_ID = 'filter-enrollment-students-form';

// Mirrors fn_bulk_enroll_students: the student is matched on the exact student_number, the term on
// "<Term Type> - <School Year>" (Academic/School Year are interchangeable) or the term id, blank = the
// enrollment target term, and each section code (case-insensitive) must exist in that term.
const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    {
        key: 'student_number', label: 'Student Number', hint: 'Required. Exact student number as registered, e.g. 2026-0001', sample: '2026-0001', aliases: ['student_id', 'student id', 'student_no', 'student no', 'id_number']
    },
    {
        key: 'term_label', label: 'Term Label', hint: 'Optional. "<Term> - <School Year>", e.g. 1st Semester - Academic Year 2026-2027. Blank uses the current enrollment term', sample: '1st Semester - Academic Year 2026-2027', required: false, aliases: ['term', 'semester']
    },
    {
        key: 'section_codes', label: 'Section Codes', hint: 'Required. Section codes offered in that term, separated with |, e.g. COCS101-001|COCS102-001', sample: 'COCS101-001', aliases: ['sections', 'section']
    },
    {
        key: 'allow_conflict', label: 'Allow Conflict', hint: 'Optional. true / yes / 1 to allow schedule conflicts; anything else (or blank) means false', sample: 'false', required: false, aliases: ['conflict_allowed']
    },
    {
        key: 'override_prerequisites', label: 'Override Prerequisites', hint: 'Optional. true / yes / 1 to skip unmet prerequisites; anything else (or blank) means false', sample: 'false', required: false, aliases: ['override_prereqs']
    },
    {
        key: 'conflict_reason', label: 'Conflict Reason', hint: 'Optional. Reason recorded when Allow Conflict is true', sample: '', required: false, aliases: ['reason']
    }
];

const defaultFilterValues: EnrollmentStudentFilterValues = {
    term_id: '',
    program_ids: [],
    year_levels: [],
    statuses: [],
    enrollment_states: []
};

export default function EnrollmentManagement() {
    const [activeFilters, setActiveFilters] = useState<EnrollmentStudentFilterValues | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [assignModalStudent, setAssignModalStudent] = useState<EnrollmentStudentRow | null>(null);
    const [targetTermId, setTargetTermId] = useState<string | null>(null);
    const [targetTermLabel, setTargetTermLabel] = useState('');
    const { isLoaded: isTermsLoaded, termOptions } = useTermOptions();
    const [refreshKey, setRefreshKey] = useState(0);

    const filterMethods = useForm<EnrollmentStudentFilterValues>({
        defaultValues: defaultFilterValues
    });

    useEffect(function() {
        if (!isTermsLoaded) return;

        async function fetchTermContext() {
            const targetTerm = await getEnrollmentTargetTerm();

            let initialTermId: string | null = null;
            let initialTermLabel = '';

            if (targetTerm.data) {
                initialTermId = targetTerm.data.id;
                initialTermLabel = targetTerm.data.label;
            }

            if (!initialTermId && termOptions.length > 0) {
                initialTermId = String(termOptions[0].value);
                initialTermLabel = termOptions[0].label;
            }

            if (initialTermId) {
                setTargetTermId(initialTermId);
                setTargetTermLabel(initialTermLabel);
                filterMethods.setValue('term_id', initialTermId);
            }
        }

        fetchTermContext();
    }, [filterMethods, isTermsLoaded, termOptions]);

    function handleOpenWorkspace(id: string) {
        setSelectedStudentId(id);
        setIsWorkspaceOpen(true);
    }

    function handleCloseWorkspace() {
        setIsWorkspaceOpen(false);
        setSelectedStudentId(null);
    }

    function handleRefresh() {
        setRefreshKey((previous) => previous + 1);
    }

    const { columnDefs } = useEnrollmentStudentTableConfig();

    async function fetchStudents(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        const effectiveTermId = activeFilters?.term_id || targetTermId;
        return listEnrollmentStudents(page, size, search, sort, effectiveTermId, activeFilters);
    }

    function handleFilterSubmit(values: EnrollmentStudentFilterValues) {
        if (values.term_id && values.term_id !== targetTermId) {
            setTargetTermId(values.term_id);
            const selected = termOptions.find((term) => term.value === values.term_id);
            if (selected) {
                setTargetTermLabel(selected.label);
            }
        }
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    function handleFilterReset() {
        filterMethods.reset({
            ...defaultFilterValues,
            term_id: targetTermId || ''
        });
        setActiveFilters(null);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<EnrollmentStudentRow>
                cardHeaderProps={{
                    subheader: targetTermLabel
                        ? `${targetTermLabel} · Change the term in Filter.`
                        : 'Enroll students into their curriculum subjects.',
                    title: 'Enrollment Management'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.enrollmentStudents
                    },
                    tableButtonsProps: {
                        uploadCsvButtonProps: {
                            onClick: function() {
                                setIsBulkImportOpen(true);
                            }
                        }
                    }
                }}
                dependencies={[activeFilters, targetTermId, refreshKey]}
                filterModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Narrow the roster by term, program, year level or enrollment state.',
                            title: 'Filter Students'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formId: FILTER_FORM_ID,
                    formContent: (
                        <EnrollmentStudentFilterForm
                            control={filterMethods.control}
                            id={FILTER_FORM_ID}
                            termOptions={termOptions}
                            onSubmit={filterMethods.handleSubmit(handleFilterSubmit)}
                        />
                    ),
                    onReset: handleFilterReset,
                    open: isFilterOpen,
                    onClose: function() {
                        setIsFilterOpen(false);
                    }
                }}
                renderGridCard={function(item, isSelected, onToggleSelect) {
                    return (
                        <EnrollmentStudentGridCard
                            isSelected={isSelected}
                            row={item}
                            onAssignProgram={(target) => setAssignModalStudent(target)}
                            onManage={handleOpenWorkspace}
                            onToggleSelect={onToggleSelect}
                        />
                    );
                }}
                showSubheader={true}
                sortColumns={SORT_COLUMNS}
                tableProps={{
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                onFetch={fetchStudents}
                onFilter={function() {
                    setIsFilterOpen(true);
                }}
                onRowClick={handleOpenWorkspace}
            />
            <EnrollmentWorkspaceModal
                defaultTermId={targetTermId}
                open={isWorkspaceOpen}
                studentId={selectedStudentId}
                termOptions={termOptions}
                onClose={handleCloseWorkspace}
                onEnrolled={handleRefresh}
            />
            <BulkImportModal<EnrollmentBulkRow>
                open={isBulkImportOpen}
                templateColumns={BULK_IMPORT_TEMPLATE_COLUMNS}
                templateDownloadFilename="enrollments_template.csv"
                title="Bulk Enroll Students"
                onBulkImport={bulkEnrollStudents}
                onClose={function() {
                    setIsBulkImportOpen(false);
                }}
                onMapRow={(row) => ({
                    student_number: row.student_number,
                    term_label: row.term_label,
                    section_codes: row.section_codes,
                    allow_conflict: row.allow_conflict,
                    override_prerequisites: row.override_prerequisites,
                    conflict_reason: row.conflict_reason
                })}
                onSuccess={handleRefresh}
            />
            {assignModalStudent && (
                <AssignProgramModal
                    currentProgramId={assignModalStudent.program_id}
                    currentProgramName={assignModalStudent.program_name}
                    currentYearLevel={assignModalStudent.year_level}
                    open={Boolean(assignModalStudent)}
                    studentId={assignModalStudent.id}
                    onClose={() => setAssignModalStudent(null)}
                    onSuccess={() => {
                        setAssignModalStudent(null);
                        handleRefresh();
                    }}
                />
            )}
        </div>
    );
}