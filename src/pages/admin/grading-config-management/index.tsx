import CommonCard from '@components/card/CommonCard';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import GeneralTab from '@pages/admin/grading-config-management/GeneralTab';
import PeriodsTab from '@pages/admin/grading-config-management/PeriodsTab';
import { PeriodFormValues } from '@pages/admin/grading-config-management/PeriodModalForm';
import SpecialGradesTab from '@pages/admin/grading-config-management/SpecialGradesTab';
import TransmutationTab from '@pages/admin/grading-config-management/TransmutationTab';
import {
    createGradingPeriodTemplate, deleteGradingPeriodTemplate, deleteSpecialGradeConfig, getGradingConfig, getGradingPeriodTemplates, getSpecialGradeConfigs, getTransmutationTable, saveSpecialGradeConfigs, saveTransmutationTable, updateGradingConfig, updateGradingPeriodTemplate
} from '@services/grading-config.service';
import { GradingConfigFormValues, GradingPeriodTemplate, SpecialGradeConfig, TransmutationRow } from '@type/grading-config.type';
import { SyntheticEvent, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

type GradingTab = 'general' | 'transmutation' | 'periods' | 'special';

function mapPeriodTemplates(periods: GradingPeriodTemplate[]): GradingPeriodTemplate[] {
    return periods.map((period) => ({
        ...period,
        weight: String(period.weight),
        components: period.components.map((comp) => ({
            ...comp,
            weight: String(comp.weight)
        }))
    }));
}

const TABS = [
    { label: 'General', value: 'general' },
    { label: 'Transmutation', value: 'transmutation' },
    { label: 'Periods', value: 'periods' },
    { label: 'Special Grades', value: 'special' }
];

export default function GradingConfiguration() {
    const [activeTab, setActiveTab] = useState<GradingTab>('general');
    const [tabLoading, setTabLoading] = useState(true);
    const [initialTransmutationRows, setInitialTransmutationRows] = useState<TransmutationRow[]>([]);
    const [periodTemplates, setPeriodTemplates] = useState<GradingPeriodTemplate[]>([]);
    const [specialGrades, setSpecialGrades] = useState<SpecialGradeConfig[]>([]);
    const [isSavingTransmutation, setIsSavingTransmutation] = useState(false);
    const [isSavingSpecial, setIsSavingSpecial] = useState(false);

    const configMethods = useForm<GradingConfigFormValues>({
        defaultValues: { passing_grade: '3.0', max_absence_percentage: '20' }
    });

    useEffect(function() {
        let isActive = true;

        async function loadGeneral() {
            const result = await getGradingConfig();
            if (isActive && result.data) {
                configMethods.reset({
                    passing_grade: String(result.data.passing_grade),
                    max_absence_percentage: String(result.data.max_absence_percentage)
                });
            }
        }

        async function loadTransmutation() {
            const result = await getTransmutationTable();
            if (isActive) {
                setInitialTransmutationRows(
                    (result.data ?? []).map((row) => ({
                        ...row,
                        min_percentage: String(row.min_percentage),
                        max_percentage: String(row.max_percentage),
                        transmuted_grade: String(row.transmuted_grade),
                        description: row.description ?? ''
                    }))
                );
            }
        }

        async function loadPeriods() {
            const result = await getGradingPeriodTemplates();
            if (isActive) {
                setPeriodTemplates(mapPeriodTemplates(result.data ?? []));
            }
        }

        async function loadSpecial() {
            const result = await getSpecialGradeConfigs();
            if (isActive) {
                setSpecialGrades((result.data ?? []).map((sg) => ({
                    ...sg,
                    min_absence_percentage: String(sg.min_absence_percentage ?? ''),
                    completion_deadline_days: String(sg.completion_deadline_days ?? '')
                })));
            }
        }

        async function loadActiveTab() {
            setTabLoading(true);

            if (activeTab === 'general') {
                await loadGeneral();
            }
            else if (activeTab === 'transmutation') {
                await loadTransmutation();
            }
            else if (activeTab === 'periods') {
                await loadPeriods();
            }
            else if (activeTab === 'special') {
                await loadSpecial();
            }

            if (isActive) {
                setTabLoading(false);
            }
        }

        loadActiveTab();

        return function() {
            isActive = false;
        };
    }, [activeTab]);

    function handleTabChange(_: SyntheticEvent, value: string) {
        setActiveTab(value as GradingTab);
    }

    async function handleSaveConfig(values: GradingConfigFormValues) {
        await updateGradingConfig(values);
        configMethods.reset(values);
    }

    async function handleSaveTransmutation(rows: TransmutationRow[]) {
        setIsSavingTransmutation(true);
        await saveTransmutationTable(rows);
        setIsSavingTransmutation(false);
    }

    async function reloadPeriods() {
        const refreshed = await getGradingPeriodTemplates();
        setPeriodTemplates(mapPeriodTemplates(refreshed.data ?? []));
    }

    async function handleAddPeriod(values: PeriodFormValues): Promise<boolean> {
        const result = await createGradingPeriodTemplate({
            name: values.name,
            sequence: periodTemplates.length + 1,
            weight: values.weight,
            components: values.components
        });
        if (result.error) {
            return false;
        }
        await reloadPeriods();
        return true;
    }

    async function handleUpdatePeriod(index: number, values: PeriodFormValues): Promise<boolean> {
        const target = periodTemplates[index];
        if (!target?.id) {
            return false;
        }
        const result = await updateGradingPeriodTemplate(target.id, {
            ...target,
            name: values.name,
            weight: values.weight,
            components: values.components
        });
        if (result.error) {
            return false;
        }
        await reloadPeriods();
        return true;
    }

    async function handleDeletePeriod(index: number): Promise<boolean> {
        const target = periodTemplates[index];
        if (!target?.id) {
            return false;
        }
        const result = await deleteGradingPeriodTemplate(target.id);
        if (result.error) {
            return false;
        }
        await reloadPeriods();
        return true;
    }

    async function handleSaveSpecial() {
        setIsSavingSpecial(true);
        await saveSpecialGradeConfigs(specialGrades);
        setIsSavingSpecial(false);
    }

    function addSpecialGrade() {
        setSpecialGrades((prev) => [
            ...prev,
            {
                code: '',
                label: '',
                description: '',
                min_absence_percentage: '',
                requires_completion: false,
                completion_deadline_days: '',
                is_passing: false,
                is_active: true
            }
        ]);
    }

    async function removeSpecialGrade(index: number) {
        const grade = specialGrades[index];
        if (grade.id) await deleteSpecialGradeConfig(grade.id);
        setSpecialGrades((prev) => prev.filter((_, i) => i !== index));
    }

    function updateSpecialGrade(index: number, field: keyof SpecialGradeConfig, value: string | boolean) {
        setSpecialGrades((prev) => prev.map((grade, i) =>
            i === index
                ? { ...grade, [field]: value }
                : grade));
    }

    return (
        <CommonCard
            cardHeaderProps={{
                subheader: 'Configure system-wide grading rules, transmutation tables, and period templates.',
                title: 'Grading Configuration'
            }}
            className="flex flex-col gap-4 h-full p-4 w-full"
        >
            <CommonTabMenu
                menuStyle="outline"
                tabs={TABS}
                value={activeTab}
                onChange={handleTabChange}
            />
            <div className="flex-1 min-h-0 overflow-y-auto">
                {tabLoading && (
                    <div className="flex h-full items-center justify-center">
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            Loading...
                        </span>
                    </div>
                )}
                {!tabLoading && activeTab === 'general' && (
                    <GeneralTab
                        methods={configMethods}
                        onSubmit={handleSaveConfig}
                    />
                )}
                {!tabLoading && activeTab === 'transmutation' && (
                    <TransmutationTab
                        initialRows={initialTransmutationRows}
                        isSaving={isSavingTransmutation}
                        onSave={handleSaveTransmutation}
                    />
                )}
                {!tabLoading && activeTab === 'periods' && (
                    <PeriodsTab
                        periods={periodTemplates}
                        onAddPeriod={handleAddPeriod}
                        onDeletePeriod={handleDeletePeriod}
                        onUpdatePeriod={handleUpdatePeriod}
                    />
                )}
                {!tabLoading && activeTab === 'special' && (
                    <SpecialGradesTab
                        grades={specialGrades}
                        isSaving={isSavingSpecial}
                        onAddGrade={addSpecialGrade}
                        onRemoveGrade={removeSpecialGrade}
                        onSave={handleSaveSpecial}
                        onUpdateGrade={updateSpecialGrade}
                    />
                )}
            </div>
        </CommonCard>
    );
}