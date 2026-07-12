import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonModal from '@components/modal/CommonModal';
import CommonTable from '@components/table/CommonTable';
import {
    ArrowsClockwiseIcon, LockIcon, PencilIcon, PlusIcon, TrashIcon
} from '@phosphor-icons/react';
import { GradingComponent, GradingComponentFormValues } from '@type/faculty.type';
import { ColDef } from 'ag-grid-community';
import { FieldErrors, useForm } from 'react-hook-form';
import { formErrors } from '@utils/form.util';
import { useMemo, useState } from 'react';

const CREATE_FORM_ID = 'create-component-form';
const UPDATE_FORM_ID = 'update-component-form';

const defaultFormValues: GradingComponentFormValues = {
    name: '',
    weight: ''
};

const componentFields: FormFieldConfig<GradingComponentFormValues>[] = [
    {
        name: 'name',
        rules: { required: 'Required' },
        type: 'text'
    },
    {
        name: 'weight',
        rules: {
            required: 'Required',
            min: { value: 1, message: 'Must be at least 1' },
            max: { value: 100, message: 'Cannot exceed 100' }
        },
        type: 'number'
    }
];

interface GradingComponentPanelProps {
    components: GradingComponent[];
    locked: boolean;
    onCreate: (values: GradingComponentFormValues) => Promise<void>;
    onDelete: (componentId: string) => Promise<void>;
    onReseed: () => Promise<void>;
    onUpdate: (componentId: string, values: GradingComponentFormValues) => Promise<void>;
}

export default function GradingComponentPanel({
    components,
    locked,
    onCreate,
    onDelete,
    onReseed,
    onUpdate
}: GradingComponentPanelProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [selectedId, setSelectedId] = useState('');

    const createMethods = useForm<GradingComponentFormValues>({ defaultValues: defaultFormValues });
    const updateMethods = useForm<GradingComponentFormValues>({ defaultValues: defaultFormValues });

    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);

    async function handleCreateSubmit(values: GradingComponentFormValues) {
        await onCreate(values);
        createMethods.reset(defaultFormValues);
        setIsCreateOpen(false);
    }

    function handleCreateError(errors: FieldErrors<GradingComponentFormValues>) {
        formErrors(errors, createMethods);
    }

    function handleOpenUpdate(component: GradingComponent) {
        setSelectedId(component.id);
        updateMethods.reset({ name: component.name, weight: String(component.weight) });
        setIsUpdateOpen(true);
    }

    async function handleUpdateSubmit(values: GradingComponentFormValues) {
        await onUpdate(selectedId, values);
        updateMethods.reset(defaultFormValues);
        setIsUpdateOpen(false);
        setSelectedId('');
    }

    function handleUpdateError(errors: FieldErrors<GradingComponentFormValues>) {
        formErrors(errors, updateMethods);
    }

    const columnDefs = useMemo<ColDef<GradingComponent>[]>(function() {
        return [
            {
                field: 'name',
                flex: 3,
                headerName: 'Component',
                sortable: false
            },
            {
                field: 'weight',
                flex: 1,
                headerName: 'Weight (%)',
                sortable: false,
                valueFormatter: (params) => `${params.value}%`
            },
            {
                headerName: '',
                maxWidth: 80,
                minWidth: 80,
                sortable: false,
                cellRenderer: (params: { data: GradingComponent }) => (
                    <div className="flex gap-1 h-full items-center justify-center">
                        <CommonButton
                            color="primary"
                            disabled={locked}
                            size="small"
                            onClick={function() {
                                handleOpenUpdate(params.data);
                            }}
                        >
                            <PencilIcon size={14} weight="bold" />
                        </CommonButton>
                        <CommonButton
                            color="error"
                            disabled={locked}
                            size="small"
                            onClick={function() {
                                onDelete(params.data.id);
                            }}
                        >
                            <TrashIcon size={14} weight="bold" />
                        </CommonButton>
                    </div>
                )
            }
        ];
    }, [locked, onDelete]);

    return (
        <div className="flex flex-col gap-3 w-72 flex-shrink-0">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Components
                    </span>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        Total: {totalWeight}%
                    </span>
                </div>
                <CommonButton
                    disabled={locked || totalWeight >= 100}
                    size="small"
                    startIcon={<PlusIcon size={14} weight="bold" />}
                    variant="contained"
                    onClick={function() {
                        setIsCreateOpen(true);
                    }}
                >
                    Add
                </CommonButton>
            </div>
            {locked
                ? (
                    <div className="flex gap-2 items-start rounded-md bg-(--mui-palette-action-hover) p-2">
                        <LockIcon
                            className="mt-0.5 text-(--mui-palette-text-secondary)"
                            size={14}
                            weight="bold"
                        />
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                        Locked: grades have been recorded for this period, so components can no longer be changed.
                        </span>
                    </div>
                )
                : null}
            {!locked && components.length === 0
                ? (
                    <CommonButton
                        size="small"
                        startIcon={<ArrowsClockwiseIcon size={14} weight="bold" />}
                        variant="outlined"
                        onClick={onReseed}
                    >
                    Reset to institutional template
                    </CommonButton>
                )
                : null}
            <div className="flex-1 min-h-0">
                <CommonTable<GradingComponent>
                    leadingColumnDefs={columnDefs}
                    rowData={components}
                />
            </div>

            <CommonModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: 'Add a grading component for this period.',
                        title: 'Add Grading Component'
                    }
                }}
                open={isCreateOpen}
                onClose={function() {
                    createMethods.reset(defaultFormValues);
                    setIsCreateOpen(false);
                }}
            >
                <div className="flex flex-col gap-4 w-80">
                    <CommonForm
                        containerClassName="flex flex-col gap-4"
                        control={createMethods.control}
                        fields={componentFields}
                        formProps={{
                            id: CREATE_FORM_ID,
                            onSubmit: createMethods.handleSubmit(handleCreateSubmit, handleCreateError)
                        }}
                    />
                    <div className="flex gap-2 justify-end">
                        <CommonButton
                            color="inherit"
                            size="small"
                            variant="outlined"
                            onClick={function() {
                                createMethods.reset(defaultFormValues);
                                setIsCreateOpen(false);
                            }}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton form={CREATE_FORM_ID} size="small" type="submit" variant="contained">
                            Add
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>

            <CommonModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: 'Update this grading component.',
                        title: 'Edit Grading Component'
                    }
                }}
                open={isUpdateOpen}
                onClose={function() {
                    updateMethods.reset(defaultFormValues);
                    setIsUpdateOpen(false);
                    setSelectedId('');
                }}
            >
                <div className="flex flex-col gap-4 w-80">
                    <CommonForm
                        containerClassName="flex flex-col gap-4"
                        control={updateMethods.control}
                        fields={componentFields}
                        formProps={{
                            id: UPDATE_FORM_ID,
                            onSubmit: updateMethods.handleSubmit(handleUpdateSubmit, handleUpdateError)
                        }}
                    />
                    <div className="flex gap-2 justify-end">
                        <CommonButton
                            color="inherit"
                            size="small"
                            variant="outlined"
                            onClick={function() {
                                updateMethods.reset(defaultFormValues);
                                setIsUpdateOpen(false);
                                setSelectedId('');
                            }}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton form={UPDATE_FORM_ID} size="small" type="submit" variant="contained">
                            Save
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>
        </div>
    );
}