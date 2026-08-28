import CommonCard from '@components/card/CommonCard';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import PeriodsTab from '@pages/admin/grading-config-management/PeriodsTab';
import SpecialGradesTab from '@pages/admin/grading-config-management/SpecialGradesTab';
import TransmutationTab from '@pages/admin/grading-config-management/TransmutationTab';
import {
    deleteSpecialGradeConfig, getSpecialGradeConfigs, getTransmutationTable, saveSpecialGradeConfigs, saveTransmutationTable
} from '@services/grading-config.service';
import { SpecialGradeConfig, TransmutationRow } from '@type/grading-config.type';
import { SyntheticEvent, useEffect, useState } from 'react';

type GradingTab = 'transmutation' | 'periods' | 'special';

const TABS = [
    { label: 'Transmutation', value: 'transmutation' },
    { label: 'Periods', value: 'periods' },
    { label: 'Special Grades', value: 'special' }
];

export default function GradingConfiguration() {
    const [activeTab, setActiveTab] = useState<GradingTab>('transmutation');
    const [tabLoading, setTabLoading] = useState(true);
    const [initialTransmutationRows, setInitialTransmutationRows] = useState<TransmutationRow[]>([]);
    const [specialGrades, setSpecialGrades] = useState<SpecialGradeConfig[]>([]);
    const [savedSpecialGrades, setSavedSpecialGrades] = useState('[]');
    const [isSavingTransmutation, setIsSavingTransmutation] = useState(false);
    const [isSavingSpecial, setIsSavingSpecial] = useState(false);

    useEffect(function() {
        let isActive = true;

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

        async function loadSpecial() {
            const result = await getSpecialGradeConfigs();
            if (isActive) {
                const loaded = (result.data ?? []).map((sg) => ({
                    ...sg,
                    min_absence_percentage: String(sg.min_absence_percentage ?? ''),
                    completion_deadline_days: String(sg.completion_deadline_days ?? '')
                }));

                setSpecialGrades(loaded);
                setSavedSpecialGrades(JSON.stringify(loaded));
            }
        }

        async function loadActiveTab() {
            setTabLoading(true);

            if (activeTab === 'transmutation') {
                await loadTransmutation();
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

    async function handleSaveTransmutation(rows: TransmutationRow[]) {
        setIsSavingTransmutation(true);
        await saveTransmutationTable(rows);
        setIsSavingTransmutation(false);
    }

    async function handleSaveSpecial() {
        setIsSavingSpecial(true);
        const result = await saveSpecialGradeConfigs(specialGrades);
        setIsSavingSpecial(false);

        if (!result.error) {
            setSavedSpecialGrades(JSON.stringify(specialGrades));
        }
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
        if (grade.id) {
            await deleteSpecialGradeConfig(grade.id);

            const snapshot = JSON.parse(savedSpecialGrades) as SpecialGradeConfig[];

            setSavedSpecialGrades(JSON.stringify(snapshot.filter((sg) => sg.id !== grade.id)));
        }

        setSpecialGrades((prev) => prev.filter((_, i) => i !== index));
    }

    function updateSpecialGrade(index: number, field: keyof SpecialGradeConfig, value: string | boolean | number | null) {
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
                {!tabLoading && activeTab === 'transmutation' && (
                    <TransmutationTab
                        initialRows={initialTransmutationRows}
                        isSaving={isSavingTransmutation}
                        onSave={handleSaveTransmutation}
                    />
                )}
                {!tabLoading && activeTab === 'periods' && (
                    <PeriodsTab />
                )}
                {!tabLoading && activeTab === 'special' && (
                    <SpecialGradesTab
                        grades={specialGrades}
                        isDirty={JSON.stringify(specialGrades) !== savedSpecialGrades}
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