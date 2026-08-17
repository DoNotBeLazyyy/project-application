import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import ConfirmPromptModal from '@components/modal/ConfirmPromptModal';
import CommonSelect from '@components/select/CommonSelect';
import { CalendarBlankIcon, CheckCircleIcon, ClockIcon, WarningCircleIcon } from '@phosphor-icons/react';
import ReleaseScheduleForm from '@pages/registrar/grade-release-management/ReleaseScheduleForm';
import { listGradeReleaseSchedule, releaseGradingPeriodNow, setGradingPeriodReleaseAt } from '@services/grade-release.service';
import { getTerms, TermOption } from '@services/section.service';
import { ChangeEventInputTextarea } from '@type/common.type';
import { GradeReleaseSchedule } from '@type/grade-release.type';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useState } from 'react';

function formatReleaseAt(releaseAt: string): string {
    return DateTime.fromISO(releaseAt)
        .toFormat('MMM d, yyyy · h:mm a');
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

export default function GradeRelease() {
    const [termOptions, setTermOptions] = useState<{ label: string; value: string }[]>([]);
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    const [periods, setPeriods] = useState<GradeReleaseSchedule[]>([]);
    const [activePeriod, setActivePeriod] = useState<GradeReleaseSchedule | null>(null);
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [releaseTarget, setReleaseTarget] = useState<GradeReleaseSchedule | null>(null);

    const fetchPeriods = useCallback(async function(termId: string) {
        if (!termId) {
            return;
        }

        const result = await listGradeReleaseSchedule(termId);

        if (result.data) {
            setPeriods(result.data);
        }
    }, []);

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
                    setSelectedTermId(options[0].value);
                }
            }
        }

        fetchTerms();
    }, []);

    useEffect(function() {
        fetchPeriods(selectedTermId);
    }, [selectedTermId, fetchPeriods]);

    function handleTermChange(e: ChangeEventInputTextarea) {
        setSelectedTermId(e.target.value);
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
        if (!activePeriod) {
            return;
        }

        setIsSaving(true);

        try {
            const result = await setGradingPeriodReleaseAt(activePeriod.grading_period_id, releaseAt);

            if (!result.error) {
                handleCloseSchedule();
                await fetchPeriods(selectedTermId);
            }
        }
        finally {
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
        if (!releaseTarget) {
            return;
        }

        const result = await releaseGradingPeriodNow(releaseTarget.grading_period_id);

        setReleaseTarget(null);

        if (!result.error) {
            await fetchPeriods(selectedTermId);
        }
    }

    return (
        <CommonCard className="flex flex-col gap-4 h-full min-h-0 p-4 w-full">
            <div className="flex flex-col gap-1">
                <h1 className="font-semibold text-[var(--mui-palette-text-primary)] text-xl">
                    Grade Release
                </h1>
                <p className="text-[var(--mui-palette-text-secondary)] text-sm">
                    Schedule when each grading period&apos;s grades become visible to students. Release runs
                    automatically once the scheduled time passes.
                </p>
            </div>
            <div className="flex flex-col gap-3 items-start sm:flex-row sm:items-center">
                <span className="font-medium text-[var(--mui-palette-text-primary)] text-sm whitespace-nowrap">
                    Select Term
                </span>
                <div className="w-full sm:w-80">
                    <CommonSelect
                        fullWidth
                        options={termOptions}
                        size="small"
                        value={selectedTermId}
                        onChange={handleTermChange}
                    />
                </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                {periods.length === 0
                    ? (
                        <p className="text-[var(--mui-palette-text-disabled)] text-sm">
                            This term has no grading periods configured.
                        </p>
                    )
                    : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:grid-cols-2">
                            {periods.map(function(period) {
                                const isFullyReleased = period.total_grades > 0
                                    && period.released_count === period.total_grades;
                                const hasBlocked = period.blocked_count > 0;

                                return (
                                    <div
                                        className="border border-[var(--mui-palette-divider)] flex flex-col gap-3 p-4 rounded-xl"
                                        key={period.grading_period_id}
                                    >
                                        <div className="flex items-start justify-between">
                                            <h2 className="font-semibold text-[var(--mui-palette-text-primary)] text-base">
                                                {period.grading_period_name}
                                            </h2>
                                            {isFullyReleased
                                                ? (
                                                    <CheckCircleIcon
                                                        className="text-[var(--mui-palette-success-main)]"
                                                        size={20}
                                                        weight="fill"
                                                    />
                                                )
                                                : (
                                                    <ClockIcon
                                                        className="text-[var(--mui-palette-text-disabled)]"
                                                        size={20}
                                                    />
                                                )
                                            }
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[var(--mui-palette-text-secondary)] text-sm">
                                                {period.released_count}/{period.total_grades} grades released
                                            </span>
                                            <span className="text-[var(--mui-palette-text-secondary)] text-xs">
                                                {resolveStatusLabel(period)}
                                            </span>
                                        </div>
                                        {hasBlocked
                                            ? (
                                                <div className="flex gap-1 items-center text-[var(--mui-palette-warning-main)]">
                                                    <WarningCircleIcon size={14} weight="fill" />
                                                    <span className="text-xs">
                                                        {period.blocked_count} student(s) have not submitted their evaluation
                                                    </span>
                                                </div>
                                            )
                                            : null
                                        }
                                        <div className="flex gap-2 mt-auto pt-2">
                                            <CommonButton
                                                fullWidth
                                                size="small"
                                                startIcon={<CalendarBlankIcon size={14} />}
                                                variant="contained"
                                                onClick={function() {
                                                    handleOpenSchedule(period);
                                                }}
                                            >
                                                {period.release_at
                                                    ? 'Edit Schedule'
                                                    : 'Schedule'
                                                }
                                            </CommonButton>
                                            <CommonButton
                                                disabled={isFullyReleased || period.total_grades === 0}
                                                fullWidth
                                                size="small"
                                                variant="outlined"
                                                onClick={function() {
                                                    setReleaseTarget(period);
                                                }}
                                            >
                                                Release Now
                                            </CommonButton>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                }
            </div>
            <ReleaseScheduleForm
                isSaving={isSaving}
                open={isScheduleOpen}
                period={activePeriod}
                onClear={handleClearSchedule}
                onClose={handleCloseSchedule}
                onSave={handleSaveSchedule}
            />
            <ConfirmPromptModal
                formButtonsProps={{
                    cancelProps: {
                        children: 'Cancel',
                        onClick: function() {
                            setReleaseTarget(null);
                        }
                    },
                    confirmProps: {
                        children: 'Release Now',
                        onClick: handleConfirmReleaseNow
                    }
                }}
                mainContent={{ title: 'Release grades immediately?' }}
                open={!!releaseTarget}
                subContent={{
                    title: releaseTarget
                        ? `${releaseTarget.grading_period_name} grades become visible to students right away. Students with a pending faculty evaluation stay blocked until they submit it. This cannot be undone.`
                        : ''
                }}
                onClose={function() {
                    setReleaseTarget(null);
                }}
            />
        </CommonCard>
    );
}