import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
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
    CheckCircleIcon,
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

export interface CreditTransfereeCoursesModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
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

    // Form fields
    const [previousSchool, setPreviousSchool] = useState('');
    const [previousCourseCode, setPreviousCourseCode] = useState('');
    const [previousCourseTitle, setPreviousCourseTitle] = useState('');
    const [gradeDisplay, setGradeDisplay] = useState('1.75');
    const [gradeNumeric, setGradeNumeric] = useState<string>('1.75');
    const [unitsCredited, setUnitsCredited] = useState<string>('3.0');
    const [remarks, setRemarks] = useState('');

    // Remember last used school name for rapid sequential entry
    const [rememberedSchool, setRememberedSchool] = useState('');

    const defaultCreditFormValues = useMemo(() => ({
        previousSchool: activeCourse?.previous_school || rememberedSchool || '',
        previousCourseCode: activeCourse?.previous_course_code || '',
        previousCourseTitle: activeCourse?.previous_course_title || '',
        gradeDisplay: activeCourse?.grade_display || 'Passed',
        gradeNumeric: activeCourse?.grade_numeric ? String(activeCourse.grade_numeric) : '',
        unitsCredited: String(activeCourse?.units_credited ?? activeCourse?.units ?? 3.0),
        remarks: activeCourse?.remarks || 'Credited per TOR evaluation'
    }), [activeCourse, rememberedSchool]);

    const currentCreditFormValues = useMemo(() => ({
        previousSchool,
        previousCourseCode,
        previousCourseTitle,
        gradeDisplay,
        gradeNumeric,
        unitsCredited,
        remarks
    }), [
        previousSchool,
        previousCourseCode,
        previousCourseTitle,
        gradeDisplay,
        gradeNumeric,
        unitsCredited,
        remarks
    ]);

    const creditDraftGuard = useObjectDraft({
        formId: activeCourse?.course_id
            ? `credit-transferee-course-${studentId ?? 'student'}-${activeCourse.course_id}`
            : `credit-transferee-course-${studentId ?? 'student'}`,
        values: currentCreditFormValues,
        defaultValues: defaultCreditFormValues,
        onRestore: (restored) => {
            setPreviousSchool(restored.previousSchool ?? '');
            setPreviousCourseCode(restored.previousCourseCode ?? '');
            setPreviousCourseTitle(restored.previousCourseTitle ?? '');
            setGradeDisplay(restored.gradeDisplay ?? 'Passed');
            setGradeNumeric(restored.gradeNumeric ?? '');
            setUnitsCredited(restored.unitsCredited ?? '3.0');
            setRemarks(restored.remarks ?? '');
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
        } else if (res.error) {
            useToastStore.getState().showToast(res.error.message || 'Failed to load curriculum', 'error');
        }
    }

    useEffect(() => {
        if (open && studentId) {
            loadCurriculum();
        } else {
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
        setPreviousSchool(course.previous_school || rememberedSchool || '');
        setPreviousCourseCode(course.previous_course_code || '');
        setPreviousCourseTitle(course.previous_course_title || '');
        setGradeDisplay(course.grade_display || 'Passed');
        setGradeNumeric(course.grade_numeric ? String(course.grade_numeric) : '');
        setUnitsCredited(String(course.units_credited ?? course.units ?? 3.0));
        setRemarks(course.remarks || 'Credited per TOR evaluation');
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

    async function handleSaveCredit() {
        if (!studentId || !activeCourse) return;

        if (!previousSchool.trim()) {
            useToastStore.getState().showToast('Please enter the previous institution / school name.', 'error');
            return;
        }

        setIsSaving(true);
        const parsedNumeric = gradeNumeric.trim() ? parseFloat(gradeNumeric) : null;
        const parsedUnits = unitsCredited.trim() ? parseFloat(unitsCredited) : activeCourse.units;

        const res = await creditStudentCourse({
            student_id: studentId,
            course_id: activeCourse.course_id,
            previous_school: previousSchool.trim(),
            previous_course_code: previousCourseCode.trim() || undefined,
            previous_course_title: previousCourseTitle.trim() || undefined,
            grade_display: gradeDisplay.trim() || 'Passed',
            grade_numeric: parsedNumeric && !isNaN(parsedNumeric) ? parsedNumeric : null,
            units_credited: parsedUnits && !isNaN(parsedUnits) ? parsedUnits : activeCourse.units,
            remarks: remarks.trim() || undefined
        });

        setIsSaving(false);

        if (res.data?.success) {
            useToastStore.getState().showToast(res.data.message || 'Course credited successfully!', 'success');
            setRememberedSchool(previousSchool.trim());
            handleCloseCreditForm();
            loadCurriculum();
            onSuccess?.();
        } else {
            useToastStore.getState().showToast(res.error?.message || res.data?.message || 'Failed to credit course.', 'error');
        }
    }

    async function handleConfirmRevoke() {
        if (!courseToRevoke?.credited_id) return;

        setIsRevoking(true);
        const res = await removeCreditedCourse(courseToRevoke.credited_id, 'Revoked by Registrar');
        setIsRevoking(false);

        if (res.data?.success) {
            useToastStore.getState().showToast(res.data.message || 'Course credit revoked.', 'success');
            setCourseToRevoke(null);
            loadCurriculum();
            onSuccess?.();
        } else {
            useToastStore.getState().showToast(res.error?.message || 'Failed to revoke course credit.', 'error');
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
                const codeMatch = c.course_code.toLowerCase().includes(query);
                const titleMatch = c.course_title.toLowerCase().includes(query);
                const schoolMatch = c.previous_school?.toLowerCase().includes(query) ?? false;
                const prevCodeMatch = c.previous_course_code?.toLowerCase().includes(query) ?? false;
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
                                <IdentificationCardIcon size={24} className="text-(--mui-palette-primary-main) shrink-0" weight="bold" />
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
                                <GraduationCapIcon size={24} className="text-(--mui-palette-info-main) shrink-0" weight="bold" />
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
                                    type="button"
                                    className="p-2 rounded-lg border border-(--mui-palette-divider) text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary) hover:bg-(--mui-palette-action-hover) cursor-pointer"
                                    onClick={loadCurriculum}
                                >
                                    <ArrowsClockwiseIcon size={18} className={isLoading ? 'animate-spin' : ''} />
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
                                                <MagnifyingGlassIcon size={18} className="text-(--mui-palette-text-secondary)" />
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
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-12 gap-2 text-(--mui-palette-text-secondary)">
                                <ArrowsClockwiseIcon size={28} className="animate-spin text-(--mui-palette-primary-main)" />
                                <span className="text-sm">Loading student curriculum checklist...</span>
                            </div>
                        ) : filteredCourses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 gap-2 text-(--mui-palette-text-secondary)">
                                <CertificateIcon size={36} className="text-(--mui-palette-text-disabled)" />
                                <span className="text-sm font-medium">No matching courses found</span>
                                <span className="text-xs">Try adjusting your search terms or year level filter.</span>
                            </div>
                        ) : (
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
                                            key={c.curriculum_map_id}
                                            className={`hover:bg-(--mui-palette-action-hover)/50 transition-colors ${
                                                c.is_credited ? 'bg-(--mui-palette-success-main)/5' : ''
                                            }`}
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
                                                <div className="text-xs text-(--mui-palette-text-secondary) truncate" title={c.course_title}>
                                                    {c.course_title}
                                                </div>
                                            </td>

                                            <td className="px-3.5 py-3 text-center whitespace-nowrap">
                                                <span className="font-mono font-semibold text-(--mui-palette-text-primary)">
                                                    {c.units.toFixed(1)}
                                                </span>
                                            </td>

                                            <td className="px-3.5 py-3">
                                                {c.is_credited ? (
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
                                                            <BuildingsIcon size={14} className="shrink-0 text-(--mui-palette-primary-main)" />
                                                            <span className="font-medium text-(--mui-palette-text-primary)">
                                                                {c.previous_school}
                                                            </span>
                                                        </div>
                                                        {(c.previous_course_code || c.previous_course_title) && (
                                                            <div className="text-[11px] text-(--mui-palette-text-secondary)">
                                                                Equated: {c.previous_course_code ? `${c.previous_course_code} · ` : ''}
                                                                {c.previous_course_title}
                                                            </div>
                                                        )}
                                                        {c.remarks && (
                                                            <div className="text-[10px] italic text-(--mui-palette-text-disabled)">
                                                                &ldquo;{c.remarks}&rdquo;
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : c.is_passed_locally ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <CommonBadgeStatus
                                                            label="Passed (Regular)"
                                                            variant="info"
                                                        />
                                                        <span className="text-[11px] text-(--mui-palette-text-secondary)">
                                                            Completed at AU-JAS
                                                        </span>
                                                    </div>
                                                ) : (
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
                                                {c.is_credited ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Tooltip title="Edit credit details">
                                                            <button
                                                                type="button"
                                                                className="p-1.5 rounded-lg border border-(--mui-palette-divider) text-(--mui-palette-text-secondary) hover:text-(--mui-palette-primary-main) hover:bg-(--mui-palette-action-hover) cursor-pointer"
                                                                onClick={() => handleOpenCreditForm(c)}
                                                            >
                                                                <PencilSimpleIcon size={16} />
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip title="Revoke credited subject">
                                                            <button
                                                                type="button"
                                                                className="p-1.5 rounded-lg border border-(--mui-palette-divider) text-red-500 hover:text-red-700 hover:bg-red-500/10 cursor-pointer"
                                                                onClick={() => setCourseToRevoke(c)}
                                                            >
                                                                <TrashIcon size={16} />
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                ) : !c.is_passed_locally ? (
                                                    <CommonButton
                                                        color="primary"
                                                        size="small"
                                                        startIcon={<PlusIcon size={14} weight="bold" />}
                                                        variant="outlined"
                                                        onClick={() => handleOpenCreditForm(c)}
                                                    >
                                                        Credit Course
                                                    </CommonButton>
                                                ) : null}
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
                            children: isSaving ? 'Saving Credit...' : (activeCourse.is_credited ? 'Update Credit' : 'Confirm & Credit Course'),
                            disabled: isSaving,
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

                        {/* Previous School Input */}
                        <div>
                            <span className="text-xs font-semibold text-(--mui-palette-text-primary) mb-1 block">
                                Previous School / University Name *
                            </span>
                            <CommonInput
                                fullWidth
                                placeholder="e.g. Polytechnic University of the Philippines"
                                size="small"
                                value={previousSchool}
                                onChange={(e) => setPreviousSchool(e.target.value)}
                            />
                        </div>

                        {/* Equated Course Codes */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <span className="text-xs font-semibold text-(--mui-palette-text-primary) mb-1 block">
                                    Previous Course Code
                                </span>
                                <CommonInput
                                    fullWidth
                                    placeholder="e.g. COMP 20013"
                                    size="small"
                                    value={previousCourseCode}
                                    onChange={(e) => setPreviousCourseCode(e.target.value)}
                                />
                            </div>

                            <div>
                                <span className="text-xs font-semibold text-(--mui-palette-text-primary) mb-1 block">
                                    Previous Course Title
                                </span>
                                <CommonInput
                                    fullWidth
                                    placeholder="e.g. Intro to Computing"
                                    size="small"
                                    value={previousCourseTitle}
                                    onChange={(e) => setPreviousCourseTitle(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Grades and Units */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <span className="text-xs font-semibold text-(--mui-palette-text-primary) mb-1 block">
                                    Grade Obtained *
                                </span>
                                <CommonInput
                                    fullWidth
                                    placeholder="e.g. 1.75 or Passed"
                                    size="small"
                                    value={gradeDisplay}
                                    onChange={(e) => setGradeDisplay(e.target.value)}
                                />
                            </div>

                            <div>
                                <span className="text-xs font-semibold text-(--mui-palette-text-primary) mb-1 block">
                                    Numeric Equivalent
                                </span>
                                <CommonInput
                                    fullWidth
                                    placeholder="e.g. 1.75"
                                    size="small"
                                    type="number"
                                    value={gradeNumeric}
                                    onChange={(e) => setGradeNumeric(e.target.value)}
                                />
                            </div>

                            <div>
                                <span className="text-xs font-semibold text-(--mui-palette-text-primary) mb-1 block">
                                    Units to Credit
                                </span>
                                <CommonInput
                                    fullWidth
                                    placeholder="e.g. 3.0"
                                    size="small"
                                    type="number"
                                    value={unitsCredited}
                                    onChange={(e) => setUnitsCredited(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Remarks */}
                        <div>
                            <span className="text-xs font-semibold text-(--mui-palette-text-primary) mb-1 block">
                                Registrar Audit Remarks
                            </span>
                            <CommonInput
                                fullWidth
                                placeholder="e.g. Credited based on Official Transcript of Records (TOR) evaluation"
                                size="small"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />
                        </div>
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
                            children: isRevoking ? 'Revoking...' : 'Yes, Revoke Credit',
                            color: 'error',
                            disabled: isRevoking,
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
