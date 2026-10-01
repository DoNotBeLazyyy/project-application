import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonModal from '@components/modal/CommonModal';
import {
    ArrowsClockwiseIcon,
    ChartPieSliceIcon,
    LockIcon,
    PencilSimpleIcon,
    PlusIcon,
    TrashIcon
} from '@phosphor-icons/react';
import { GradingComponent, GradingComponentFormValues } from '@type/faculty.type';
import { formErrors } from '@utils/form.util';
import { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

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
    periodName?: string;
    periodWeight?: number;
    onCreate: (values: GradingComponentFormValues) => Promise<void>;
    onDelete: (componentId: string) => Promise<void>;
    onReseed: () => Promise<void>;
    onUpdate: (componentId: string, values: GradingComponentFormValues) => Promise<void>;
}

export default function GradingComponentPanel({
    components,
    locked,
    periodName,
    periodWeight,
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

    return (
        <div className="flex flex-col flex-shrink-0 gap-3.5 w-full md:w-80 h-full min-h-0">
            {/* Header & Add Button */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
                <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        Grading Components
                    </span>
                    <span className="text-[11px] text-slate-500">
                        {periodName ? `${periodName} Period` : 'Active Period'}{' '}
                        {periodWeight !== undefined ? `(${periodWeight}% of Final Grade)` : ''}
                    </span>
                </div>
                <CommonButton
                    disabled={locked || totalWeight >= 100}
                    size="small"
                    startIcon={<PlusIcon size={14} weight="bold" />}
                    variant="contained"
                    onClick={() => setIsCreateOpen(true)}
                >
                    Add
                </CommonButton>
            </div>

            {locked && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex gap-2 items-start p-2.5 rounded-xl text-amber-800 dark:text-amber-300">
                    <LockIcon className="mt-0.5 shrink-0" size={14} weight="bold" />
                    <span className="text-[11px] leading-tight">
                        Locked: grades have been recorded for this period, so components can no longer be edited.
                    </span>
                </div>
            )}

            {!locked && components.length === 0 && (
                <CommonButton
                    size="small"
                    startIcon={<ArrowsClockwiseIcon size={14} weight="bold" />}
                    variant="outlined"
                    onClick={onReseed}
                >
                    Reseed from Schema Defaults
                </CommonButton>
            )}

            {/* Bento Card Grid for Components */}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 pr-1">
                {components.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/40">
                        <ChartPieSliceIcon size={32} className="text-slate-400 mb-2" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            No Components Configured
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                            Add assessment components (e.g. Quizzes, Exams) to calculate student grades.
                        </p>
                    </div>
                ) : (
                    components.map((component) => (
                        <div
                            key={component.id}
                            className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between gap-2.5 group hover:border-slate-300 dark:hover:border-zinc-700 transition-all"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                                    {component.name}
                                </span>
                                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                                    {component.weight}%
                                </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800 text-[11px] text-slate-500">
                                <span className="text-[11px] text-slate-500">
                                    {periodWeight !== undefined
                                        ? `${((component.weight * periodWeight) / 100).toFixed(1)}% of course`
                                        : 'Period Component'}
                                </span>

                                {!locked && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            title="Edit Component"
                                            onClick={() => handleOpenUpdate(component)}
                                            className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                        >
                                            <PencilSimpleIcon size={14} weight="bold" />
                                        </button>
                                        <button
                                            type="button"
                                            title="Delete Component"
                                            onClick={() => onDelete(component.id)}
                                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                        >
                                            <TrashIcon size={14} weight="bold" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Component Modal */}
            <CommonModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: 'Add a new grading component to this period.',
                        title: 'New Component'
                    }
                }}
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
            >
                <div className="flex flex-col gap-4 max-w-full sm:w-96 w-full">
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
                            onClick={() => setIsCreateOpen(false)}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            form={CREATE_FORM_ID}
                            size="small"
                            type="submit"
                            variant="contained"
                        >
                            Create
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>

            {/* Update Component Modal */}
            <CommonModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: 'Update this grading component.',
                        title: 'Edit Component'
                    }
                }}
                open={isUpdateOpen}
                onClose={() => setIsUpdateOpen(false)}
            >
                <div className="flex flex-col gap-4 max-w-full sm:w-96 w-full">
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
                            onClick={() => setIsUpdateOpen(false)}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            form={UPDATE_FORM_ID}
                            size="small"
                            type="submit"
                            variant="contained"
                        >
                            Update
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>
        </div>
    );
}