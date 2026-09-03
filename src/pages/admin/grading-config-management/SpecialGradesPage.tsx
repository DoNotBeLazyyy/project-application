import { CommonBadgeState } from '@components/badge/CommonBadgeState';
import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import SpecialGradeFilterForm from '@pages/admin/grading-config-management/SpecialGradeFilterForm';
import SpecialGradeForm from '@pages/admin/grading-config-management/SpecialGradeForm';
import SpecialGradeGridCard from '@pages/admin/grading-config-management/SpecialGradeGridCard';
import { useSpecialGradeTableConfig } from '@pages/admin/grading-config-management/useSpecialGradeTableConfig';
import { deleteSpecialGradeConfig, getSpecialGradeConfigs, saveSpecialGradeConfigs } from '@services/grading-config.service';
import { useToastStore } from '@stores/toast.store';
import { SpecialGradeConfig, SpecialGradeFilterValues, SpecialGradeFormValues } from '@type/grading-config.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import { formErrors } from '@utils/form.util';
import { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'code', label: 'Code' },
    { field: 'label', label: 'Label' },
    { field: 'priority', label: 'Priority' }
];

const CREATE_FORM_ID = 'create-special-grade-form';
const UPDATE_FORM_ID = 'update-special-grade-form';
const FILTER_FORM_ID = 'filter-special-grade-form';

const DEFAULT_FORM_VALUES: SpecialGradeFormValues = {
    allows_section_override: false,
    code: '',
    completion_deadline_days: '',
    conditions: { all: [] },
    description: '',
    is_active: true,
    is_auto_detected: false,
    is_passing: false,
    label: '',
    min_absence_percentage: '',
    priority: '100',
    requires_completion: false
};

function buildSpecialGradeListDto(
    rows: SpecialGradeConfig[],
    page: number,
    size: number,
    search?: string,
    filters?: SpecialGradeFilterValues | null,
    sortCol?: string,
    sortDir?: string
): CommonListResDto<SpecialGradeConfig> {
    let filtered = [...rows];

    if (search && search.trim()) {
        const query = search.toLowerCase()
            .trim();
        filtered = filtered.filter((row) =>
            row.code.toLowerCase()
                .includes(query)
            || row.label.toLowerCase()
                .includes(query)
            || (row.description && row.description.toLowerCase()
                .includes(query)));
    }

    if (filters) {
        if (filters.is_active && filters.is_active !== 'All') {
            const activeVal = filters.is_active === 'Active';
            filtered = filtered.filter((row) => row.is_active === activeVal);
        }
        if (filters.is_passing && filters.is_passing !== 'All') {
            const passVal = filters.is_passing === 'Passing';
            filtered = filtered.filter((row) => row.is_passing === passVal);
        }
        if (filters.requires_completion && filters.requires_completion !== 'All') {
            const compVal = filters.requires_completion === 'Required';
            filtered = filtered.filter((row) => row.requires_completion === compVal);
        }
    }

    if (sortCol) {
        filtered.sort((a, b) => {
            let aVal: string | number = (a as unknown as Record<string, string | number>)[sortCol] ?? '';
            let bVal: string | number = (b as unknown as Record<string, string | number>)[sortCol] ?? '';
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
            }
            if (typeof bVal === 'string') {
                bVal = bVal.toLowerCase();
            }
            if (aVal < bVal) {
                return sortDir === 'DESC'
                    ? 1
                    : -1;
            }
            if (aVal > bVal) {
                return sortDir === 'DESC'
                    ? -1
                    : 1;
            }
            return 0;
        });
    }

    const totalElements = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / size));
    const pageNumber = Math.min(Math.max(page, 1), totalPages) - 1;
    const offset = pageNumber * size;
    const content = filtered.slice(offset, offset + size);

    return {
        content,
        empty: totalElements === 0,
        first: pageNumber === 0,
        last: pageNumber === totalPages - 1,
        number: pageNumber,
        numberOfElements: content.length,
        pageable: {
            offset,
            paged: true,
            pageNumber,
            pageSize: size,
            sort: { empty: true, sorted: false, unsorted: true },
            unpaged: false
        },
        size,
        sort: { empty: true, sorted: false, unsorted: true },
        totalElements,
        totalPages
    };
}

