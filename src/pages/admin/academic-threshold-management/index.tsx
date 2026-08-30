import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import AcademicThresholdFilterForm from '@pages/admin/academic-threshold-management/AcademicThresholdFilterForm';
import AcademicThresholdForm from '@pages/admin/academic-threshold-management/AcademicThresholdForm';
import AcademicThresholdGridCard from '@pages/admin/academic-threshold-management/AcademicThresholdGridCard';
import { useAcademicThresholdTableConfig } from '@pages/admin/academic-threshold-management/useAcademicThresholdTableConfig';
import { getAcademicThresholds, updateAcademicThresholds } from '@services/academic-threshold.service';
import { useToastStore } from '@stores/toast.store';
import {
    AcademicThreshold,
    AcademicThresholdFilterValues,
    AcademicThresholdFormValues
} from '@type/academic-threshold.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import { formErrors } from '@utils/form.util';
import { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const FILTER_FORM_ID = 'filter-academic-threshold-form';
const UPDATE_FORM_ID = 'update-academic-threshold-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'category', label: 'Category' },
    { field: 'label', label: 'Threshold' },
    { field: 'max_gwa', label: 'Maximum GWA' }
];

const DEFAULT_FILTER_VALUES: AcademicThresholdFilterValues = {
    category: 'All',
    is_active: 'All'
};

const DEFAULT_FORM_VALUES: AcademicThresholdFormValues = {
    is_active: true,
    max_gwa: '',
    min_gwa: '',
    requires_no_failing: false,
    scholarship_discount_pct: ''
};

/** The RPC takes every numeric field as a string, with an empty one standing for NULL. */
function toNumericPayload(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    return String(value);
}

/**
 * The thresholds RPC returns the whole seeded ladder in one call - there are
 * only a dozen or so rows - so search, filter, sort and paging are applied
 * client side, the same way the special grade rules list does it.
 */
