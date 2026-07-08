import CommonButton from '@components/button/CommonButton';
import CommonTableCard from '@components/table-card/CommonTableCard';
import PeriodModalForm, { PeriodFormValues } from '@pages/admin/grading-config-management/PeriodModalForm';
import { EyeIcon, PencilIcon, TrashIcon } from '@phosphor-icons/react';
import { GradingPeriodTemplate } from '@type/grading-config.type';
import { ColDef } from 'ag-grid-community';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

const CREATE_FORM_ID = 'period-form-create';
const UPDATE_FORM_ID = 'period-form-update';

type PeriodRow = GradingPeriodTemplate & { _index: number };

const DEFAULT_VALUES: PeriodFormValues = {
    name: '',
    weight: '',
    components: [{ name: '', weight: '' }]
};

interface PeriodsTabProps {
    periods: GradingPeriodTemplate[];
    onAddPeriod: (values: PeriodFormValues) => Promise<boolean>;
    onDeletePeriod: (index: number) => Promise<boolean>;
    onUpdatePeriod: (index: number, values: PeriodFormValues) => Promise<boolean>;
}

export default function PeriodsTab({
    periods,
    onAddPeriod,
    onDeletePeriod,
    onUpdatePeriod
}: PeriodsTabProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const periodWeightTotal = periods.reduce(
        (sum, p) => sum + Number(p.weight || 0), 0
    );

    const createMethods = useForm<PeriodFormValues>({
        defaultValues: DEFAULT_VALUES,
        mode: 'all'
    });

    const updateMethods = useForm<PeriodFormValues>({
        defaultValues: DEFAULT_VALUES,
        mode: 'all'
    });

    function loadIntoForm(index: number) {
        const period = periods[index];
        updateMethods.reset({
            name: period.name,
            weight: period.weight,
            components: period.components.length
                ? period.components
                : [{ name: '', weight: '' }]
        });
    }

    function handleOpenView(index: number) {
        setSelectedIndex(index);
        loadIntoForm(index);
        setIsViewOpen(true);
    }

    function handleCloseView() {
        setIsViewOpen(false);
        setSelectedIndex(null);
        updateMethods.reset(DEFAULT_VALUES);
    }

    function handleOpenUpdate(index: number) {
        setSelectedIndex(index);
        loadIntoForm(index);
        setIsUpdateOpen(true);
    }

    function handleSwitchToEdit() {
        setIsViewOpen(false);
        setIsUpdateOpen(true);
    }

    function handleCloseUpdate() {
        setIsUpdateOpen(false);
        setSelectedIndex(null);
        updateMethods.reset(DEFAULT_VALUES);
    }

    async function handleCreate(values: PeriodFormValues) {
        const saved = await onAddPeriod(values);
        if (saved) {
            createMethods.reset(DEFAULT_VALUES);
            setIsCreateOpen(false);
        }
    }

    async function handleUpdate(values: PeriodFormValues) {
        if (selectedIndex === null) {
            return;
        }
        const saved = await onUpdatePeriod(selectedIndex, values);
        if (saved) {
            handleCloseUpdate();
        }
    }

    const columnDefs = useMemo<ColDef<PeriodRow>[]>(function() {
        return [
            {
                field: 'name',
                flex: 2,
                headerName: 'Period Name',
                sortable: false
            },
            {
                flex: 1,
                headerName: 'Weight (%)',
                sortable: false,
                valueGetter: (params) => params.data
                    ? `${params.data.weight}%`
                    : '—'
            },
            {
                flex: 2,
                headerName: 'Components',
                sortable: false,
                valueGetter: (params) => params.data?.components?.length
                    ? params.data.components
                        .map((c) => `${c.name} (${c.weight}%)`)
                        .join(' · ')
                    : '—'
            },
            {
                headerName: '',
                maxWidth: 120,
                minWidth: 120,
                sortable: false,
                cellRenderer: (params: { data: PeriodRow }) => (
                    <div className="flex gap-1 h-full items-center">
                        <CommonButton
                            color="primary"
                            size="small"
                            onClick={function() {
                                handleOpenView(params.data._index);
                            }}
                        >
                            <EyeIcon
                                size={14}
                                weight="bold"
                            />
                        </CommonButton>
                        <CommonButton
                            color="primary"
                            size="small"
                            onClick={function() {
                                handleOpenUpdate(params.data._index);
                            }}
                        >
                            <PencilIcon
                                size={14}
                                weight="bold"
                            />
                        </CommonButton>
                        <CommonButton
                            color="error"
                            size="small"
                            onClick={function() {
                                onDeletePeriod(params.data._index);
                            }}
                        >
                            <TrashIcon
                                size={14}
                                weight="bold"
                            />
                        </CommonButton>
                    </div>
                )
            }
        ];
    }, [onDeletePeriod]);

    const rowData = useMemo<PeriodRow[]>(function() {
        return periods.map((p, index) => ({ ...p, _index: index }));
    }, [periods]);

    return (
        <CommonTableCard<PeriodRow>
            cardHeaderProps={{
                subheader: `Total weight: ${periodWeightTotal}%${periodWeightTotal === 100
                    ? ' ✓'
                    : ' (must equal 100%)'}`,
                title: 'Grading Periods'
            }}
            createModalProps={{
                cardProps: {
                    cardHeaderProps: {
                        title: 'Add Grading Period',
                        subheader: 'Define a new grading period and its components.'
                    }
                },
                formId: CREATE_FORM_ID,
                formContent: (
                    <PeriodModalForm
                        formId={CREATE_FORM_ID}
                        methods={createMethods}
                        onSubmit={handleCreate}
                    />
                ),
                open: isCreateOpen,
                onClose: function() {
                    createMethods.reset(DEFAULT_VALUES);
                    setIsCreateOpen(false);
                }
            }}
            tableProps={{
                leadingColumnDefs: columnDefs,
                rowData
            }}
            uniqueIdKey="_index"
            updateModalProps={{
                cardProps: {
                    cardHeaderProps: {
                        title: 'Edit Grading Period',
                        subheader: 'Update this grading period and its components.'
                    }
                },
                confirmText: 'Save',
                formId: UPDATE_FORM_ID,
                formContent: (
                    <PeriodModalForm
                        formId={UPDATE_FORM_ID}
                        methods={updateMethods}
                        onSubmit={handleUpdate}
                    />
                ),
                onConfirmClose: function() {
                    const current = updateMethods.getValues();
                    const snapshot = updateMethods.formState.defaultValues;
                    return JSON.stringify(current) === JSON.stringify(snapshot);
                },
                open: isUpdateOpen,
                onClose: handleCloseUpdate
            }}
            viewModalProps={{
                cardProps: {
                    cardHeaderProps: {
                        title: 'View Grading Period',
                        subheader: 'Viewing grading period details.'
                    }
                },
                confirmText: 'Edit',
                formContent: (
                    <PeriodModalForm
                        disabled
                        methods={updateMethods}
                        onSubmit={handleUpdate}
                    />
                ),
                formButtonsProps: {
                    confirmProps: {
                        onClick: handleSwitchToEdit
                    }
                },
                open: isViewOpen,
                onClose: handleCloseView
            }}
            onCreate={function() {
                setIsCreateOpen(true);
            }}
            onRowClick={function(id) {
                const index = rowData.find((r) => String(r._index) === id)?._index;
                if (index !== undefined) {
                    handleOpenView(index);
                }
            }}
        />
    );
}