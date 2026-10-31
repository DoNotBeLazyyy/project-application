import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonInput from '@components/input/CommonInput';
import CommonActionModal from '@components/modal/CommonActionModal';
import ConfirmPromptModal from '@components/modal/ConfirmPromptModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import { useObjectDraft } from '@hooks/useFormDraft';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import {
    ArrowsClockwiseIcon,
    BuildingsIcon,
    CertificateIcon,
    GraduationCapIcon,
    IdentificationCardIcon,
    MagnifyingGlassIcon,
    PencilSimpleIcon,
    PlusIcon,
    TrashIcon
} from '@phosphor-icons/react';
import { creditStudentCourse, getStudentCurriculumForCrediting, removeCreditedCourse } from '@services/records.service';
import { useToastStore } from '@stores/toast.store';
import { CreditedCourseRow, StudentCurriculumCreditingResponse } from '@type/records.type';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

interface CreditFormValues {
    previousSchool: string;
    previousCourseCode: string;
    previousCourseTitle: string;
    gradeDisplay: string;
    gradeNumeric: number | null;
    unitsCredited: number | null;
    remarks: string;
}

function isBlank(value: unknown): boolean {
    return !String(value ?? '')
        .trim();
}

function isEmptyNumber(value: unknown): boolean {
    return value === null || value === undefined || value === '';
}

const CREDIT_FORM_FIELDS: FormFieldConfig<CreditFormValues>[] = [
    {
        gridCols: 6,
        label: 'Previous School / University Name',
        name: 'previousSchool',
        placeholder: 'e.g. Polytechnic University of the Philippines',
        rules: {
            required: 'Previous school is required',
            validate: (value: unknown) => !isBlank(value) || 'Previous school cannot be empty or whitespace only'
        },
        type: 'text'
    },
    {
        gridCols: 3,
        label: 'Previous Course Code',
        name: 'previousCourseCode',
        placeholder: 'e.g. COMP 20013',
        type: 'text'
    },
    {
        gridCols: 3,
        label: 'Previous Course Title',
        name: 'previousCourseTitle',
        placeholder: 'e.g. Intro to Computing',
        type: 'text'
    },
    {
        gridCols: 2,
        label: 'Grade Obtained',
        name: 'gradeDisplay',
        placeholder: 'e.g. 1.75 or Passed',
        rules: {
            required: 'Grade obtained is required',
            validate: (value: unknown) => !isBlank(value) || 'Grade obtained cannot be empty or whitespace only'
        },
        type: 'text'
    },
    {
        fieldProps: { maxDecimals: 2 },
        gridCols: 2,
        label: 'Numeric Equivalent',
        name: 'gradeNumeric',
        placeholder: 'e.g. 1.75',
        rules: {
            validate: (value: unknown) => isEmptyNumber(value) || Number(value) >= 0 || 'Numeric equivalent cannot be negative'
        },
        type: 'number'
    },
    {
        fieldProps: { maxDecimals: 1 },
        gridCols: 2,
        label: 'Units to Credit',
        name: 'unitsCredited',
        placeholder: 'e.g. 3.0',
        rules: {
            validate: (value: unknown) => isEmptyNumber(value) || Number(value) > 0 || 'Units to credit must be greater than 0'
        },
        type: 'number'
    },
    {
        gridCols: 6,
        label: 'Registrar Audit Remarks',
        name: 'remarks',
        placeholder: 'e.g. Credited based on Official Transcript of Records (TOR) evaluation',
        type: 'text'
    }
];

export interface CreditTransfereeCoursesModalProps {
    open: boolean;
    onClose: VoidFunction;
    onSuccess?: VoidFunction;
    studentId?: string | null;
    studentName?: string | null;
    studentNumber?: string | null;
    programCode?: string | null;
    programName?: string | null;
    yearLevel?: number | null;
}