function buildThresholdListDto(
    rows: AcademicThreshold[],
    page: number,
    size: number,
    search?: string,
    filters?: AcademicThresholdFilterValues | null,
    sortCol?: string,
    sortDir?: string
): CommonListResDto<AcademicThreshold> {
    let filtered = [...rows];

    if (search && search.trim()) {
        const query = search.toLowerCase()
            .trim();
        filtered = filtered.filter((row) =>
            row.code.toLowerCase()
                .includes(query)
            || row.label.toLowerCase()
                .includes(query)
            || row.category.toLowerCase()
                .includes(query));
    }

    if (filters) {
        if (filters.category && filters.category !== 'All') {
            filtered = filtered.filter((row) => row.category === filters.category);
        }
        if (filters.is_active && filters.is_active !== 'All') {
            const activeVal = filters.is_active === 'Active';
            filtered = filtered.filter((row) => row.is_active === activeVal);
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

export default function AcademicThresholdManagement() {
    const [thresholds, setThresholds] = useState<AcademicThreshold[]>([]);
    const [activeFilters, setActiveFilters] = useState<AcademicThresholdFilterValues | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const filterMethods = useForm<AcademicThresholdFilterValues>({
        defaultValues: DEFAULT_FILTER_VALUES
    });

    const updateMethods = useForm<AcademicThresholdFormValues>({
        defaultValues: DEFAULT_FORM_VALUES
    });

    const activeThreshold = thresholds.find((t) => t.id === selectedId);

    function refreshList() {
        setActiveFilters(function(prev) {
            return { ...DEFAULT_FILTER_VALUES, ...prev };
        });
    }

    function loadIntoForm(id: string) {
        const threshold = thresholds.find((t) => t.id === id);

        if (threshold) {
            updateMethods.reset({
                is_active: threshold.is_active,
                max_gwa: String(threshold.max_gwa),
                min_gwa: threshold.min_gwa === null
                    ? ''
                    : String(threshold.min_gwa),
                requires_no_failing: threshold.requires_no_failing,
                scholarship_discount_pct: threshold.scholarship_discount_pct === null
                    ? ''
                    : String(threshold.scholarship_discount_pct)
            });
        }
    }

    function handleOpenView(id: string) {
        setSelectedId(id);
        loadIntoForm(id);
        setIsViewOpen(true);
    }

    function handleCloseView() {
        setIsViewOpen(false);
        setSelectedId(null);
        updateMethods.reset(DEFAULT_FORM_VALUES);
    }

    function handleOpenUpdate(id: string) {
        setSelectedId(id);
        loadIntoForm(id);
        setIsUpdateOpen(true);
    }

    function handleCloseUpdate() {
        setIsUpdateOpen(false);
        setSelectedId(null);
        updateMethods.reset(DEFAULT_FORM_VALUES);
    }

    function handleSwitchToEdit(id: string) {
        handleCloseView();
        handleOpenUpdate(id);
    }

    async function handleUpdateSubmit(values: AcademicThresholdFormValues) {
        const target = thresholds.find((t) => t.id === selectedId);

        if (!target) {
            return;
        }

        // Fields a category does not expose are carried over untouched rather
        // than submitted blank - the RPC overwrites every column it is given.
        const result = await updateAcademicThresholds([{
            id: target.id,
            is_active: values.is_active,
            max_gwa: toNumericPayload(values.max_gwa),
            min_gwa: toNumericPayload(values.min_gwa),
            requires_no_failing: target.category === 'Standing'
                ? target.requires_no_failing
                : values.requires_no_failing,
            scholarship_discount_pct: target.category === 'Scholarship'
                ? toNumericPayload(values.scholarship_discount_pct)
                : toNumericPayload(target.scholarship_discount_pct)
        }]);

        if (!result.error) {
            useToastStore.getState()
                .showToast('Academic threshold updated successfully.', 'success');
            handleCloseUpdate();
            refreshList();
        }
    }

    function handleFilterApply(values: AcademicThresholdFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    function handleFilterReset() {
        filterMethods.reset(DEFAULT_FILTER_VALUES);
        setActiveFilters(null);
        setIsFilterOpen(false);
    }

    async function fetchThresholds(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ): Promise<ServiceResult<CommonListResDto<AcademicThreshold>>> {
        const result = await getAcademicThresholds();

        if (!result.data) {
            return { data: null, error: result.error };
        }

        setThresholds(result.data);

        const activeSort = sort.length > 0
            ? sort[0]
            : undefined;

        const dto = buildThresholdListDto(
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

    const { columnDefs, tableActionConfig } = useAcademicThresholdTableConfig({
        onEdit: handleOpenUpdate,
        onView: handleOpenView
    });

    return (
        <CommonTableCard<AcademicThreshold>
            cardHeaderProps={{
                subheader: 'Configure the honor, scholarship, and standing cutoffs used across grade computation and learning analytics.',
                title: 'Academic Thresholds'
            }}
            controls={{
                tableInputProps: {
                    searchHints: SEARCH_HINTS.academicThresholds
                }
            }}
            dependencies={[activeFilters]}
            filterModalProps={{
                cardProps: {
                    cardHeaderProps: {
                        subheader: 'Filter thresholds by category and status.',
                        title: 'Filter Academic Thresholds'
                    }
                },
                confirmText: 'Apply Filters',
                formContent: (
                    <AcademicThresholdFilterForm
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
            renderGridCard={function(item, isSelected, onToggleSelect) {
                return (
                    <AcademicThresholdGridCard
                        isSelected={isSelected}
                        row={item}
                        onEdit={handleOpenUpdate}
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
            uniqueIdKey="id"
            updateModalProps={{
                cardProps: {
                    cardHeaderProps: {
                        subheader: activeThreshold
                            ? `Update the cutoff for ${activeThreshold.label}.`
                            : 'Update the cutoff for this threshold.',
                        title: 'Edit Academic Threshold'
                    }
                },
                confirmText: 'Save Changes',
                formContent: activeThreshold
                    ? (
                        <AcademicThresholdForm
                            category={activeThreshold.category}
                            control={updateMethods.control}
                            id={UPDATE_FORM_ID}
                            onSubmit={updateMethods.handleSubmit(
                                handleUpdateSubmit,
                                (errs: FieldErrors<AcademicThresholdFormValues>) => formErrors(errs, updateMethods)
                            )}
                        />
                    )
                    : null,
                formId: UPDATE_FORM_ID,
                isDirty: updateMethods.formState.isDirty,
                open: isUpdateOpen,
                onClose: handleCloseUpdate
            }}
            viewModalProps={{
                cardProps: {
                    cardHeaderProps: {
                        subheader: activeThreshold
                            ? `Viewing the cutoff for ${activeThreshold.label}.`
                            : 'Viewing the cutoff for this threshold.',
                        title: 'View Academic Threshold'
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
                formContent: activeThreshold
                    ? (
                        <AcademicThresholdForm
                            category={activeThreshold.category}
                            control={updateMethods.control}
                            disabled
                        />
                    )
                    : null,
                open: isViewOpen,
                onClose: handleCloseView
            }}
            onFetch={fetchThresholds}
        />
    );
}