import CommonButton from '@components/button/CommonButton';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import { CalendarCheckIcon, CheckCircleIcon, SlidersHorizontalIcon, WarningCircleIcon } from '@phosphor-icons/react';
import SectionThresholdModal from '@pages/faculty/sections/grading/SectionThresholdModal';
import GradeSheetPanel from '@pages/faculty/sections/grading/GradeSheetPanel';
import GradingComponentPanel from '@pages/faculty/sections/grading/GradingComponentPanel';
import SpecialGradeFlagModal from '@pages/faculty/sections/grading/SpecialGradeFlagModal';
import {
    applySpecialGradeFlag,
    calculateAllGradesForPeriod,
    createGradingComponent,
    deleteGradingComponent,
    dismissSpecialGradeFlag,
    getSectionSpecialGradeOverrides,
    isSectionGradingLocked,
    listGradeSheet,
    listGradingComponents,
    listGradingPeriodsBySection,
    listSpecialGradeFlags,
    reseedSectionGrading,
    submitSectionGrades,
    updateGradingComponent
} from '@services/faculty.service';
import { getSectionById } from '@services/section.service';
import { useToastStore } from '@stores/toast.store';
import {
    GradeCalculationFailure,
    GradeSheetRow,
    GradingComponent,
    GradingComponentFormValues,
    GradingPeriod
} from '@type/faculty.type';
import { SectionOverridableRule, SpecialGradeFlag } from '@type/grading-config.type';
import { SyntheticEvent, useEffect, useMemo, useState } from 'react';

interface GradingTabProps {
    courseCode?: string;
    courseTitle?: string;
    sectionCode?: string;
    sectionId: string;
}

