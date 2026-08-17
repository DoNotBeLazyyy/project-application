import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import GradeSheetPanel from '@pages/faculty/sections/grading/GradeSheetPanel';
import GradingComponentPanel from '@pages/faculty/sections/grading/GradingComponentPanel';
import {
    calculateAllGradesForPeriod,
    createGradingComponent,
    deleteGradingComponent,
    isSectionGradingLocked,
    listGradeSheet,
    listGradingComponents,
    listGradingPeriodsBySection,
    reseedSectionGrading,
    updateGradingComponent
} from '@services/faculty.service';
import {
    GradeCalculationFailure,
    GradeSheetRow,
    GradingComponent,
    GradingComponentFormValues,
    GradingPeriod
} from '@type/faculty.type';
import { SyntheticEvent, useEffect, useState } from 'react';

interface GradingTabProps {
    sectionId: string;
}

export default function GradingTab({ sectionId }: GradingTabProps) {
    const [periods, setPeriods] = useState<GradingPeriod[]>([]);
    const [activePeriodId, setActivePeriodId] = useState('');
    const [components, setComponents] = useState<GradingComponent[]>([]);
    const [calculationFailures, setCalculationFailures] = useState<GradeCalculationFailure[]>([]);
    const [gradeSheet, setGradeSheet] = useState<GradeSheetRow[]>([]);
    const [isLocked, setIsLocked] = useState(false);

    useEffect(function() {
        async function fetchPeriods() {
            const result = await listGradingPeriodsBySection(sectionId);

            if (result.data && result.data.length > 0) {
                setPeriods(result.data);
                setActivePeriodId(result.data[0].id);
            }
        }

        fetchPeriods();
    }, [sectionId]);

    useEffect(function() {
        if (!activePeriodId) return;
        fetchPeriodData();
    }, [sectionId, activePeriodId]);

    async function fetchPeriodData() {
        const [componentsResult, gradeSheetResult, lockedResult] = await Promise.all([
            listGradingComponents(sectionId, activePeriodId),
            listGradeSheet(sectionId, activePeriodId),
            isSectionGradingLocked(sectionId, activePeriodId)
        ]);

        if (componentsResult.data) setComponents(componentsResult.data);
        if (gradeSheetResult.data) setGradeSheet(gradeSheetResult.data);
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

    async function handleCalculate() {
        const result = await calculateAllGradesForPeriod(sectionId, activePeriodId);

        if (result.error) {
            return;
        }

        setCalculationFailures(result.data?.failures ?? []);
        await fetchPeriodData();
    }

    function handleDismissFailures() {
        setCalculationFailures([]);
    }

    async function handleReseed() {
        const result = await reseedSectionGrading(sectionId);
        if (!result.error) await fetchPeriodData();
    }

    if (periods.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <p className="text-(--mui-palette-text-secondary) text-sm">
                    No grading periods found for this section&apos;s term.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTabMenu
                menuStyle="outline"
                size="small"
                tabs={periods.map((p) => ({ label: p.name, value: p.id }))}
                value={activePeriodId}
                onChange={handleTabChange}
            />
            <div className="flex gap-4 flex-1 min-h-0">
                <GradingComponentPanel
                    components={components}
                    locked={isLocked}
                    onCreate={handleCreate}
                    onDelete={handleDelete}
                    onReseed={handleReseed}
                    onUpdate={handleUpdate}
                />
                <GradeSheetPanel
                    calculationFailures={calculationFailures}
                    components={components}
                    gradeSheet={gradeSheet}
                    onCalculate={handleCalculate}
                    onDismissFailures={handleDismissFailures}
                />
            </div>
        </div>
    );
}