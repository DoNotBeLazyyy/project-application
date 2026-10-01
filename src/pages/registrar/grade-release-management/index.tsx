import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import CommonInput from '@components/input/CommonInput';
import CommonSelect from '@components/select/CommonSelect';
import ConfirmPromptModal from '@components/modal/ConfirmPromptModal';
import { InputAdornment } from '@mui/material';
import ReleaseScheduleForm from '@pages/registrar/grade-release-management/ReleaseScheduleForm';
import SectionGradeSheetModal from '@pages/registrar/grade-release-management/SectionGradeSheetModal';
import {
    CalendarBlankIcon,
    CheckCircleIcon,
    ClockIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    SealCheckIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import {
    approveAndReleaseSection,
    listGradeReleaseSchedule,
    listSectionGradeSubmissions,
    releaseGradingPeriodNow,
    setGradingPeriodReleaseAt
} from '@services/grade-release.service';
import { getTerms, TermOption } from '@services/section.service';
import { ChangeEventInputTextarea } from '@type/common.type';
import {
    GradeReleaseSchedule,
    SectionGradeSubmissionRow,
    SectionGradeSubmissionStatus
} from '@type/grade-release.type';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function formatReleaseAt(releaseAt: string): string {
    return DateTime.fromISO(releaseAt).toFormat('MMM d, yyyy · h:mm a');
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return DateTime.fromISO(iso).toFormat('MMM d, yyyy · h:mm a');
}

function isDue(period: GradeReleaseSchedule): boolean {
    return !!period.release_at && DateTime.fromISO(period.release_at) <= DateTime.now();
}

function resolveStatusLabel(period: GradeReleaseSchedule): string {
    if (period.total_grades === 0) {
        return 'No grades submitted yet';
    }

    if (period.released_count === period.total_grades) {
        return 'Fully released';
    }

    if (!period.release_at) {
        return 'No release scheduled';
    }

    if (!isDue(period)) {
        return `Releases ${formatReleaseAt(period.release_at)}`;
    }

    return `Releasing — ${period.blocked_count} awaiting evaluation`;
}

function resolveSubmissionBadgeVariant(status: SectionGradeSubmissionStatus): 'success' | 'warning' | 'info' | 'error' {
    switch (status) {
        case 'Released':
            return 'success';
        case 'Approved':
            return 'info';
        case 'Submitted':
            return 'warning';
        case 'Draft':
        case 'Not Calculated':
        case 'No Enrollees':
        default:
            return 'info';
    }
}

type StatusFilterTab = 'ALL' | 'SUBMITTED' | 'DRAFT' | 'APPROVED' | 'RELEASED';

export default function GradeRelease() {
    const [termOptions, setTermOptions] = useState<{ label: string; value: string }[]>([]);
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    const [periods, setPeriods] = useState<GradeReleaseSchedule[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
    const [activePeriod, setActivePeriod] = useState<GradeReleaseSchedule | null>(null);
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [releaseTarget, setReleaseTarget] = useState<GradeReleaseSchedule | null>(null);

    // Section Grade Submissions state
    const [sectionRows, setSectionRows] = useState<SectionGradeSubmissionRow[]>([]);
    const [isSectionsLoading, setIsSectionsLoading] = useState(false);
    const [sectionSearch, setSectionSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilterTab>('ALL');
    const [inspectedSection, setInspectedSection] = useState<SectionGradeSubmissionRow | null>(null);
    const [sectionToRelease, setSectionToRelease] = useState<SectionGradeSubmissionRow | null>(null);
    const [isReleasingSection, setIsReleasingSection] = useState(false);

    const activeTermRequestIdRef = useRef<string>('');
    const activePeriodRequestIdRef = useRef<string>('');

    const loadTermData = useCallback(async function(termId: string) {
        activeTermRequestIdRef.current = termId;
        if (!termId) {
            setPeriods([]);
            setSelectedPeriodId('');
            activePeriodRequestIdRef.current = '';
            setSectionRows([]);
            return;
        }

        setIsSectionsLoading(true);
        try {
            const periodsResult = await listGradeReleaseSchedule(termId);
            if (activeTermRequestIdRef.current !== termId) return;

            const periodsList = periodsResult.data ?? [];
            setPeriods(periodsList);
            const initialPeriodId = periodsList[0]?.grading_period_id ?? '';
            setSelectedPeriodId(initialPeriodId);
            activePeriodRequestIdRef.current = initialPeriodId;

            if (initialPeriodId) {
                const sectionsResult = await listSectionGradeSubmissions(termId, initialPeriodId);
                if (activeTermRequestIdRef.current !== termId) return;
                setSectionRows(sectionsResult.data ?? []);
            } else {
                setSectionRows([]);
            }
        } catch (err) {
            if (activeTermRequestIdRef.current === termId) {
                console.error('Failed to load term grade release data:', err);
                setPeriods([]);
                setSelectedPeriodId('');
                setSectionRows([]);
            }
        } finally {
            if (activeTermRequestIdRef.current === termId) {
                setIsSectionsLoading(false);
            }
        }
    }, []);

    const handleSelectPeriod = useCallback(async function(periodId: string) {
        if (periodId === selectedPeriodId) return;

        setSelectedPeriodId(periodId);
        activePeriodRequestIdRef.current = periodId;

        if (!selectedTermId || !periodId) {
            setSectionRows([]);
            return;
        }

        setIsSectionsLoading(true);
        try {
            const sectionsResult = await listSectionGradeSubmissions(selectedTermId, periodId);
            if (activePeriodRequestIdRef.current === periodId) {
                setSectionRows(sectionsResult.data ?? []);
            }
        } catch (err) {
            if (activePeriodRequestIdRef.current === periodId) {
                console.error('Failed to load section submissions for period:', err);
                setSectionRows([]);
            }
        } finally {
            if (activePeriodRequestIdRef.current === periodId) {
                setIsSectionsLoading(false);
            }
        }
    }, [selectedTermId, selectedPeriodId]);

    const refreshCurrentData = useCallback(async function() {
        if (!selectedTermId) return;

        try {
            const periodsResult = await listGradeReleaseSchedule(selectedTermId);
            if (periodsResult.data) {
                setPeriods(periodsResult.data);
            }
            if (selectedPeriodId) {
                const sectionsResult = await listSectionGradeSubmissions(selectedTermId, selectedPeriodId);
                if (sectionsResult.data) {
                    setSectionRows(sectionsResult.data);
                }
            }
        } catch (err) {
            console.error('Failed to refresh grade release data:', err);
        }
    }, [selectedTermId, selectedPeriodId]);

    useEffect(function() {
        async function fetchTerms() {
            const result = await getTerms();
            if (result.data) {
                const options = result.data.map(function(term: TermOption) {
                    return {
                        label: term.label,
                        value: term.id
                    };
                });

                setTermOptions(options);
                if (options.length > 0) {
                    const initialTermId = options[0].value;
                    setSelectedTermId(initialTermId);
                    loadTermData(initialTermId);
                }
            }
        }

        fetchTerms();
    }, [loadTermData]);

    function handleTermChange(e: ChangeEventInputTextarea) {
        const newTermId = e.target.value;
        setSelectedTermId(newTermId);
        setReleaseTarget(null);
        setInspectedSection(null);
        setSectionToRelease(null);
        setIsScheduleOpen(false);
        setActivePeriod(null);
        loadTermData(newTermId);
    }

    function handleOpenSchedule(period: GradeReleaseSchedule) {
        setActivePeriod(period);
        setIsScheduleOpen(true);
    }

    function handleCloseSchedule() {
        setIsScheduleOpen(false);
        setActivePeriod(null);
    }

    async function persistReleaseAt(releaseAt: string | null) {
        if (!activePeriod) return;

        setIsSaving(true);
        try {
            const result = await setGradingPeriodReleaseAt(activePeriod.grading_period_id, releaseAt);
            if (!result.error) {
                handleCloseSchedule();
                await refreshCurrentData();
            }
        } finally {
            setIsSaving(false);
        }
    }

    function handleSaveSchedule(releaseAt: string) {
        persistReleaseAt(releaseAt);
    }

    function handleClearSchedule() {
        persistReleaseAt(null);
    }

    async function handleConfirmReleaseNow() {
        if (!releaseTarget) return;

        const result = await releaseGradingPeriodNow(releaseTarget.grading_period_id);
        setReleaseTarget(null);

        if (!result.error) {
            await refreshCurrentData();
        }
    }

    async function handleConfirmReleaseSingleSection() {
        if (!sectionToRelease || !selectedPeriodId) return;

        setIsReleasingSection(true);
        try {
            const result = await approveAndReleaseSection(sectionToRelease.section_id, selectedPeriodId);
            if (result.data?.success) {
                setSectionToRelease(null);
                await refreshCurrentData();
            }
        } finally {
            setIsReleasingSection(false);
        }
    }

    const currentPeriod = useMemo(function() {
        return periods.find((p) => p.grading_period_id === selectedPeriodId) ?? periods[0] ?? null;
    }, [periods, selectedPeriodId]);

    // Filter section submissions
    const filteredSections = useMemo(function() {
        return sectionRows.filter(function(row) {
            // Status Tab Filter
            if (statusFilter === 'SUBMITTED' && row.submission_status !== 'Submitted') {
                return false;
            }
            if (statusFilter === 'DRAFT' && row.submission_status !== 'Draft' && row.submission_status !== 'Not Calculated') {
                return false;
            }
            if (statusFilter === 'APPROVED' && row.submission_status !== 'Approved') {
                return false;
            }
            if (statusFilter === 'RELEASED' && row.submission_status !== 'Released') {
                return false;
            }

            // Text search
            const query = sectionSearch.trim().toLowerCase();
            if (!query) return true;

            return (
                row.course_code.toLowerCase().includes(query) ||
                row.course_title.toLowerCase().includes(query) ||
                row.section_code.toLowerCase().includes(query) ||
                row.faculty_name.toLowerCase().includes(query)
            );
        });
    }, [sectionRows, statusFilter, sectionSearch]);

    // Section Summary Counts
    const submissionCounts = useMemo(function() {
        const total = sectionRows.length;
        const submitted = sectionRows.filter((r) => r.submission_status === 'Submitted').length;
        const approved = sectionRows.filter((r) => r.submission_status === 'Approved').length;
        const released = sectionRows.filter((r) => r.submission_status === 'Released').length;
        const draftOrNone = sectionRows.filter((r) => r.submission_status === 'Draft' || r.submission_status === 'Not Calculated').length;

        return { approved, draftOrNone, released, submitted, total };
    }, [sectionRows]);

    return (
        <CommonCard className="flex flex-col gap-3.5 h-full min-h-0 p-3 sm:p-5 w-full">
            {/* Published Soon Notice Banner */}
            <div className="border border-(--mui-palette-warning-main) bg-(--mui-palette-warning-light) p-3 rounded-lg flex items-start gap-3 text-xs text-(--mui-palette-text-primary)">
                <ClockIcon size={20} className="text-(--mui-palette-warning-main) shrink-0 mt-0.5" />
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-(--mui-palette-text-primary)">
                            Flagged to be Published Soon
                        </span>
                        <CommonBadgeStatus color="warning" label="Published Soon" size="small" />
                    </div>
                    <p className="m-0 mt-0.5 text-(--mui-palette-text-secondary)">
                        Grade release is currently hidden from standard operations and flagged to be published soon. All grade review tools, schedules, and sections remain accessible here for preview and testing.
                    </p>
                </div>
            </div>

            {/* Header & Term Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-(--mui-palette-divider)">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <h1 className="font-bold text-(--mui-palette-text-primary) text-lg sm:text-xl">
                            Grade Release &amp; Submission Verification
                        </h1>
                        <CommonBadgeStatus color="warning" label="Published Soon" size="small" />
                    </div>
                    <p className="text-(--mui-palette-text-secondary) text-xs hidden sm:block">
                        Track faculty term grade submissions by section, inspect student grade sheets, and publish official grades.
                    </p>
                </div>

                {/* Term Selector */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="font-medium text-(--mui-palette-text-secondary) text-xs whitespace-nowrap">
                        Term:
                    </span>
                    <div className="w-full sm:w-64">
                        <CommonSelect
                            fullWidth
                            options={termOptions}
                            size="small"
                            value={selectedTermId}
                            onChange={handleTermChange}
                        />
                    </div>
                </div>
            </div>

            {/* Compact Grading Periods Selector & Active Toolbar */}
            <div className="flex flex-col gap-2">
                {periods.length === 0 ? (
                    <p className="text-(--mui-palette-text-disabled) text-xs">
                        This term has no grading periods configured.
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {/* Horizontal Period Selector Pills */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {periods.map(function(period) {
                                const isSelected = period.grading_period_id === selectedPeriodId;
                                const isFullyReleased = period.total_grades > 0 && period.released_count === period.total_grades;

                                return (
                                    <button
                                        key={period.grading_period_id}
                                        type="button"
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all border cursor-pointer ${
                                            isSelected
                                                ? 'bg-(--mui-palette-primary-main) text-white border-(--mui-palette-primary-main) shadow-xs'
                                                : 'bg-(--mui-palette-background-paper) text-(--mui-palette-text-primary) border-(--mui-palette-divider) hover:border-(--mui-palette-text-secondary)/60'
                                        }`}
                                        onClick={() => handleSelectPeriod(period.grading_period_id)}
                                    >
                                        <span>{period.grading_period_name}</span>
                                        <span
                                            className={`text-[11px] font-mono px-1.5 py-0.2 rounded-md ${
                                                isSelected
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-(--mui-palette-action-hover) text-(--mui-palette-text-secondary)'
                                            }`}
                                        >
                                            {period.released_count}/{period.total_grades}
                                        </span>
                                        {isFullyReleased ? (
                                            <CheckCircleIcon
                                                size={15}
                                                weight="fill"
                                                className={isSelected ? 'text-white' : 'text-(--mui-palette-success-main)'}
                                            />
                                        ) : period.release_at ? (
                                            <ClockIcon
                                                size={15}
                                                weight="bold"
                                                className={isSelected ? 'text-white' : 'text-(--mui-palette-info-main)'}
                                            />
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Active Period Status & Action Strip */}
                        {currentPeriod && (
                            <div className="bg-(--mui-palette-action-hover)/40 border border-(--mui-palette-divider) rounded-xl px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                                    <div className="flex items-center gap-1.5 font-semibold text-(--mui-palette-text-primary)">
                                        <span>{currentPeriod.grading_period_name}:</span>
                                        <span className="font-mono text-(--mui-palette-primary-main)">
                                            {currentPeriod.released_count} of {currentPeriod.total_grades} grades released
                                            ({currentPeriod.total_grades > 0 ? Math.round((currentPeriod.released_count / currentPeriod.total_grades) * 100) : 0}%)
                                        </span>
                                    </div>

                                    <span className="text-(--mui-palette-text-disabled) hidden sm:inline">·</span>

                                    <span className="text-(--mui-palette-text-secondary)">
                                        {resolveStatusLabel(currentPeriod)}
                                    </span>

                                    {currentPeriod.blocked_count > 0 && (
                                        <span className="flex items-center gap-1 text-(--mui-palette-warning-main) font-medium bg-amber-500/10 px-2 py-0.5 rounded-full text-[11px]">
                                            <WarningCircleIcon size={13} weight="fill" />
                                            <span>{currentPeriod.blocked_count} student(s) pending eval</span>
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                    <CommonButton
                                        size="small"
                                        startIcon={<CalendarBlankIcon size={14} />}
                                        variant="outlined"
                                        onClick={() => handleOpenSchedule(currentPeriod)}
                                    >
                                        {currentPeriod.release_at ? 'Edit Schedule' : 'Schedule'}
                                    </CommonButton>
                                    <CommonButton
                                        disabled={
                                            (currentPeriod.total_grades > 0 && currentPeriod.released_count === currentPeriod.total_grades) ||
                                            currentPeriod.total_grades === 0
                                        }
                                        size="small"
                                        startIcon={<SealCheckIcon size={14} weight="bold" />}
                                        variant="contained"
                                        onClick={() => setReleaseTarget(currentPeriod)}
                                    >
                                        Release All
                                    </CommonButton>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Section Submissions Breakdown */}
            <div className="border border-(--mui-palette-divider) flex flex-1 flex-col gap-3 min-h-0 p-3 sm:p-4 rounded-xl overflow-hidden">
                {/* Section Header & Subtitle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                        <h2 className="font-semibold text-(--mui-palette-text-primary) text-base sm:text-lg">
                            {currentPeriod ? `${currentPeriod.grading_period_name} · Section Grade Submissions` : 'Section Submissions'}
                        </h2>
                        <p className="m-0 text-(--mui-palette-text-secondary) text-xs">
                            Verify grades submitted by instructors. Click &ldquo;Inspect&rdquo; to view individual student grades and evaluation status.
                        </p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="bg-(--mui-palette-action-hover)/40 flex flex-wrap gap-1 p-1 rounded-lg text-xs shrink-0">
                        <button
                            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                                statusFilter === 'ALL'
                                    ? 'bg-(--mui-palette-background-paper) text-(--mui-palette-text-primary) shadow-xs'
                                    : 'text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary)'
                            }`}
                            type="button"
                            onClick={() => setStatusFilter('ALL')}
                        >
                            All ({submissionCounts.total})
                        </button>
                        <button
                            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                                statusFilter === 'SUBMITTED'
                                    ? 'bg-(--mui-palette-warning-50) text-(--mui-palette-warning-dark) shadow-xs font-semibold'
                                    : 'text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary)'
                            }`}
                            type="button"
                            onClick={() => setStatusFilter('SUBMITTED')}
                        >
                            Submitted ({submissionCounts.submitted})
                        </button>
                        <button
                            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                                statusFilter === 'DRAFT'
                                    ? 'bg-(--mui-palette-background-paper) text-(--mui-palette-text-primary) shadow-xs'
                                    : 'text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary)'
                            }`}
                            type="button"
                            onClick={() => setStatusFilter('DRAFT')}
                        >
                            Pending Faculty ({submissionCounts.draftOrNone})
                        </button>
                        <button
                            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                                statusFilter === 'RELEASED'
                                    ? 'bg-(--mui-palette-success-50) text-(--mui-palette-success-dark) shadow-xs font-semibold'
                                    : 'text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary)'
                            }`}
                            type="button"
                            onClick={() => setStatusFilter('RELEASED')}
                        >
                            Released ({submissionCounts.released})
                        </button>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                    <div className="w-full sm:w-80">
                        <CommonInput
                            fullWidth
                            placeholder="Filter by course, section, or faculty..."
                            size="small"
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <MagnifyingGlassIcon size={16} />
                                        </InputAdornment>
                                    )
                                }
                            }}
                            value={sectionSearch}
                            onChange={(e) => setSectionSearch(e.target.value)}
                        />
                    </div>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        Showing {filteredSections.length} of {sectionRows.length} sections
                    </span>
                </div>

                {/* Section Table / Mobile Cards */}
                <div className="border border-(--mui-palette-divider) flex-1 min-h-0 overflow-x-auto overflow-y-auto rounded-lg">
                    {isSectionsLoading ? (
                        <div className="p-8 text-center text-(--mui-palette-text-secondary) text-sm">
                            Loading section submissions...
                        </div>
                    ) : filteredSections.length === 0 ? (
                        <div className="p-8 text-center text-(--mui-palette-text-secondary) text-sm">
                            {sectionRows.length === 0
                                ? 'No sections found for this academic term.'
                                : 'No section submissions match the selected filter.'}
                        </div>
                    ) : (
                        <>
                            {/* Mobile View: Section Breakdown Cards */}
                            <div className="md:hidden flex flex-col divide-y divide-(--mui-palette-divider)">
                                {filteredSections.map(function(row) {
                                    const canRelease =
                                        row.submission_status !== 'Released' &&
                                        row.submission_status !== 'No Enrollees' &&
                                        row.graded_count > 0;

                                    return (
                                        <div key={row.section_id} className="p-4 flex flex-col gap-3 bg-(--mui-palette-background-paper) hover:bg-(--mui-palette-action-hover)/20 transition-colors">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-(--mui-palette-text-primary) text-base">
                                                            {row.course_code}
                                                        </span>
                                                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-(--mui-palette-action-hover) text-(--mui-palette-text-secondary) font-semibold">
                                                            Sec {row.section_code}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-(--mui-palette-text-secondary) mt-0.5 line-clamp-1">
                                                        {row.course_title}
                                                    </span>
                                                </div>
                                                <CommonBadgeStatus
                                                    label={row.submission_status}
                                                    variant={resolveSubmissionBadgeVariant(row.submission_status)}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 bg-(--mui-palette-action-hover)/30 p-2.5 rounded-lg text-xs">
                                                <div>
                                                    <span className="text-[10px] text-(--mui-palette-text-secondary) block uppercase font-medium">Instructor</span>
                                                    <span className="font-medium text-(--mui-palette-text-primary) truncate block">
                                                        {row.faculty_name}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-(--mui-palette-text-secondary) block uppercase font-medium">Graded</span>
                                                    <span className="font-mono font-semibold text-(--mui-palette-text-primary)">
                                                        {row.graded_count} / {row.enrolled_count} ({row.enrolled_count > 0 ? Math.round((row.graded_count / row.enrolled_count) * 100) : 0}%)
                                                    </span>
                                                </div>
                                                {row.room && (
                                                    <div>
                                                        <span className="text-[10px] text-(--mui-palette-text-secondary) block uppercase font-medium">Room</span>
                                                        <span className="text-(--mui-palette-text-primary)">{row.room}</span>
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="text-[10px] text-(--mui-palette-text-secondary) block uppercase font-medium">Submitted</span>
                                                    <span className="text-(--mui-palette-text-secondary)">{formatDate(row.last_submitted_at)}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-(--mui-palette-divider)/60">
                                                <CommonButton
                                                    size="small"
                                                    startIcon={<EyeIcon size={14} />}
                                                    variant="outlined"
                                                    onClick={() => setInspectedSection(row)}
                                                >
                                                    Inspect
                                                </CommonButton>
                                                {canRelease && (
                                                    <CommonButton
                                                        size="small"
                                                        startIcon={<SealCheckIcon size={14} />}
                                                        variant="contained"
                                                        onClick={() => setSectionToRelease(row)}
                                                    >
                                                        Release
                                                    </CommonButton>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Desktop View: Full Table */}
                            <table className="hidden md:table border-collapse text-left text-sm w-full">
                                <thead className="bg-(--mui-palette-action-hover)/50 border-b border-(--mui-palette-divider) sticky text-(--mui-palette-text-secondary) text-xs top-0 uppercase">
                                    <tr>
                                        <th className="font-semibold p-3">Course</th>
                                        <th className="font-semibold p-3">Section</th>
                                        <th className="font-semibold p-3">Instructor</th>
                                        <th className="font-semibold p-3 text-center">Enrolled</th>
                                        <th className="font-semibold p-3 text-center">Grades Computed</th>
                                        <th className="font-semibold p-3 text-center">Status</th>
                                        <th className="font-semibold p-3">Last Submitted</th>
                                        <th className="font-semibold p-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-(--mui-palette-divider)">
                                    {filteredSections.map(function(row) {
                                        const canRelease =
                                            row.submission_status !== 'Released' &&
                                            row.submission_status !== 'No Enrollees' &&
                                            row.graded_count > 0;

                                        return (
                                            <tr className="hover:bg-(--mui-palette-action-hover)/30 transition-colors" key={row.section_id}>
                                                <td className="p-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-(--mui-palette-text-primary)">
                                                            {row.course_code}
                                                        </span>
                                                        <span className="text-(--mui-palette-text-secondary) text-xs truncate max-w-xs">
                                                            {row.course_title}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="font-medium p-3 text-(--mui-palette-text-primary) whitespace-nowrap">
                                                    {row.section_code}
                                                    {row.room && (
                                                        <span className="block text-(--mui-palette-text-secondary) text-xs">
                                                            {row.room}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-(--mui-palette-text-primary)">
                                                            {row.faculty_name}
                                                        </span>
                                                        {row.faculty_email && (
                                                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                                                {row.faculty_email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="font-medium p-3 text-center text-(--mui-palette-text-primary)">
                                                    {row.enrolled_count}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="font-mono text-xs">
                                                        {row.graded_count} / {row.enrolled_count}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <CommonBadgeStatus
                                                        label={row.submission_status}
                                                        variant={resolveSubmissionBadgeVariant(row.submission_status)}
                                                    />
                                                </td>
                                                <td className="p-3 text-(--mui-palette-text-secondary) text-xs whitespace-nowrap">
                                                    {formatDate(row.last_submitted_at)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className="flex gap-2 items-center justify-center">
                                                        <CommonButton
                                                            size="small"
                                                            startIcon={<EyeIcon size={14} />}
                                                            variant="outlined"
                                                            onClick={() => setInspectedSection(row)}
                                                        >
                                                            Inspect
                                                        </CommonButton>
                                                        {canRelease && (
                                                            <CommonButton
                                                                size="small"
                                                                startIcon={<SealCheckIcon size={14} />}
                                                                variant="contained"
                                                                onClick={() => setSectionToRelease(row)}
                                                            >
                                                                Release
                                                            </CommonButton>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>
            </div>

            {/* Schedule Modal */}
            <ReleaseScheduleForm
                isSaving={isSaving}
                open={isScheduleOpen}
                period={activePeriod}
                onClear={handleClearSchedule}
                onClose={handleCloseSchedule}
                onSave={handleSaveSchedule}
            />

            {/* Release Entire Period Confirm Modal */}
            <ConfirmPromptModal
                formButtonsProps={{
                    cancelProps: {
                        children: 'Cancel',
                        onClick: () => setReleaseTarget(null)
                    },
                    confirmProps: {
                        children: 'Release Now',
                        onClick: handleConfirmReleaseNow
                    }
                }}
                mainContent={{ title: 'Release all grades for this period?' }}
                open={!!releaseTarget}
                subContent={{
                    title: releaseTarget
                        ? `${releaseTarget.grading_period_name} grades for all sections will become visible to compliant students immediately. Students with a pending faculty evaluation stay blocked until they submit it.`
                        : ''
                }}
                onClose={() => setReleaseTarget(null)}
            />

            {/* Release Single Section Confirm Modal */}
            <ConfirmPromptModal
                formButtonsProps={{
                    cancelProps: {
                        children: 'Cancel',
                        onClick: () => setSectionToRelease(null)
                    },
                    confirmProps: {
                        children: isReleasingSection ? 'Releasing...' : 'Confirm Release',
                        disabled: isReleasingSection,
                        onClick: handleConfirmReleaseSingleSection
                    }
                }}
                mainContent={{
                    title: sectionToRelease
                        ? `Release grades for ${sectionToRelease.course_code} (${sectionToRelease.section_code})?`
                        : ''
                }}
                open={!!sectionToRelease}
                subContent={{
                    title: sectionToRelease
                        ? `Grades will be published to enrolled students who have submitted their faculty evaluation. Students with pending evaluations remain blocked until completed.`
                        : ''
                }}
                onClose={() => setSectionToRelease(null)}
            />

            {/* Grade Sheet Inspection Modal */}
            {inspectedSection && currentPeriod && (
                <SectionGradeSheetModal
                    gradingPeriodId={currentPeriod.grading_period_id}
                    gradingPeriodName={currentPeriod.grading_period_name}
                    open={!!inspectedSection}
                    section={inspectedSection}
                    onClose={() => setInspectedSection(null)}
                    onReleased={async () => {
                        await refreshCurrentData();
                    }}
                />
            )}
        </CommonCard>
    );
}