const YEAR_FILTER_OPTIONS: CommonSelectOption[] = [
    { label: 'All Year Levels', value: 'all' },
    { label: '1st Year', value: 1 },
    { label: '2nd Year', value: 2 },
    { label: '3rd Year', value: 3 },
    { label: '4th Year', value: 4 },
    { label: '5th Year', value: 5 },
    { label: '6th Year', value: 6 }
];

const STATUS_FILTER_OPTIONS: CommonSelectOption[] = [
    { label: 'All Courses', value: 'all' },
    { label: 'Credited Only', value: 'credited' },
    { label: 'Uncredited Only', value: 'uncredited' }
];

export default function CreditTransfereeCoursesModal({
    open,
    onClose,
    onSuccess,
    studentId,
    studentName,
    studentNumber,
    programCode,
    programName,
    yearLevel
}: CreditTransfereeCoursesModalProps) {
    const [data, setData] = useState<StudentCurriculumCreditingResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedYearFilter, setSelectedYearFilter] = useState<string | number>('all');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

    // Sub-modal for crediting/editing a specific course
    const [activeCourse, setActiveCourse] = useState<CreditedCourseRow | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDiscardFormOpen, setIsDiscardFormOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Remember last used school name for rapid sequential entry
    const [rememberedSchool, setRememberedSchool] = useState('');

    function toCreditFormValues(course: CreditedCourseRow | null): CreditFormValues {
        return {
            previousSchool: course?.previous_school || rememberedSchool || '',
            previousCourseCode: course?.previous_course_code || '',
            previousCourseTitle: course?.previous_course_title || '',
            gradeDisplay: course?.grade_display || 'Passed',
            gradeNumeric: course?.grade_numeric ?? null,
            unitsCredited: course?.units_credited ?? course?.units ?? 3.0,
            remarks: course?.remarks || 'Credited per TOR evaluation'
        };
    }

    const defaultCreditFormValues = useMemo(() => toCreditFormValues(activeCourse), [activeCourse, rememberedSchool]);

    const creditForm = useForm<CreditFormValues>({ defaultValues: defaultCreditFormValues });
    const watchedCreditValues = useWatch({ control: creditForm.control });

    const currentCreditFormValues = useMemo<CreditFormValues>(() => ({
        previousSchool: watchedCreditValues.previousSchool ?? '',
        previousCourseCode: watchedCreditValues.previousCourseCode ?? '',
        previousCourseTitle: watchedCreditValues.previousCourseTitle ?? '',
        gradeDisplay: watchedCreditValues.gradeDisplay ?? '',
        gradeNumeric: watchedCreditValues.gradeNumeric ?? null,
        unitsCredited: watchedCreditValues.unitsCredited ?? null,
        remarks: watchedCreditValues.remarks ?? ''
    }), [watchedCreditValues]);

    const creditDraftGuard = useObjectDraft({
        formId: activeCourse?.course_id
            ? `credit-transferee-course-${studentId ?? 'student'}-${activeCourse.course_id}`
            : `credit-transferee-course-${studentId ?? 'student'}`,
        values: currentCreditFormValues,
        defaultValues: defaultCreditFormValues,
        onRestore: (restored) => {
            creditForm.reset({
                previousSchool: restored.previousSchool ?? '',
                previousCourseCode: restored.previousCourseCode ?? '',
                previousCourseTitle: restored.previousCourseTitle ?? '',
                gradeDisplay: restored.gradeDisplay ?? 'Passed',
                gradeNumeric: restored.gradeNumeric ?? null,
                unitsCredited: restored.unitsCredited ?? 3.0,
                remarks: restored.remarks ?? ''
            }, { keepDefaultValues: true });
        },
        enabled: isFormOpen && Boolean(activeCourse)
    });

    // Revocation prompt state
    const [courseToRevoke, setCourseToRevoke] = useState<CreditedCourseRow | null>(null);
    const [isRevoking, setIsRevoking] = useState(false);

    async function loadCurriculum() {
        if (!studentId) return;
        setIsLoading(true);
        const res = await getStudentCurriculumForCrediting(studentId);
        setIsLoading(false);
        if (res.data) {
            setData(res.data);
        }
        else if (res.error) {
            useToastStore.getState()
                .showToast(res.error.message || 'Failed to load curriculum', 'error');
        }
    }

    useEffect(() => {
        if (open && studentId) {
            loadCurriculum();
        }
        else {
            setData(null);
            setSearchQuery('');
            setSelectedYearFilter('all');
            setSelectedStatusFilter('all');
            setActiveCourse(null);
            setIsFormOpen(false);
            setIsDiscardFormOpen(false);
        }
    }, [open, studentId]);

    function handleOpenCreditForm(course: CreditedCourseRow) {
        setActiveCourse(course);
        creditForm.reset(toCreditFormValues(course));
        setIsFormOpen(true);
    }

    function handleCloseCreditForm() {
        creditDraftGuard.clearDraft();
        setIsDiscardFormOpen(false);
        setIsFormOpen(false);
        setActiveCourse(null);
    }

    function handleRequestCloseCreditForm() {
        if (creditDraftGuard.hasRealChanges) {
            setIsDiscardFormOpen(true);
            return;
        }
        handleCloseCreditForm();
    }

    function handleSaveCredit() {
        creditForm.handleSubmit(saveCredit)();
    }

    async function saveCredit(values: CreditFormValues) {
        if (!studentId || !activeCourse) return;

        setIsSaving(true);
        const parsedNumeric = isEmptyNumber(values.gradeNumeric)
            ? null
            : Number(values.gradeNumeric);
        const parsedUnits = isEmptyNumber(values.unitsCredited)
            ? activeCourse.units
            : Number(values.unitsCredited);

        const res = await creditStudentCourse({
            student_id: studentId,
            course_id: activeCourse.course_id,
            previous_school: values.previousSchool.trim(),
            previous_course_code: values.previousCourseCode.trim() || undefined,
            previous_course_title: values.previousCourseTitle.trim() || undefined,
            grade_display: values.gradeDisplay.trim() || 'Passed',
            grade_numeric: parsedNumeric !== null && !isNaN(parsedNumeric)
                ? parsedNumeric
                : null,
            units_credited: parsedUnits && !isNaN(parsedUnits)
                ? parsedUnits
                : activeCourse.units,
            remarks: values.remarks.trim() || undefined
        });

        setIsSaving(false);

        if (res.data?.success) {
            useToastStore.getState()
                .showToast(res.data.message || 'Course credited successfully!', 'success');
            setRememberedSchool(values.previousSchool.trim());
            handleCloseCreditForm();
            loadCurriculum();
            onSuccess?.();
        }
        else {
            useToastStore.getState()
                .showToast(res.error?.message || res.data?.message || 'Failed to credit course.', 'error');
        }
    }

    async function handleConfirmRevoke() {
        if (!courseToRevoke?.credited_id) return;

        setIsRevoking(true);
        const res = await removeCreditedCourse(courseToRevoke.credited_id, 'Revoked by Registrar');
        setIsRevoking(false);

        if (res.data?.success) {
            useToastStore.getState()
                .showToast(res.data.message || 'Course credit revoked.', 'success');
            setCourseToRevoke(null);
            loadCurriculum();
            onSuccess?.();
        }
        else {
            useToastStore.getState()
                .showToast(res.error?.message || 'Failed to revoke course credit.', 'error');
        }
    }

    const filteredCourses = useMemo(() => {
        if (!data?.courses) return [];

        return data.courses.filter((c) => {
            if (selectedYearFilter !== 'all' && c.year_level !== Number(selectedYearFilter)) {
                return false;
            }

            if (selectedStatusFilter === 'credited' && !c.is_credited) {
                return false;
            }
            if (selectedStatusFilter === 'uncredited' && c.is_credited) {
                return false;
            }

            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const codeMatch = c.course_code.toLowerCase()
                    .includes(query);
                const titleMatch = c.course_title.toLowerCase()
                    .includes(query);
                const schoolMatch = c.previous_school?.toLowerCase()
                    .includes(query) ?? false;
                const prevCodeMatch = c.previous_course_code?.toLowerCase()
                    .includes(query) ?? false;
                if (!codeMatch && !titleMatch && !schoolMatch && !prevCodeMatch) {
                    return false;
                }
            }

            return true;
        });
    }, [data, selectedYearFilter, selectedStatusFilter, searchQuery]);

    const activeStudentName = data?.student.full_name || studentName || 'Student';
    const activeStudentNumber = data?.student.student_number || studentNumber || '—';
    const activeProgram = data?.student.program_code || programCode || '—';
    const activeYearLevel = data?.student.year_level || yearLevel || 1;

    return (
        <>
            <CommonActionModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: 'Audit, equate, and credit subjects taken from previous institutions for transferee scholars.',
                        title: 'Transferee Course Crediting & Subject Equivalence'
                    }
                }}
                containerClassName="max-w-5xl w-full"
                formButtonsProps={{
                    cancelProps: {
                        children: 'Close',
                        onClick: onClose
                    }
                }}
                hideCancel={false}
                open={open}
                onClose={onClose}
            >
                <div className="flex flex-col gap-4">
                    {/* Student Info & Stats Banner */}
                    <div className="bg-(--mui-palette-action-hover)/40 border border-(--mui-palette-divider) flex flex-wrap gap-4 items-center justify-between p-3.5 rounded-xl">
                        <div className="flex flex-wrap gap-4 sm:gap-6 items-center">
                            <div className="flex items-center gap-2.5">
                                <IdentificationCardIcon
                                    className="text-(--mui-palette-primary-main) shrink-0"
                                    size={24}
                                    weight="bold"
                                />
                                <div className="flex flex-col">
                                    <span className="text-[11px] text-(--mui-palette-text-secondary) font-medium">Student Scholar</span>
                                    <span className="font-bold text-(--mui-palette-text-primary) text-sm">
                                        {activeStudentName}
                                    </span>
                                    <span className="font-mono text-xs text-(--mui-palette-text-secondary)">
                                        {activeStudentNumber}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 sm:pl-4 sm:border-l sm:border-(--mui-palette-divider)">
                                <GraduationCapIcon
                                    className="text-(--mui-palette-info-main) shrink-0"
                                    size={24}
                                    weight="bold"
                                />
                                <div className="flex flex-col">
                                    <span className="text-[11px] text-(--mui-palette-text-secondary) font-medium">Program &amp; Standing</span>
                                    <span className="font-semibold text-(--mui-palette-text-primary) text-xs">
                                        {data?.student.program_name ?? programName ?? activeProgram}
                                    </span>
                                    <span className="text-xs text-(--mui-palette-text-secondary)">
                                        Year Level {activeYearLevel}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Summary Metrics */}
                        <div className="flex items-center gap-3">
                            <div className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) px-3 py-1.5 rounded-lg flex flex-col items-end">
                                <span className="text-[10px] text-(--mui-palette-text-secondary) uppercase tracking-wider font-semibold">
                                    Credited Units
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-base font-bold text-(--mui-palette-success-main)">
                                        {data?.summary.credited_units.toFixed(1) ?? '0.0'}
                                    </span>
                                    <span className="text-[11px] text-(--mui-palette-text-secondary)">
                                        / {data?.summary.total_curriculum_units.toFixed(1) ?? '0.0'}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) px-3 py-1.5 rounded-lg flex flex-col items-end">
                                <span className="text-[10px] text-(--mui-palette-text-secondary) uppercase tracking-wider font-semibold">
                                    Credited Subjects
                                </span>
                                <span className="text-base font-bold text-(--mui-palette-primary-main)">
                                    {data?.summary.credited_count ?? 0}
                                </span>
                            </div>

                            <Tooltip title="Refresh curriculum">
                                <button
                                    className="p-2 rounded-lg border border-(--mui-palette-divider) text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary) hover:bg-(--mui-palette-action-hover) cursor-pointer"
                                    type="button"
                                    onClick={loadCurriculum}
                                >
                                    <ArrowsClockwiseIcon
                                        className={isLoading
                                            ? 'animate-spin'
                                            : ''}
                                        size={18}
                                    />
                                </button>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) p-3 rounded-lg">
                        <div className="flex-1 min-w-[240px]">
                            <CommonInput
                                fullWidth
                                placeholder="Search by course code, title, or previous school..."
                                size="small"
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <MagnifyingGlassIcon
                                                    className="text-(--mui-palette-text-secondary)"
                                                    size={18}
                                                />
                                            </InputAdornment>
                                        )
                                    }
                                }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="w-40">
                                <CommonSelect
                                    fullWidth
                                    options={YEAR_FILTER_OPTIONS}
                                    size="small"
                                    value={selectedYearFilter}
                                    onChange={(e) => setSelectedYearFilter(e.target.value)}
                                />
                            </div>

                            <div className="w-40">
                                <CommonSelect
                                    fullWidth
                                    options={STATUS_FILTER_OPTIONS}
                                    size="small"
                                    value={selectedStatusFilter}
                                    onChange={(e) => setSelectedStatusFilter(e.target.value as string)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Curriculum Courses List */}
                    <div className="border border-(--mui-palette-divider) rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
                        {isLoading
                            ? (
                                <div className="flex flex-col items-center justify-center p-12 gap-2 text-(--mui-palette-text-secondary)">
                                    <ArrowsClockwiseIcon
                                        className="animate-spin text-(--mui-palette-primary-main)"
                                        size={28}
                                    />
                                    <span className="text-sm">Loading student curriculum checklist...</span>
                                </div>
                            )
                            : filteredCourses.length === 0
                                ? (
                                    <div className="flex flex-col items-center justify-center p-12 gap-2 text-(--mui-palette-text-secondary)">
                                        <CertificateIcon
                                            className="text-(--mui-palette-text-disabled)"
                                            size={36}
                                        />
                                        <span className="text-sm font-medium">No matching courses found</span>
                                        <span className="text-xs">Try adjusting your search terms or year level filter.</span>
                                    </div>
                                )
                                : (
                                    <table className="min-w-full text-left text-xs divide-y divide-(--mui-palette-divider)">
                                        <thead className="bg-(--mui-palette-action-hover) text-(--mui-palette-text-secondary) sticky top-0 z-10 font-semibold uppercase text-[11px]">
                                            <tr>
                                                <th className="px-3.5 py-2.5">Year &amp; Term</th>
                                                <th className="px-3.5 py-2.5">Curriculum Course</th>
                                                <th className="px-3.5 py-2.5 text-center">Units</th>
                                                <th className="px-3.5 py-2.5">Crediting Status &amp; Prior Institution Details</th>
                                                <th className="px-3.5 py-2.5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-(--mui-palette-divider) bg-(--mui-palette-background-paper)">
                                            {filteredCourses.map((c) => (
                                                <tr
                                                    className={`hover:bg-(--mui-palette-action-hover)/50 transition-colors ${
                                                        c.is_credited
                                                            ? 'bg-(--mui-palette-success-main)/5'
                                                            : ''
                                                    }`}
                                                    key={c.curriculum_map_id}
                                                >
                                                    <td className="px-3.5 py-3 whitespace-nowrap text-(--mui-palette-text-secondary)">
                                                        <div className="font-semibold text-(--mui-palette-text-primary)">
                                                    Year {c.year_level}
                                                        </div>
                                                        <div className="text-[11px] text-(--mui-palette-text-secondary)">
                                                            {c.term_label}
                                                        </div>
                                                    </td>

                                                    <td className="px-3.5 py-3 max-w-[260px]">
                                                        <div className="flex items-center gap-1.5 font-bold text-sm text-(--mui-palette-text-primary)">
                                                            <span>{c.course_code}</span>
                                                            {c.is_elective && (
                                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-(--mui-palette-action-hover) text-(--mui-palette-text-secondary) font-normal">
                                                            Elective
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div
                                                            className="text-xs text-(--mui-palette-text-secondary) truncate"
                                                            title={c.course_title}
                                                        >
                                                            {c.course_title}
                                                        </div>
                                                    </td>

                                                    <td className="px-3.5 py-3 text-center whitespace-nowrap">
                                                        <span className="font-mono font-semibold text-(--mui-palette-text-primary)">
                                                            {c.units.toFixed(1)}
                                                        </span>
                                                    </td>

                                                    <td className="px-3.5 py-3">
                                                        {c.is_credited
                                                            ? (
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <CommonBadgeStatus
                                                                            label="Credited"
                                                                            variant="success"
                                                                        />
                                                                        <span className="font-semibold text-(--mui-palette-text-primary) text-xs">
                                                                Grade: {c.grade_display || 'Passed'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-[11px] text-(--mui-palette-text-secondary)">
                                                                        <BuildingsIcon
                                                                            className="shrink-0 text-(--mui-palette-primary-main)"
                                                                            size={14}
                                                                        />
                                                                        <span className="font-medium text-(--mui-palette-text-primary)">
                                                                            {c.previous_school}
                                                                        </span>
                                                                    </div>
                                                                    {(c.previous_course_code || c.previous_course_title) && (
                                                                        <div className="text-[11px] text-(--mui-palette-text-secondary)">
                                                                Equated: {c.previous_course_code
                                                                                ? `${c.previous_course_code} · `
                                                                                : ''}
                                                                            {c.previous_course_title}
                                                                        </div>
                                                                    )}
                                                                    {c.remarks && (
                                                                        <div className="text-[10px] italic text-(--mui-palette-text-disabled)">
                                                                &ldquo;{c.remarks}&rdquo;
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                            : c.is_passed_locally
                                                                ? (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <CommonBadgeStatus
                                                                            label="Passed (Regular)"
                                                                            variant="info"
                                                                        />
                                                                        <span className="text-[11px] text-(--mui-palette-text-secondary)">
                                                            Completed at AU-JAS
                                                                        </span>
                                                                    </div>
                                                                )
                                                                : (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <CommonBadgeStatus
                                                                            label="Not Taken"
                                                                            variant="info"
                                                                        />
                                                                        <span className="text-[11px] text-(--mui-palette-text-secondary)">
                                                            Pending enrollment / transfer credit
                                                                        </span>
                                                                    </div>
                                                                )}
                                                    </td>

                                                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                                                        {c.is_credited
                                                            ? (
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <Tooltip title="Edit credit details">
                                                                        <button
                                                                            className="p-1.5 rounded-lg border border-(--mui-palette-divider) text-(--mui-palette-text-secondary) hover:text-(--mui-palette-primary-main) hover:bg-(--mui-palette-action-hover) cursor-pointer"
                                                                            type="button"
                                                                            onClick={() => handleOpenCreditForm(c)}
                                                                        >
                                                                            <PencilSimpleIcon size={16} />
                                                                        </button>
                                                                    </Tooltip>
                                                                    <Tooltip title="Revoke credited subject">
                                                                        <button
                                                                            className="p-1.5 rounded-lg border border-(--mui-palette-divider) text-red-500 hover:text-red-700 hover:bg-red-500/10 cursor-pointer"
                                                                            type="button"
                                                                            onClick={() => setCourseToRevoke(c)}
                                                                        >
                                                                            <TrashIcon size={16} />
                                                                        </button>
                                                                    </Tooltip>
                                                                </div>
                                                            )
                                                            : !c.is_passed_locally
                                                                ? (
                                                                    <CommonButton
                                                                        color="primary"
                                                                        size="small"
                                                                        startIcon={(
                                                                            <PlusIcon
                                                                                size={14}
                                                                                weight="bold"
                                                                            />
                                                                        )}
                                                                        variant="outlined"
                                                                        onClick={() => handleOpenCreditForm(c)}
                                                                    >
                                                        Credit Course
                                                                    </CommonButton>
                                                                )
                                                                : null}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                    </div>
                </div>
            </CommonActionModal>

            {/* Sub-Modal: Add/Edit Credit for a Specific Course */}
            {isFormOpen && activeCourse && (
                <CommonActionModal
                    cardProps={{
                        cardHeaderProps: {
                            subheader: `AU-JAS Curriculum Subject: ${activeCourse.course_code} — ${activeCourse.course_title}`,
                            title: activeCourse.is_credited
                                ? `Edit Credited Subject: ${activeCourse.course_code}`
                                : `Credit Transferee Subject: ${activeCourse.course_code}`
                        }
                    }}
                    containerClassName="max-w-lg w-full"
                    formButtonsProps={{
                        cancelProps: {
                            children: 'Cancel',
                            onClick: handleRequestCloseCreditForm
                        },
                        confirmProps: {
                            children: isSaving
                                ? 'Saving Credit...'
                                : (activeCourse.is_credited
                                    ? 'Update Credit'
                                    : 'Confirm & Credit Course'),
                            disabled: isSaving || (Boolean(activeCourse?.is_credited) && !creditDraftGuard.hasRealChanges),
                            loading: isSaving,
                            onClick: handleSaveCredit
                        }
                    }}
                    open={isFormOpen}
                    onClose={handleRequestCloseCreditForm}
                >
                    <div className="flex flex-col gap-3.5 py-1">
                        {/* Course Target Overview */}
                        <div className="bg-(--mui-palette-action-hover)/50 p-3 rounded-lg border border-(--mui-palette-divider)">
                            <div className="text-xs text-(--mui-palette-text-secondary) font-medium">AU-JAS Curriculum Subject:</div>
                            <div className="font-bold text-sm text-(--mui-palette-text-primary)">
                                {activeCourse.course_code} — {activeCourse.course_title}
                            </div>
                            <div className="text-xs text-(--mui-palette-text-secondary) mt-0.5">
                                Year {activeCourse.year_level} · {activeCourse.term_label} · {activeCourse.units.toFixed(1)} Units
                            </div>
                        </div>

                        <CommonForm
                            component="div"
                            containerClassName="grid grid-cols-1 md:grid-cols-6 gap-3"
                            control={creditForm.control}
                            enableDraftRecovery={false}
                            fields={CREDIT_FORM_FIELDS}
                        />
                    </div>
                </CommonActionModal>
            )}

            {/* Revoke Confirmation Prompt */}
            {courseToRevoke && (
                <ConfirmPromptModal
                    formButtonsProps={{
                        cancelProps: {
                            children: 'Keep Credit',
                            onClick: () => setCourseToRevoke(null)
                        },
                        confirmProps: {
                            children: isRevoking
                                ? 'Revoking...'
                                : 'Yes, Revoke Credit',
                            color: 'error',
                            disabled: isRevoking,
                            loading: isRevoking,
                            onClick: handleConfirmRevoke
                        }
                    }}
                    mainContent={{
                        title: `Revoke credit for ${courseToRevoke.course_code}?`
                    }}
                    open={Boolean(courseToRevoke)}
                    subContent={{
                        title: `Are you sure you want to revoke the transfer credit for ${courseToRevoke.course_code} (${courseToRevoke.course_title})? The subject will return to uncompleted status and prerequisite checks will be re-applied.`
                    }}
                    onClose={() => setCourseToRevoke(null)}
                />
            )}

            <DiscardChangesPromptModal
                open={isDiscardFormOpen}
                onContinueEditing={() => setIsDiscardFormOpen(false)}
                onDiscard={handleCloseCreditForm}
            />

            <DraftRecoveryPromptModal
                open={creditDraftGuard.isPromptOpen}
                onContinue={creditDraftGuard.handleContinue}
                onDiscard={creditDraftGuard.handleDiscard}
            />
        </>
    );
}