export default function GradingTab({
    courseCode,
    courseTitle,
    sectionCode,
    sectionId
}: GradingTabProps) {
    const [periods, setPeriods] = useState<GradingPeriod[]>([]);
    const [activePeriodId, setActivePeriodId] = useState('');
    const [components, setComponents] = useState<GradingComponent[]>([]);
    const [calculationFailures, setCalculationFailures] = useState<GradeCalculationFailure[]>([]);
    const [gradeSheet, setGradeSheet] = useState<GradeSheetRow[]>([]);
    const [isLocked, setIsLocked] = useState(false);
    const [specialGradeFlags, setSpecialGradeFlags] = useState<SpecialGradeFlag[]>([]);
    const [flagPendingDismissal, setFlagPendingDismissal] = useState<SpecialGradeFlag | null>(null);
    const [isFlagBusy, setIsFlagBusy] = useState(false);
    const [overridableRules, setOverridableRules] = useState<SectionOverridableRule[]>([]);
    const [isThresholdOpen, setIsThresholdOpen] = useState(false);
    const [isSubmittingGrades, setIsSubmittingGrades] = useState(false);
    const [mobileGradingView, setMobileGradingView] = useState<'sheet' | 'components'>('sheet');

    useEffect(function() {
        async function fetchPeriods() {
            const result = await listGradingPeriodsBySection(sectionId);

            if (result.data && result.data.length > 0) {
                setPeriods(result.data);
                setActivePeriodId(result.data[0].id);
            }
        }

        fetchPeriods();
        fetchOverridableRules();
    }, [sectionId]);

    useEffect(function() {
        if (!activePeriodId) return;
        fetchPeriodData();
    }, [sectionId, activePeriodId]);

    async function fetchOverridableRules() {
        const result = await getSectionSpecialGradeOverrides(sectionId);
        setOverridableRules(result.data ?? []);
    }

    async function fetchPeriodData() {
        const [componentsResult, gradeSheetResult, lockedResult, flagsResult] = await Promise.all([
            listGradingComponents(sectionId, activePeriodId),
            listGradeSheet(sectionId, activePeriodId),
            isSectionGradingLocked(sectionId, activePeriodId),
            listSpecialGradeFlags(sectionId, activePeriodId)
        ]);

        let loadedComponents = componentsResult.data ?? [];

        // If no components exist yet, automatically display inherited default components from section settings / program
        if (loadedComponents.length === 0) {
            await reseedSectionGrading(sectionId);
            const refetched = await listGradingComponents(sectionId, activePeriodId);

            if (refetched.data && refetched.data.length > 0) {
                loadedComponents = refetched.data;
            } else {
                const sectionRes = await getSectionById(sectionId);
                const currentPeriod = periods.find((p) => p.id === activePeriodId);
                const periodSeq = currentPeriod?.sequence ?? 1;
                const periodName = currentPeriod?.name?.toLowerCase() ?? '';

                const matchingPeriod = sectionRes.data?.grading_periods?.find(
                    (gp) => gp.sequence === periodSeq || gp.name.toLowerCase() === periodName
                );

                const defaultsToSeed = matchingPeriod?.components?.length
                    ? matchingPeriod.components
                    : [
                        { name: 'Quizzes', weight: 30 },
                        { name: 'Class Standing', weight: 30 },
                        { name: 'Major Exam', weight: 40 }
                    ];

                for (const comp of defaultsToSeed) {
                    await createGradingComponent(sectionId, activePeriodId, {
                        name: comp.name,
                        weight: String(comp.weight)
                    });
                }

                const finalComps = await listGradingComponents(sectionId, activePeriodId);
                if (finalComps.data && finalComps.data.length > 0) {
                    loadedComponents = finalComps.data;
                } else {
                    loadedComponents = defaultsToSeed.map((comp, idx) => ({
                        id: `default-${idx}`,
                        name: comp.name,
                        weight: Number(comp.weight)
                    }));
                }
            }
        }

        setComponents(loadedComponents);
        if (gradeSheetResult.data) setGradeSheet(gradeSheetResult.data);
        if (flagsResult.data) setSpecialGradeFlags(flagsResult.data);
        setIsLocked(Boolean(lockedResult.data));
    }

    function handleTabChange(_: SyntheticEvent, value: string) {
        setActivePeriodId(value);
    }

    async function handleCreate(values: GradingComponentFormValues) {
        const result = await createGradingComponent(sectionId, activePeriodId, values);
        if (!result.error) await fetchPeriodData();
    }

    async function handleUpdate(componentId: string, values: GradingComponentFormValues) {
        const result = await updateGradingComponent(componentId, values);
        if (!result.error) await fetchPeriodData();
    }

    async function handleDelete(componentId: string) {
        const result = await deleteGradingComponent(componentId);
        if (!result.error) await fetchPeriodData();
    }

    async function handleBatchSave(
        updates: { id: string; name: string; weight: number }[],
        creates: { name: string; weight: number }[],
        deletes: string[]
    ) {
        // 1. Process deletes first
        if (deletes.length > 0) {
            await Promise.all(deletes.map((id) => deleteGradingComponent(id)));
        }

        // 2. Order updates so weight decreases run before weight increases
        const sortedUpdates = [...updates].sort((a, b) => {
            const origA = components.find((c) => c.id === a.id)?.weight ?? 0;
            const origB = components.find((c) => c.id === b.id)?.weight ?? 0;
            return (a.weight - origA) - (b.weight - origB);
        });

        for (const u of sortedUpdates) {
            await updateGradingComponent(u.id, {
                name: u.name,
                weight: String(u.weight)
            });
        }

        // 3. Process creations
        for (const c of creates) {
            await createGradingComponent(sectionId, activePeriodId, {
                name: c.name,
                weight: String(c.weight)
            });
        }

        useToastStore.getState().showToast('Grading components saved successfully.', 'success');
        await fetchPeriodData();
    }

    async function handleCalculate() {
        const result = await calculateAllGradesForPeriod(sectionId, activePeriodId);
        if (result.error) return;

        setCalculationFailures(result.data?.failures ?? []);
        await fetchPeriodData();
    }

    function handleDismissFailures() {
        setCalculationFailures([]);
    }

    async function handleApplyFlag(flag: SpecialGradeFlag) {
        setIsFlagBusy(true);
        const result = await applySpecialGradeFlag(flag.id);
        setIsFlagBusy(false);

        const message = result.error?.message ?? result.data?.message;
        if (result.error || !result.data?.success) {
            useToastStore.getState().showToast(message ?? 'The special grade could not be applied.', 'warning');
            return;
        }

        useToastStore.getState().showToast(message ?? `Applied ${flag.code}.`, 'success');
        await fetchPeriodData();
    }

    function handleRequestDismissFlag(flag: SpecialGradeFlag) {
        setFlagPendingDismissal(flag);
    }

    async function handleConfirmDismissFlag(reason: string) {
        if (!flagPendingDismissal) return;

        setIsFlagBusy(true);
        const result = await dismissSpecialGradeFlag(flagPendingDismissal.id, reason);
        setIsFlagBusy(false);

        const message = result.error?.message ?? result.data?.message;
        if (result.error || !result.data?.success) {
            useToastStore.getState().showToast(message ?? 'The flag could not be dismissed.', 'warning');
            return;
        }

        setFlagPendingDismissal(null);
        useToastStore.getState().showToast(message ?? 'Flag dismissed.', 'success');
        await fetchPeriodData();
    }

    async function handleReseed() {
        const result = await reseedSectionGrading(sectionId);
        if (!result.error) await fetchPeriodData();
    }

    async function handleSubmitGrades() {
        setIsSubmittingGrades(true);
        const result = await submitSectionGrades(sectionId, activePeriodId);
        setIsSubmittingGrades(false);

        const message = result.error?.message ?? result.data?.message;
        if (result.error || !result.data?.success) {
            useToastStore.getState().showToast(message ?? 'Grades could not be submitted to the Registrar.', 'warning');
            return;
        }

        useToastStore.getState().showToast(message ?? 'Grades officially submitted to the Registrar.', 'success');
        await fetchPeriodData();
    }

    const currentPeriod = useMemo(() => {
        return periods.find((p) => p.id === activePeriodId);
    }, [periods, activePeriodId]);

    const isEncodingOpen = useMemo(() => {
        if (!currentPeriod?.grade_encoding_start_date || !currentPeriod?.grade_encoding_end_date) return true;
        const todayStr = new Date().toISOString().split('T')[0];
        return todayStr >= currentPeriod.grade_encoding_start_date && todayStr <= currentPeriod.grade_encoding_end_date;
    }, [currentPeriod]);

    if (periods.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <p className="text-slate-500 text-sm">
                    No grading periods found for this section&apos;s term.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 h-full min-h-0">
            {/* Periods Bar + Thresholds Button */}
            <div className="flex flex-wrap gap-2 items-center justify-between pb-1 border-b border-slate-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                    <CommonTabMenu
                        menuStyle="outline"
                        size="small"
                        tabs={periods.map((p) => ({
                            label: p.weight ? `${p.name} (${p.weight}%)` : p.name,
                            value: p.id
                        }))}
                        value={activePeriodId}
                        onChange={handleTabChange}
                    />
                </div>

                <div className="flex items-center gap-2">
                    {/* Mobile View Switcher (Components vs Grade Sheet) */}
                    <div className="flex md:hidden items-center bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-700">
                        <button
                            type="button"
                            onClick={() => setMobileGradingView('sheet')}
                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                                mobileGradingView === 'sheet'
                                    ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            Grade Sheet ({gradeSheet.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobileGradingView('components')}
                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                                mobileGradingView === 'components'
                                    ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            Components ({components.length})
                        </button>
                    </div>

                    {overridableRules.length > 0 && (
                        <CommonButton
                            size="small"
                            startIcon={<SlidersHorizontalIcon size={14} weight="bold" />}
                            variant="outlined"
                            onClick={() => setIsThresholdOpen(true)}
                        >
                            Thresholds
                        </CommonButton>
                    )}
                </div>
            </div>

            {/* Step 3 Period Schedule & Encoding Window Banner */}
            {currentPeriod && (currentPeriod.major_exam_start_date || currentPeriod.grade_encoding_start_date) && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                        {currentPeriod.major_exam_start_date && (
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">Major Examination Window:</span>
                                <span>{currentPeriod.major_exam_start_date} {currentPeriod.major_exam_end_date ? `to ${currentPeriod.major_exam_end_date}` : ''}</span>
                            </div>
                        )}
                        {currentPeriod.grade_encoding_start_date && (
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">Grade Encoding Range:</span>
                                <span>{currentPeriod.grade_encoding_start_date} {currentPeriod.grade_encoding_end_date ? `to ${currentPeriod.grade_encoding_end_date}` : ''}</span>
                            </div>
                        )}
                    </div>

                    {currentPeriod.grade_encoding_start_date && (
                        <div className="flex items-center gap-1.5">
                            {isEncodingOpen ? (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] flex items-center gap-1">
                                    <CheckCircleIcon className="w-3.5 h-3.5" /> Encoding Open
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 font-semibold text-[11px] flex items-center gap-1">
                                    <WarningCircleIcon className="w-3.5 h-3.5" /> Outside Encoding Window
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Split layout: Components & Grade Sheet */}
            <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
                {/* Grading Components Panel */}
                <div className={`h-full min-h-0 ${mobileGradingView === 'sheet' ? 'hidden md:flex' : 'flex'}`}>
                    <GradingComponentPanel
                        components={components}
                        locked={isLocked || !isEncodingOpen}
                        periodName={periods.find((p) => p.id === activePeriodId)?.name}
                        periodWeight={periods.find((p) => p.id === activePeriodId)?.weight}
                        onBatchSave={handleBatchSave}
                        onCreate={handleCreate}
                        onDelete={handleDelete}
                        onReseed={handleReseed}
                        onUpdate={handleUpdate}
                    />
                </div>

                {/* Grade Sheet Panel */}
                <div className={`flex-1 h-full min-h-0 ${mobileGradingView === 'components' ? 'hidden md:flex' : 'flex'}`}>
                    <GradeSheetPanel
                        calculationFailures={calculationFailures}
                        components={components}
                        courseCode={courseCode}
                        courseTitle={courseTitle}
                        gradeSheet={gradeSheet}
                        gradingPeriodId={activePeriodId}
                        isEncodingOpen={isEncodingOpen}
                        isFlagBusy={isFlagBusy}
                        isSubmittingGrades={isSubmittingGrades}
                        periodName={periods.find((p) => p.id === activePeriodId)?.name}
                        sectionCode={sectionCode}
                        specialGradeFlags={specialGradeFlags}
                        onApplyFlag={handleApplyFlag}
                        onCalculate={handleCalculate}
                        onDismissFailures={handleDismissFailures}
                        onDismissFlag={handleRequestDismissFlag}
                        onSubmitGrades={handleSubmitGrades}
                    />
                </div>
            </div>

            <SectionThresholdModal
                open={isThresholdOpen}
                rules={overridableRules}
                sectionId={sectionId}
                onClose={() => setIsThresholdOpen(false)}
                onSaved={fetchOverridableRules}
            />

            <SpecialGradeFlagModal
                flag={flagPendingDismissal}
                isBusy={isFlagBusy}
                open={Boolean(flagPendingDismissal)}
                onClose={() => setFlagPendingDismissal(null)}
                onConfirm={handleConfirmDismissFlag}
            />


        </div>
    );
}