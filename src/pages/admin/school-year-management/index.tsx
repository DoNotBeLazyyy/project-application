import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import SchoolYearFilterForm from '@pages/admin/school-year-management/SchoolYearFilterForm';
import SchoolYearGridCard from '@pages/admin/school-year-management/SchoolYearGridCard';
import { useSchoolYearTableConfig } from '@pages/admin/school-year-management/useSchoolYearTableConfig';
import AcademicYearWizardModal from '@pages/admin/school-year-management/wizard/AcademicYearWizardModal';
import {
    bulkDeleteSchoolYears,
    deleteSchoolYear,
    listSchoolYears
} from '@services/school-year.service';
import { SortStringDto } from '@type/http.type';
import { SchoolYearFilterValues, SchoolYearListRow } from '@type/school-year.type';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'code', label: 'Code' },
    { field: 'label', label: 'Label' },
    { field: 'start_date', label: 'Start Date' },
    { field: 'end_date', label: 'End Date' }
];

const FILTER_FORM_ID = 'filter-school-year-form';

export default function SchoolYearManagement() {
    const [activeFilters, setActiveFilters] = useState<SchoolYearFilterValues | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Wizard modal state
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardSchoolYearId, setWizardSchoolYearId] = useState<string | null>(null);
    const [isWizardReadOnly, setIsWizardReadOnly] = useState(false);

    const filterMethods = useForm<SchoolYearFilterValues>({
        defaultValues: {
            is_active: 'All',
            year: ''
        }
    });

    function triggerRefresh() {
        setRefreshKey((prev) => prev + 1);
    }

    function handleOpenCreate() {
        setWizardSchoolYearId(null);
        setIsWizardReadOnly(false);
        setIsWizardOpen(true);
    }

    function handleOpenView(id: string) {
        setWizardSchoolYearId(id);
        setIsWizardReadOnly(true);
        setIsWizardOpen(true);
    }

    function handleOpenUpdate(id: string) {
        setWizardSchoolYearId(id);
        setIsWizardReadOnly(false);
        setIsWizardOpen(true);
    }

    function handleCloseWizard() {
        setIsWizardOpen(false);
        setWizardSchoolYearId(null);
        setIsWizardReadOnly(false);
    }

    const { columnDefs, tableActionConfig } = useSchoolYearTableConfig({
        onEdit: handleOpenUpdate,
        onRequestDeleteRow: function() {},
        onView: handleOpenView
    });

    async function fetchSchoolYears(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listSchoolYears(page, size, search, sort, activeFilters);
    }

    function handleFilterSubmit(values: SchoolYearFilterValues) {
        setActiveFilters(values);
    }

    function handleFilterReset() {
        filterMethods.reset();
        setActiveFilters(null);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<SchoolYearListRow>
                cardHeaderProps={{
                    subheader: 'Manage academic years, terms, grading periods, and grade transmutation schemas.',
                    title: 'Academic Years'
                }}
                controls={{
                    tableButtonsProps: {
                        createButtonProps: {
                            onClick: handleOpenCreate
                        }
                    },
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.schoolYears
                    }
                }}
                dependencies={[activeFilters, refreshKey]}
                filterModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Filter academic years by active status.',
                            title: 'Filter Academic Years'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formId: FILTER_FORM_ID,
                    formContent: (
                        <SchoolYearFilterForm
                            control={filterMethods.control}
                            id={FILTER_FORM_ID}
                            onReset={handleFilterReset}
                            onSubmit={filterMethods.handleSubmit(handleFilterSubmit)}
                        />
                    ),
                    onReset: handleFilterReset,
                    open: isFilterOpen,
                    onClose: function() {
                        setIsFilterOpen(false);
                    }
                }}
                renderGridCard={function(item, isSelected, onToggleSelect, onRequestDeleteRow) {
                    return (
                        <SchoolYearGridCard
                            isSelected={isSelected}
                            row={item}
                            onEdit={handleOpenUpdate}
                            onRequestDelete={onRequestDeleteRow}
                            onToggleSelect={onToggleSelect}
                            onView={handleOpenView}
                        />
                    );
                }}
                sortColumns={SORT_COLUMNS}
                tableActionConfig={tableActionConfig}
                tableProps={{
                    hasCheckbox: true,
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                onCreate={handleOpenCreate}
                onDelete={bulkDeleteSchoolYears}
                onDeleteRow={deleteSchoolYear}
                onFetch={fetchSchoolYears}
                onFilter={() => setIsFilterOpen(true)}
                onRowClick={handleOpenView}
            />

            {/* Academic Year & Calendar Wizard Modal */}
            <AcademicYearWizardModal
                open={isWizardOpen}
                readOnly={isWizardReadOnly}
                schoolYearId={wizardSchoolYearId}
                onClose={handleCloseWizard}
                onSuccess={triggerRefresh}
            />
        </div>
    );
}