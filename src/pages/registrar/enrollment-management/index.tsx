import BulkImportModal from '@components/modal/BulkImportModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import EnrollmentStudentFilterForm from '@pages/registrar/enrollment-management/EnrollmentStudentFilterForm';
import EnrollmentStudentGridCard from '@pages/registrar/enrollment-management/EnrollmentStudentGridCard';
import EnrollmentWorkspaceModal from '@pages/registrar/enrollment-management/EnrollmentWorkspaceModal';
import { useEnrollmentStudentTableConfig } from '@pages/registrar/enrollment-management/useEnrollmentStudentTableConfig';
import AssignProgramModal from '@pages/shared/records/AssignProgramModal';
import CreditTransfereeCoursesModal from '@pages/shared/records/CreditTransfereeCoursesModal';
import { CalendarBlankIcon } from '@phosphor-icons/react';
import { bulkEnrollStudents, getEnrollmentTargetTerm, listEnrollmentStudents } from '@services/enrollment.service';
import { getTerms } from '@services/section.service';
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

const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    { key: 'student_number', label: 'Student Number', hint: 'e.g. 2024-00001', sample: '2026-00001', aliases: ['student_id', 'student id', 'student_no', 'student no', 'id_number'] },
    { key: 'term_label', label: 'Term Label', hint: 'Blank uses active term, e.g. 1st Semester - School Year 2026-2027 (optional)', sample: '1st Semester - Academic Year 2027-2028', required: false, aliases: ['term', 'semester'] },
    { key: 'section_codes', label: 'Section Codes', hint: 'Pipe-separated, e.g. BSCS3-A|BSIT2-C|GE101-B', sample: 'BSCS1-A|COCS101-001', aliases: ['sections', 'section'] },
    { key: 'allow_conflict', label: 'Allow Conflict', hint: 'true or false (optional, defaults false)', sample: 'false', required: false, aliases: ['conflict_allowed'] },
    { key: 'override_prerequisites', label: 'Override Prerequisites', hint: 'true or false (optional, defaults false)', sample: 'false', required: false, aliases: ['override_prereqs'] },
    { key: 'conflict_reason', label: 'Conflict Reason', hint: 'Required when Allow Conflict is true (optional)', sample: '', required: false, aliases: ['reason'] }
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
    const [creditModalStudent, setCreditModalStudent] = useState<EnrollmentStudentRow | null>(null);
    const [targetTermId, setTargetTermId] = useState<string | null>(null);
    const [targetTermLabel, setTargetTermLabel] = useState('');
    const [termOptions, setTermOptions] = useState<CommonSelectOption[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    const filterMethods = useForm<EnrollmentStudentFilterValues>({
        defaultValues: defaultFilterValues
    });

    useEffect(function() {
        async function fetchTermContext() {
            const [targetTerm, terms] = await Promise.all([
                getEnrollmentTargetTerm(),
                getTerms()
            ]);

            let initialTermId: string | null = null;
            let initialTermLabel = '';

            if (targetTerm.data) {
                initialTermId = targetTerm.data.id;
                initialTermLabel = targetTerm.data.label;
            }

            if (terms.data) {
                const options = terms.data.map((term) => ({
                    label: term.label,
                    value: term.id
                }));
                setTermOptions(options);

                if (!initialTermId && options.length > 0) {
                    initialTermId = String(options[0].value);
                    initialTermLabel = options[0].label;
                }
            }

            if (initialTermId) {
                setTargetTermId(initialTermId);
                setTargetTermLabel(initialTermLabel);
                filterMethods.setValue('term_id', initialTermId);
            }
        }

        fetchTermContext();
    }, [filterMethods]);

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

    function handleTermChange(newTermId: string) {
        setTargetTermId(newTermId);
        const selected = termOptions.find((term) => term.value === newTermId);
        if (selected) {
            setTargetTermLabel(selected.label);
        }
        filterMethods.setValue('term_id', newTermId);
        if (activeFilters) {
            setActiveFilters((previous) => (previous
                ? { ...previous, term_id: newTermId }
                : null));
        }
    }

    const { columnDefs, tableActionConfig } = useEnrollmentStudentTableConfig({
        onManage: handleOpenWorkspace,
        onAssignProgram: (row) => setAssignModalStudent(row),
        onCreditCourses: (row) => setCreditModalStudent(row)
    });

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
            {/* Term Context & Switcher Bar */}
            <div className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="bg-(--mui-palette-primary-main)/10 text-(--mui-palette-primary-main) p-2 rounded-lg flex items-center justify-center shrink-0">
                        <CalendarBlankIcon size={20} weight="bold" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-(--mui-palette-text-secondary) uppercase tracking-wider">
                            Active Academic Term
                        </span>
                        <span className="text-sm font-bold text-(--mui-palette-text-primary)">
                            {targetTermLabel || 'Loading term...'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="font-medium text-(--mui-palette-text-secondary) text-xs whitespace-nowrap">
                        Term / Academic Year:
                    </span>
                    <div className="w-full sm:w-80">
                        <CommonSelect
                            fullWidth
                            options={termOptions}
                            size="small"
                            value={targetTermId ?? ''}
                            onChange={(event) => handleTermChange(event.target.value)}
                        />
                    </div>
                </div>
            </div>

            <CommonTableCard<EnrollmentStudentRow>
                cardHeaderProps={{
                    subheader: targetTermLabel
                        ? `Enroll students into their curriculum subjects for ${targetTermLabel}.`
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
                tableActionConfig={tableActionConfig}
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
            {creditModalStudent && (
                <CreditTransfereeCoursesModal
                    open={Boolean(creditModalStudent)}
                    programCode={creditModalStudent.program_code}
                    programName={creditModalStudent.program_name}
                    studentId={creditModalStudent.id}
                    studentName={creditModalStudent.student_name}
                    studentNumber={creditModalStudent.student_number}
                    yearLevel={creditModalStudent.year_level}
                    onClose={() => setCreditModalStudent(null)}
                    onSuccess={() => {
                        handleRefresh();
                    }}
                />
            )}
        </div>
    );
}