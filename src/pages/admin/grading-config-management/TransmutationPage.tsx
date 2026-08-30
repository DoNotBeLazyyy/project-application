import PageLoadingFallback from '@components/loading/PageLoadingFallback';
import TransmutationTab from '@pages/admin/grading-config-management/TransmutationTab';
import { getTransmutationTable, saveTransmutationTable } from '@services/grading-config.service';
import { TransmutationRow } from '@type/grading-config.type';
import { useEffect, useState } from 'react';

export default function TransmutationPage() {
    const [loading, setLoading] = useState(true);
    const [initialRows, setInitialRows] = useState<TransmutationRow[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(function() {
        let isActive = true;

        async function loadData() {
            setLoading(true);
            const result = await getTransmutationTable();

            if (isActive) {
                setInitialRows(
                    (result.data ?? []).map((row) => ({
                        ...row,
                        description: row.description ?? '',
                        max_percentage: String(row.max_percentage),
                        min_percentage: String(row.min_percentage),
                        transmuted_grade: String(row.transmuted_grade)
                    }))
                );
                setLoading(false);
            }
        }

        loadData();

        return function() {
            isActive = false;
        };
    }, []);

    async function handleSave(rows: TransmutationRow[]) {
        setIsSaving(true);
        await saveTransmutationTable(rows);
        setIsSaving(false);
    }

    if (loading) {
        return <PageLoadingFallback />;
    }

    return (
        <TransmutationTab
            initialRows={initialRows}
            isSaving={isSaving}
            onSave={handleSave}
        />
    );
}