export default function SpecialGradesPage() {
    const [specialGrades, setSpecialGrades] = useState<SpecialGradeConfig[]>([]);
    const [activeFilters, setActiveFilters] = useState<SpecialGradeFilterValues | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const createMethods = useForm<SpecialGradeFormValues>({
        defaultValues: DEFAULT_FORM_VALUES
    });

    const filterMethods = useForm<SpecialGradeFilterValues>({
        defaultValues: { is_active: 'All', is_passing: 'All', requires_completion: 'All' }
    });

    const updateMethods = useForm<SpecialGradeFormValues>({
        defaultValues: DEFAULT_FORM_VALUES
    });

    function refreshList() {
        setActiveFilters((prev) => ({ ...prev } as SpecialGradeFilterValues));
    }

    function loadIntoForm(idOrCode: string) {
        const grade = specialGrades.find((g) => (g.id
            ? g.id === idOrCode
            : g.code === idOrCode));
        if (grade) {
            updateMethods.reset({
                allows_section_override: grade.allows_section_override ?? false,
                code: grade.code,
                completion_deadline_days: grade.completion_deadline_days
                    ? String(grade.completion_deadline_days)
                    : '',
                conditions: grade.conditions ?? { all: [] },
                description: grade.description ?? '',
                is_active: grade.is_active,
                is_auto_detected: grade.is_auto_detected ?? false,
                is_passing: grade.is_passing,
                label: grade.label,
                min_absence_percentage: grade.min_absence_percentage
                    ? String(grade.min_absence_percentage)
                    : '',
                priority: String(grade.priority ?? 100),
                requires_completion: grade.requires_completion
            });
        }
    }

    function handleOpenView(idOrCode: string) {
        setSelectedId(idOrCode);
        loadIntoForm(idOrCode);
        setIsViewOpen(true);
    }

    function handleCloseView() {
        setIsViewOpen(false);
        setSelectedId(null);
        updateMethods.reset(DEFAULT_FORM_VALUES);
    }

    function handleOpenUpdate(idOrCode: string) {
        setSelectedId(idOrCode);
        loadIntoForm(idOrCode);
        setIsUpdateOpen(true);
    }

    function handleCloseCreate() {
        setIsCreateOpen(false);
        createMethods.reset(DEFAULT_FORM_VALUES);
    }

    function handleCloseUpdate() {
        setIsUpdateOpen(false);
        setSelectedId(null);
        updateMethods.reset(DEFAULT_FORM_VALUES);
    }

    function handleSwitchToEdit(idOrCode: string) {
        handleCloseView();
        handleOpenUpdate(idOrCode);
    }

    async function handleCreateSubmit(values: SpecialGradeFormValues) {
        const codeNormalized = values.code.trim()
            .toUpperCase();
        if (specialGrades.some((g) => g.code.toUpperCase() === codeNormalized)) {
            useToastStore.getState()
                .showToast(`A special grade with code "${codeNormalized}" already exists.`, 'warning');
            return;
        }

        const newGrade: SpecialGradeConfig = {
            allows_section_override: values.allows_section_override ?? false,
            code: codeNormalized,
            completion_deadline_days: values.requires_completion && values.completion_deadline_days
                ? Number(values.completion_deadline_days)
                : null,
            conditions: values.conditions ?? { all: [] },
            description: values.description.trim(),
            is_active: values.is_active,
            is_auto_detected: values.is_auto_detected,
            is_passing: values.is_passing,
            label: values.label.trim(),
            min_absence_percentage: values.min_absence_percentage
                ? Number(values.min_absence_percentage)
                : null,
            priority: Number(values.priority) || 100,
            requires_completion: values.requires_completion
        };

        const updatedList = [...specialGrades, newGrade];
        const result = await saveSpecialGradeConfigs(updatedList);

        if (!result.error) {
            useToastStore.getState()
                .showToast('Special grade rule created successfully.', 'success');
            handleCloseCreate();
            refreshList();
        }
    }

    async function handleUpdateSubmit(values: SpecialGradeFormValues) {
        if (!selectedId) {
            return;
        }

        const updatedList = specialGrades.map((g) => {
            const isTarget = g.id
                ? g.id === selectedId
                : g.code === selectedId;
            if (!isTarget) {
                return g;
            }
            return {
                ...g,
                allows_section_override: values.allows_section_override ?? false,
                code: values.code.trim()
                    .toUpperCase(),
                completion_deadline_days: values.requires_completion && values.completion_deadline_days
                    ? Number(values.completion_deadline_days)
                    : null,
                conditions: values.conditions ?? { all: [] },
                description: values.description.trim(),
                is_active: values.is_active,
                is_auto_detected: values.is_auto_detected,
                is_passing: values.is_passing,
                label: values.label.trim(),
                min_absence_percentage: values.min_absence_percentage
                    ? Number(values.min_absence_percentage)
                    : null,
                priority: Number(values.priority) || 100,
                requires_completion: values.requires_completion
            };
        });

        const result = await saveSpecialGradeConfigs(updatedList);

        if (!result.error) {
            useToastStore.getState()
                .showToast('Special grade rule updated successfully.', 'success');
            handleCloseUpdate();
            refreshList();
        }
    }

    async function handleDelete(idOrCode: string): Promise<ServiceResult<unknown>> {
        const target = specialGrades.find((g) => (g.id
            ? g.id === idOrCode
            : g.code === idOrCode));
        if (target && target.id) {
            const result = await deleteSpecialGradeConfig(target.id);
            if (!result.error) {
                useToastStore.getState()
                    .showToast('Special grade rule deleted successfully.', 'success');
                refreshList();
            }
            return result;
        }
        const updatedList = specialGrades.filter((g) => (g.id
            ? g.id !== idOrCode
            : g.code !== idOrCode));
        const result = await saveSpecialGradeConfigs(updatedList);
        if (!result.error) {
            useToastStore.getState()
                .showToast('Special grade rule removed successfully.', 'success');
            refreshList();
        }
        return result;
    }

    function handleFilterApply(values: SpecialGradeFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    function handleFilterReset() {
        filterMethods.reset({ is_active: 'All', is_passing: 'All', requires_completion: 'All' });
        setActiveFilters(null);
        setIsFilterOpen(false);
    }

    async function fetchSpecialGrades(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ): Promise<ServiceResult<CommonListResDto<SpecialGradeConfig>>> {
        const result = await getSpecialGradeConfigs();
        if (!result.data) {
            return { data: null, error: result.error };
        }
        setSpecialGrades(result.data);
        const activeSort = sort.length > 0
            ? sort[0]
            : undefined;
        const dto = buildSpecialGradeListDto(
            result.data,
            page,
            size,
            search,
            activeFilters,
            activeSort?.sortKey,
            activeSort
                ? (activeSort.isAsc
                    ? 'ASC'
                    : 'DESC')
                : undefined
        );
        return { data: dto, error: null };
    }

    const { columnDefs, tableActionConfig } = useSpecialGradeTableConfig({
        onEdit: handleOpenUpdate,
        onRequestDeleteRow: (id) => void handleDelete(id),
        onView: handleOpenView
    });

    const activeGrade = specialGrades.find((g) => (g.id
        ? g.id === selectedId
        : g.code === selectedId));

    return (
        <CommonTableCard<SpecialGradeConfig>
            cardHeaderProps={{
                subheader: 'Configure INC, FDA, DROP, passing criteria, and completion deadlines.',
                title: 'Special Grade Rules'
            }}
            controls={{
                tableInputProps: {
                    searchHints: SEARCH_HINTS.specialGrades
                }
            }}
            createModalProps={{
                cardProps: {
                    cardHeaderProps: {
                        subheader: 'Add a new special grade rule (e.g. INC, FDA, DRP).',
                        title: 'Create Special Grade Rule'
                    }
                },
                confirmText: 'Create Rule',
                formContent: (
                    <SpecialGradeForm
                        control={createMethods.control}
                        id={CREATE_FORM_ID}
                        onSubmit={createMethods.handleSubmit(
                            handleCreateSubmit,
                            (errs: FieldErrors<SpecialGradeFormValues>) => formErrors(errs, createMethods)
                        )}
                    />
                ),
                formId: CREATE_FORM_ID,
                open: isCreateOpen,
                onClose: handleCloseCreate
            }}
            dependencies={[activeFilters]}
            filterModalProps={{
                cardProps: {
                    cardHeaderProps: {
                        subheader: 'Filter special grade rules by status and passing criteria.',
                        title: 'Filter Special Grades'
                    }
                },
                confirmText: 'Apply Filters',
                formContent: (
                    <SpecialGradeFilterForm
                        control={filterMethods.control}
                        id={FILTER_FORM_ID}
                        onSubmit={filterMethods.handleSubmit(handleFilterApply)}
                    />
                ),
                formId: FILTER_FORM_ID,
                open: isFilterOpen,
                onClose: function() {
                    setIsFilterOpen(false);
                },
                onReset: handleFilterReset
            }}
            renderGridCard={function(item, isSelected, onToggleSelect, onRequestDeleteRow) {
                return (
                    <SpecialGradeGridCard
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
                hasCheckbox: false,
                leadingColumnDefs: columnDefs
            }}
            uniqueIdKey="code"
            updateModalProps={{
                cardProps: {
                    cardHeaderProps: {
                        subheader: 'Update the policy and settings for this special grade.',
                        title: 'Edit Special Grade Rule'
                    }
                },
                confirmText: 'Save Changes',
                formContent: (
                    <SpecialGradeForm
                        control={updateMethods.control}
                        id={UPDATE_FORM_ID}
                        isCodeDisabled
                        onSubmit={updateMethods.handleSubmit(
                            handleUpdateSubmit,
                            (errs: FieldErrors<SpecialGradeFormValues>) => formErrors(errs, updateMethods)
                        )}
                    />
                ),
                formId: UPDATE_FORM_ID,
                isDirty: updateMethods.formState.isDirty,
                open: isUpdateOpen,
                onClose: handleCloseUpdate
            }}
            viewModalProps={{
                cardProps: {
                    cardHeaderProps: {
                        subheader: 'Viewing special grade configuration details.',
                        title: 'Special Grade Rule Details'
                    }
                },
                confirmText: 'Edit',
                formButtonsProps: {
                    confirmProps: {
                        onClick: function() {
                            if (selectedId) {
                                handleSwitchToEdit(selectedId);
                            }
                        }
                    }
                },
                formContent: activeGrade
                    ? (
                        <div className="flex flex-col gap-4 py-1 text-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex gap-2 items-center">
                                    <span className="bg-(--mui-tokens-color-neutral-100) border border-(--mui-tokens-color-neutral-300) font-bold font-mono px-2.5 py-1 rounded text-(--mui-palette-primary-main) text-sm">
                                        {activeGrade.code}
                                    </span>
                                    <span className="font-semibold text-(--mui-palette-text-primary) text-base">
                                        {activeGrade.label}
                                    </span>
                                </div>
                                <CommonBadgeState
                                    label={activeGrade.is_active
                                        ? 'Active'
                                        : 'Inactive'}
                                    variant={activeGrade.is_active
                                        ? 'active'
                                        : 'inactive'}
                                />
                            </div>

                            {activeGrade.description && (
                                <div className="bg-(--mui-tokens-color-neutral-50) border border-(--mui-tokens-color-neutral-200) p-3 rounded-md text-(--mui-palette-text-secondary) text-xs">
                                    {activeGrade.description}
                                </div>
                            )}

                            <div className="gap-3 grid grid-cols-2 pt-2">
                                <div className="border border-(--mui-tokens-color-neutral-200) flex flex-col gap-1 p-3 rounded-md">
                                    <span className="text-(--mui-palette-text-secondary) text-xs">Passing Mark Status</span>
                                    <div className="pt-1">
                                        <CommonBadgeStatus
                                            label={activeGrade.is_passing
                                                ? 'Passing Grade'
                                                : 'Non-Passing / Failed'}
                                            variant={activeGrade.is_passing
                                                ? 'success'
                                                : 'error'}
                                        />
                                    </div>
                                </div>

                                <div className="border border-(--mui-tokens-color-neutral-200) flex flex-col gap-1 p-3 rounded-md">
                                    <span className="text-(--mui-palette-text-secondary) text-xs">Min Absence % Trigger</span>
                                    <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                        {activeGrade.min_absence_percentage
                                            ? `${activeGrade.min_absence_percentage}%`
                                            : 'None / Not Applicable'}
                                    </span>
                                </div>

                                <div className="border border-(--mui-tokens-color-neutral-200) flex flex-col gap-1 p-3 rounded-md">
                                    <span className="text-(--mui-palette-text-secondary) text-xs">Completion Requirement</span>
                                    <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                        {activeGrade.requires_completion
                                            ? 'Yes (Requires Completion)'
                                            : 'No'}
                                    </span>
                                </div>

                                <div className="border border-(--mui-tokens-color-neutral-200) flex flex-col gap-1 p-3 rounded-md">
                                    <span className="text-(--mui-palette-text-secondary) text-xs">Completion Deadline</span>
                                    <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                        {activeGrade.completion_deadline_days
                                            ? `${activeGrade.completion_deadline_days} days`
                                            : 'No explicit deadline'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                    : null,
                open: isViewOpen,
                onClose: handleCloseView
            }}
            onCreate={function() {
                setIsCreateOpen(true);
            }}
            onDeleteRow={handleDelete}
            onFetch={fetchSpecialGrades}
        />
    );
}