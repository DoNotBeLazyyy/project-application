import BulkImportModal from '@components/modal/BulkImportModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import { CommonSelectOption } from '@components/select/CommonSelect';
import CommonTableCard from '@components/table-card/CommonTableCard';
import EnrollmentStudentFilterForm from '@pages/registrar/enrollment-management/EnrollmentStudentFilterForm';
import EnrollmentWorkspaceModal from '@pages/registrar/enrollment-management/EnrollmentWorkspaceModal';
import { useEnrollmentStudentTableConfig } from '@pages/registrar/enrollment-management/useEnrollmentStudentTableConfig';
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
    { key: 'student_number', label: 'Student Number', hint: 'e.g. 2024-00001' },
    { key: 'term_label', label: 'Term Label', hint: 'Blank uses the active term, e.g. 1st Semester - School Year 2026-2027' },
    { key: 'section_codes', label: 'Section Codes', hint: 'Pipe-separated, e.g. BSCS3-A|BSIT2-C|GE101-B' },
    { key: 'allow_conflict', label: 'Allow Conflict', hint: 'true or false' },
    { key: 'override_prerequisites', label: 'Override Prerequisites', hint: 'true or false' },
    { key: 'conflict_reason', label: 'Conflict Reason', hint: 'Required when Allow Conflict is true' }
];

const defaultFilterValues: EnrollmentStudentFilterValues = {
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

            if (targetTerm.data) {
                setTargetTermId(targetTerm.data.id);
                setTargetTermLabel(targetTerm.data.label);
            }

            if (terms.data) {
                setTermOptions(
                    terms.data.map((term) => ({
                        label: term.label,
                        value: term.id
                    }))
                );
            }
        }

        fetchTermContext();
    }, []);

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

    const { columnDefs, tableActionConfig } = useEnrollmentStudentTableConfig({
        onManage: handleOpenWorkspace
    });

    async function fetchStudents(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listEnrollmentStudents(page, size, search, sort, targetTermId, activeFilters);
    }

    function handleFilterSubmit(values: EnrollmentStudentFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<EnrollmentStudentRow>
                cardHeaderProps={{
                    subheader: targetTermLabel
                        ? `Enroll students into their curriculum subjects for ${targetTermLabel}.`
                        : 'Enroll students into their curriculum subjects.',
                    title: 'Enrollment Management'
                }}
                controls={{
                    tableButtonsProps: {
                        downloadCsvButtonProps: {
                            onClick: function() {
                                setIsBulkImportOpen(true);
                            }
                        },
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
                            subheader: 'Narrow the roster by program, year level or enrollment state.',
                            title: 'Filter Students'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formId: FILTER_FORM_ID,
                    formContent: (
                        <EnrollmentStudentFilterForm
                            control={filterMethods.control}
                            id={FILTER_FORM_ID}
                            onSubmit={filterMethods.handleSubmit(handleFilterSubmit)}
                        />
                    ),
                    open: isFilterOpen,
                    onClose: function() {
                        setIsFilterOpen(false);
                    }
                }}
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
        </div>
    );
}