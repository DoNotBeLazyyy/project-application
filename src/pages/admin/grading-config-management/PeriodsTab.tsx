import { MenuOption } from '@components/table/TableActionCell';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { TableActionConfig } from '@components/table/useTableConfigs';
import PeriodModalForm, { PeriodFormValues } from '@pages/admin/grading-config-management/PeriodModalForm';
import { createGradingPeriodTemplate, deleteGradingPeriodTemplate, getGradingPeriodTemplates, updateGradingPeriodTemplate } from '@services/grading-config.service';
import { useToastStore } from '@stores/toast.store';
import { CommonListResDto } from '@type/http.type';
import { GradingPeriodTemplate } from '@type/grading-config.type';
import { ColDef } from 'ag-grid-community';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

const CREATE_FORM_ID = 'period-form-create';
const UPDATE_FORM_ID = 'period-form-update';

const DEFAULT_VALUES: PeriodFormValues = {
    name: '',
    weight: '',
    components: [{ name: '', weight: '' }]
};

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

function buildPeriodListDto(content: GradingPeriodTemplate[]): CommonListResDto<GradingPeriodTemplate> {
    const size = content.length || 1;

    return {
        content,
        empty: content.length === 0,
        first: true,
        last: true,
        number: 0,
        numberOfElements: content.length,
        pageable: {
            offset: 0,
            paged: true,
            pageNumber: 0,
            pageSize: size,
            sort: { empty: true, sorted: false, unsorted: true },
            unpaged: false
        },
        size,
        sort: { empty: true, sorted: false, unsorted: true },
        totalElements: content.length,
        totalPages: 1
    };
}

export default function PeriodsTab() {
    const [periods, setPeriods] = useState<GradingPeriodTemplate[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);

    const periodWeightTotal = periods.reduce(
        (sum, p) => sum + Number(p.weight || 0), 0
    );

    const remainingWeight = Math.max(0, 100 - periodWeightTotal);
    const selectedPeriod = periods.find((p) => p.id === selectedId);
    const updateRemainingWeight = selectedPeriod
        ? Math.max(0, 100 - (periodWeightTotal - Number(selectedPeriod.weight || 0)))
        : 100;

    const createMethods = useForm<PeriodFormValues>({
        defaultValues: DEFAULT_VALUES,
        mode: 'all'
    });

    const updateMethods = useForm<PeriodFormValues>({
        defaultValues: DEFAULT_VALUES,
        mode: 'all'
    });

    function triggerRefresh() {
        setRefreshKey((prev) => prev + 1);
    }

    function handleOpenCreate() {
        if (periodWeightTotal >= 100) {
            useToastStore.getState()
                .showToast('Grading periods already total 100%. You cannot add another period.', 'warning');
            return;
        }
        setIsCreateOpen(true);
    }

    async function fetchPeriods() {
        const result = await getGradingPeriodTemplates();
        if (!result.data) {
            return { data: null, error: result.error };
        }
        const mapped = mapPeriodTemplates(result.data);
        setPeriods(mapped);

        return { data: buildPeriodListDto(mapped), error: null };
    }

    function loadIntoForm(id: string) {
        const period = periods.find((p) => p.id === id);
        if (!period) {
            return;
        }
        updateMethods.reset({
            name: period.name,
            weight: period.weight,
            components: period.components.length
                ? period.components
                : [{ name: '', weight: '' }]
        });
    }

    function handleOpenView(id: string) {
        setSelectedId(id);
        loadIntoForm(id);
        setIsViewOpen(true);
    }

    function handleCloseView() {
        setIsViewOpen(false);
        setSelectedId(null);
        updateMethods.reset(DEFAULT_VALUES);
    }

    function handleOpenUpdate(id: string) {
        setSelectedId(id);
        loadIntoForm(id);
        setIsUpdateOpen(true);
    }

    function handleSwitchToEdit() {
        setIsViewOpen(false);
        setIsUpdateOpen(true);
    }

    function handleCloseUpdate() {
        setIsUpdateOpen(false);
        setSelectedId(null);
        updateMethods.reset(DEFAULT_VALUES);
    }

    async function handleCreate(values: PeriodFormValues) {
        const result = await createGradingPeriodTemplate({
            name: values.name,
            sequence: periods.length + 1,
            weight: values.weight,
            components: values.components
        });
        if (!result.error) {
            createMethods.reset(DEFAULT_VALUES);
            setIsCreateOpen(false);
            triggerRefresh();
        }
    }

    async function handleUpdate(values: PeriodFormValues) {
        if (!selectedId) {
            return;
        }
        const selectedPeriod = periods.find((p) => p.id === selectedId);
        const result = await updateGradingPeriodTemplate(selectedId, {
            name: values.name,
            sequence: selectedPeriod?.sequence ?? 1,
            weight: values.weight,
            components: values.components
        });
        if (!result.error) {
            handleCloseUpdate();
            triggerRefresh();
        }
    }

    async function handleDeleteRow(id: string) {
        return deleteGradingPeriodTemplate(id);
    }

    const columnDefs = useMemo<ColDef<GradingPeriodTemplate>[]>(function() {
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
                flex: 3,
                headerName: 'Components',
                sortable: false,
                valueGetter: (params) => params.data?.components?.length
                    ? params.data.components
                        .map((c) => `${c.name} (${c.weight}%)`)
                        .join(' · ')
                    : '—'
            }
        ];
    }, []);

    const tableActionConfig = useMemo(function() {
        return function(onDelete: (id: string) => void): TableActionConfig<GradingPeriodTemplate> {
            return {
                onEditClick: (row: GradingPeriodTemplate) => function() {
                    if (row.id) {
                        handleOpenUpdate(row.id);
                    }
                },
                menuOptions: (row: GradingPeriodTemplate): MenuOption[] => [
                    {
                        preset: 'view',
                        onClick: () => row.id && handleOpenView(row.id)
                    },
                    {
                        preset: 'edit',
                        onClick: () => row.id && handleOpenUpdate(row.id)
                    },
                    {
                        preset: 'delete',
                        onClick: () => row.id && onDelete(row.id)
                    }
                ]
            };
        };
    }, [periods]);

    return (
        <CommonTableCard<GradingPeriodTemplate>
            cardHeaderProps={{
                subheader: `Total weight: ${periodWeightTotal}%${periodWeightTotal === 100
                    ? ' ✓'
                    : ' (should equal 100%)'}`,
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
                        maxWeight={remainingWeight}
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
            dependencies={[refreshKey]}
            tableActionConfig={tableActionConfig}
            tableProps={{
                leadingColumnDefs: columnDefs
            }}
            uniqueIdKey="id"
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
                        maxWeight={updateRemainingWeight}
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
            onCreate={handleOpenCreate}
            onDeleteRow={handleDeleteRow}
            onFetch={fetchPeriods}
            onRowClick={handleOpenView}
        />
    );
}