import CommonButton from '@components/button/CommonButton';
import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import CommonInput from '@components/input/CommonInput';
import ValidCommonInput from '@components/input/ValidCommonInput';
import CommonActionModal from '@components/modal/CommonActionModal';
import ConfirmPromptModal from '@components/modal/ConfirmPromptModal';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import CommonTable from '@components/table/CommonTable';
import { MenuOption } from '@components/table/TableActionCell';
import EligibleSectionFilterBar from '@pages/registrar/enrollment-management/EligibleSectionFilterBar';
import { useEligibleSectionColumns } from '@pages/registrar/enrollment-management/useEligibleSectionColumns';
import { MagnifyingGlassIcon, XCircleIcon } from '@phosphor-icons/react';
import { bulkEnrollStudent, dropEnrollment, getEnrollmentStudentDetail, listEligibleSections } from '@services/enrollment.service';
import { CurrentLoadRow, EligibleSectionFilterValues, EligibleSectionRow, EnrollmentStudentDetail } from '@type/enrollment.type';
import { formErrors } from '@utils/form.util';
import { ColDef, SelectionChangedEvent } from 'ag-grid-community';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FieldErrors, useForm, useWatch } from 'react-hook-form';

interface EnrollmentOverrideValues {
    allow_conflict: boolean;
    override_prerequisites: boolean;
    conflict_reason: string;
}

interface EnrollmentWorkspaceModalProps {
    defaultTermId: string | null;
    open: boolean;
    studentId: string | null;
    termOptions: CommonSelectOption[];
    onClose: () => void;
    onEnrolled: () => void;
}

const defaultOverrideValues: EnrollmentOverrideValues = {
    allow_conflict: false,
    override_prerequisites: false,
    conflict_reason: ''
};

const defaultSectionFilters: EligibleSectionFilterValues = {
    scope: 'recommended',
    year_levels: [],
    include_full: true,
    include_prerequisite_gaps: true,
    include_conflicts: true
};

const CURRENT_LOAD_COLUMNS: ColDef<CurrentLoadRow>[] = [
    { field: 'course_code', flex: 1, headerName: 'Course', minWidth: 110 },
    { field: 'course_title', flex: 2, headerName: 'Title', minWidth: 160 },
    { field: 'section_code', flex: 1, headerName: 'Section', minWidth: 110 },
    { field: 'schedule_label', flex: 2, headerName: 'Schedule', minWidth: 180 },
    { field: 'faculty_name', flex: 1, headerName: 'Faculty', minWidth: 140 },
    {
        field: 'units',
        flex: 0,
        headerName: 'Units',
        maxWidth: 90,
        minWidth: 90,
        valueFormatter: (params) => Number(params.value)
            .toFixed(1)
    },
    { field: 'status', flex: 1, headerName: 'Status', minWidth: 110 }
];

export default function EnrollmentWorkspaceModal({
    defaultTermId,
    open,
    studentId,
    termOptions,
    onClose,
    onEnrolled
}: EnrollmentWorkspaceModalProps) {
    const [termId, setTermId] = useState<string | null>(defaultTermId);
    const [detail, setDetail] = useState<EnrollmentStudentDetail | null>(null);
    const [sections, setSections] = useState<EligibleSectionRow[]>([]);
    const [searchInput, setSearchInput] = useState('');
    const [activeSearch, setActiveSearch] = useState('');
    const [selectedSections, setSelectedSections] = useState<EligibleSectionRow[]>([]);
    const [pendingDropId, setPendingDropId] = useState<string | null>(null);
    const [recommendedCount, setRecommendedCount] = useState(0);
    const [recommendedAvailableCount, setRecommendedAvailableCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    const eligibleColumns = useEligibleSectionColumns();

    const overrideMethods = useForm<EnrollmentOverrideValues>({
        defaultValues: defaultOverrideValues,
        shouldUnregister: true
    });

    const filterMethods = useForm<EligibleSectionFilterValues>({
        defaultValues: defaultSectionFilters
    });

    const allowConflict = useWatch({ control: overrideMethods.control, name: 'allow_conflict' });
    const scope = useWatch({ control: filterMethods.control, name: 'scope' });
    const yearLevels = useWatch({ control: filterMethods.control, name: 'year_levels' });
    const includeFull = useWatch({ control: filterMethods.control, name: 'include_full' });
    const includePrerequisiteGaps = useWatch({
        control: filterMethods.control,
        name: 'include_prerequisite_gaps'
    });
    const includeConflicts = useWatch({ control: filterMethods.control, name: 'include_conflicts' });

    const sectionFilters = useMemo<EligibleSectionFilterValues>(function() {
        return {
            scope: scope ?? defaultSectionFilters.scope,
            year_levels: scope === 'all'
                ? yearLevels ?? []
                : [],
            include_full: Boolean(includeFull),
            include_prerequisite_gaps: Boolean(includePrerequisiteGaps),
            include_conflicts: Boolean(includeConflicts)
        };
    }, [scope, yearLevels, includeFull, includePrerequisiteGaps, includeConflicts]);

    const loadWorkspace = useCallback(async function() {
        if (!studentId) return;

        const detailResult = await getEnrollmentStudentDetail(studentId, termId);

        if (detailResult.data) {
            setDetail(detailResult.data);
        }

        const sectionsResult = await listEligibleSections(studentId, termId, activeSearch, sectionFilters);

        setSections(sectionsResult.data?.rows ?? []);
        setRecommendedCount(sectionsResult.data?.recommended_count ?? 0);
        setRecommendedAvailableCount(sectionsResult.data?.available_count ?? 0);
        setTotalCount(sectionsResult.data?.total_count ?? 0);
        setSelectedSections([]);
    }, [studentId, termId, activeSearch, sectionFilters]);

    useEffect(function() {
        if (open) {
            loadWorkspace();
        }
    }, [open, loadWorkspace]);

    useEffect(function() {
        if (open) {
            setTermId(defaultTermId);
            filterMethods.reset(defaultSectionFilters);
        }
    }, [open, defaultTermId, filterMethods]);

    const selectedUnits = useMemo(function() {
        return selectedSections.reduce((total, section) => total + Number(section.units), 0);
    }, [selectedSections]);

    const hasSelectedConflict = useMemo(function() {
        return selectedSections.some((section) => Boolean(section.conflict_with));
    }, [selectedSections]);

    const hasSelectedPrerequisiteGap = useMemo(function() {
        return selectedSections.some((section) => Boolean(section.unmet_prerequisites));
    }, [selectedSections]);

    function handleClose() {
        setDetail(null);
        setSections([]);
        setSelectedSections([]);
        setSearchInput('');
        setActiveSearch('');
        setRecommendedCount(0);
        setRecommendedAvailableCount(0);
        setTotalCount(0);
        overrideMethods.reset(defaultOverrideValues);
        filterMethods.reset(defaultSectionFilters);
        onClose();
    }

    function handleSelectionChanged(event: SelectionChangedEvent<EligibleSectionRow>) {
        setSelectedSections(event.api.getSelectedRows());
    }

    function handleSearchSubmit() {
        setActiveSearch(searchInput);
    }

    async function handleEnroll(values: EnrollmentOverrideValues) {
        if (!studentId || !selectedSections.length) return;

        const result = await bulkEnrollStudent({
            student_id: studentId,
            section_ids: selectedSections.map((section) => section.section_id),
            allow_conflict: Boolean(values.allow_conflict),
            conflict_reason: values.conflict_reason ?? '',
            override_prerequisites: Boolean(values.override_prerequisites)
        });

        if (result.data?.enrolled_count) {
            overrideMethods.reset(defaultOverrideValues);
            await loadWorkspace();
            onEnrolled();
        }
    }

    function handleEnrollError(errors: FieldErrors<EnrollmentOverrideValues>) {
        formErrors(errors, overrideMethods);
    }

    async function handleConfirmDrop() {
        if (!pendingDropId) return;

        const result = await dropEnrollment(pendingDropId, '');

        setPendingDropId(null);

        if (!result.error) {
            await loadWorkspace();
            onEnrolled();
        }
    }

    const currentLoadActionConfig = useMemo(function() {
        return {
            menuOptions: (row: CurrentLoadRow): MenuOption[] => [
                {
                    preset: 'delete' as const,
                    children: (
                        <div className="flex gap-2 items-center">
                            <XCircleIcon size={16} />
                            <span>Drop</span>
                        </div>
                    ),
                    onClick: () => setPendingDropId(row.enrollment_id)
                }
            ]
        };
    }, []);

    return (
        <>
            <CommonActionModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: 'Enroll the student into one or more sections for the selected term.',
                        title: 'Manage Student Enrollment'
                    }
                }}
                containerClassName="max-w-full w-[76rem]"
                formButtonsProps={{
                    cancelProps: {
                        children: 'Close',
                        onClick: handleClose
                    },
                    confirmProps: {
                        children: selectedSections.length
                            ? `Enroll ${selectedSections.length} Section(s) — ${selectedUnits.toFixed(1)} Units`
                            : 'Enroll Selected Sections',
                        disabled: !selectedSections.length,
                        onClick: overrideMethods.handleSubmit(handleEnroll, handleEnrollError)
                    }
                }}
                open={open}
                onClose={handleClose}
            >
                <div className="flex flex-col gap-5">
                    <div className="bg-(--mui-palette-action-hover) grid grid-cols-2 gap-3 p-4 rounded-lg md:grid-cols-4">
                        <div className="flex flex-col">
                            <span className="text-(--mui-palette-text-secondary) text-xs">Student Number</span>
                            <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                {detail?.student_number ?? '—'}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-(--mui-palette-text-secondary) text-xs">Name</span>
                            <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                {detail?.student_name ?? '—'}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-(--mui-palette-text-secondary) text-xs">Program</span>
                            <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                {detail?.program_name ?? '—'}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-(--mui-palette-text-secondary) text-xs">Year Level</span>
                            <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                {detail
                                    ? `Year ${detail.year_level}`
                                    : '—'}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <span className="font-medium text-(--mui-palette-text-primary) text-sm">Term</span>
                        <CommonSelect
                            className="max-w-100"
                            options={termOptions}
                            value={termId ?? ''}
                            onChange={function(event) {
                                setTermId(event.target.value);
                            }}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                            Current Load ({detail?.current_load.length ?? 0} subject(s))
                        </span>
                        <div className="h-[min(12rem,22vh)] min-h-32">
                            <CommonTable<CurrentLoadRow>
                                leadingColumnDefs={CURRENT_LOAD_COLUMNS}
                                rowData={detail?.current_load ?? []}
                                tableActionConfig={currentLoadActionConfig}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex gap-3 items-center justify-between">
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                {sectionFilters.scope === 'recommended'
                                    ? `Recommended Sections (${sections.length})`
                                    : `All Eligible Sections (${sections.length} of ${totalCount})`}
                            </span>
                            <div className="flex gap-2 items-center">
                                <CommonInput
                                    placeholder="Search course, title or section"
                                    size="small"
                                    value={searchInput}
                                    onChange={function(event) {
                                        setSearchInput(event.target.value);
                                    }}
                                    onKeyDown={function(event) {
                                        if (event.key === 'Enter') {
                                            handleSearchSubmit();
                                        }
                                    }}
                                />
                                <CommonButton
                                    size="small"
                                    startIcon={<MagnifyingGlassIcon size={16} />}
                                    variant="outlined"
                                    onClick={handleSearchSubmit}
                                >
                                    Search
                                </CommonButton>
                            </div>
                        </div>
                        <EligibleSectionFilterBar
                            control={filterMethods.control}
                            isScopeLocked={sectionFilters.scope === 'recommended'}
                        />
                        <p className="text-(--mui-palette-text-secondary) text-xs">
                            {sectionFilters.scope === 'recommended'
                                ? `Showing the courses prescribed by the curriculum for Year ${detail?.year_level ?? '—'} this term. Switch the scope to all curriculum courses when a recommended class is full or unavailable.`
                                : 'Showing every section whose course exists in the student\'s program curriculum, regardless of which program opened the section. Recommended courses stay at the top.'}
                        </p>
                        {sectionFilters.scope === 'recommended' && recommendedCount > 0 && recommendedAvailableCount === 0 && (
                            <p className="text-(--mui-palette-warning-main) text-xs">
                                Every recommended section for this student is already full — switch the scope to all
                                curriculum courses to pick an alternative.
                            </p>
                        )}
                        {sectionFilters.scope === 'recommended' && recommendedCount === 0 && totalCount > 0 && (
                            <p className="text-(--mui-palette-warning-main) text-xs">
                                No recommended sections are open for this term. {totalCount} other curriculum
                                section(s) are available under the all curriculum courses scope.
                            </p>
                        )}
                        <div className="h-[min(24rem,34vh)] min-h-48">
                            <CommonTable<EligibleSectionRow>
                                getRowId={(params) => params.data.section_id}
                                hasCheckbox
                                leadingColumnDefs={eligibleColumns}
                                rowData={sections}
                                onSelectionChanged={handleSelectionChanged}
                            />
                        </div>
                    </div>

                    {hasSelectedPrerequisiteGap && (
                        <ValidCommonCheckbox
                            control={overrideMethods.control}
                            hasHelper
                            label="Override unmet prerequisites for the selected sections"
                            name="override_prerequisites"
                            rules={{ required: 'Confirm the prerequisite override to continue' }}
                        />
                    )}

                    {hasSelectedConflict && (
                        <div className="flex flex-col gap-2">
                            <ValidCommonCheckbox
                                control={overrideMethods.control}
                                hasHelper
                                label="Authorize the overlapping schedules for the selected sections"
                                name="allow_conflict"
                                rules={{ required: 'Authorize the schedule conflict to continue' }}
                            />
                            {allowConflict && (
                                <ValidCommonInput
                                    control={overrideMethods.control}
                                    hasHelper
                                    name="conflict_reason"
                                    placeholder="Reason for authorizing the schedule conflict"
                                    rules={{ required: 'Please state why this conflict is authorized' }}
                                    size="small"
                                />
                            )}
                        </div>
                    )}
                </div>
            </CommonActionModal>
            <ConfirmPromptModal
                formButtonsProps={{
                    cancelProps: {
                        onClick: function() {
                            setPendingDropId(null);
                        }
                    },
                    confirmProps: {
                        children: 'Drop Subject',
                        onClick: handleConfirmDrop
                    }
                }}
                mainContent={{ children: 'Drop this subject?' }}
                open={Boolean(pendingDropId)}
                subContent={{ children: 'The student will be removed from the section and the slot will be released.' }}
                onClose={function() {
                    setPendingDropId(null);
                }}
            />
        </>
    );
}