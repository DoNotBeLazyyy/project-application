import PeriodForm, { PeriodFormProps } from '@pages/admin/grading-config-management/PeriodForm';
import PeriodTableForm, { PeriodTableFormProps } from '@pages/admin/grading-config-management/PeriodTableForm';
import { GradingComponentTemplate } from '@type/grading-config.type';
import { formErrors } from '@utils/form.util';
import { FieldValues, useFieldArray, UseFormReturn } from 'react-hook-form';

export interface PeriodFormValues extends FieldValues {
    name: string;
    weight: string;
    components: GradingComponentTemplate[];
}

const DEFAULT_COMPONENT: GradingComponentTemplate = {
    name: '',
    weight: ''
};

type PeriodFormOverrideProps = Omit<PeriodFormProps, 'control' | 'disabled' | 'formProps'>;
type PeriodTableFormOverrideProps = Omit<PeriodTableFormProps, 'control' | 'componentTotal' | 'disabled' | 'fields' | 'onAddRow' | 'onRemoveRow'>;

export interface PeriodModalFormProps {
    disabled?: boolean;
    formId?: string;
    maxWeight?: number;
    methods: UseFormReturn<PeriodFormValues>;
    periodFormProps?: PeriodFormOverrideProps;
    periodTableFormProps?: PeriodTableFormOverrideProps;
    onSubmit: (values: PeriodFormValues) => void;
}

export default function PeriodModalForm({
    disabled = false,
    formId,
    maxWeight,
    methods,
    periodFormProps,
    periodTableFormProps,
    onSubmit
}: PeriodModalFormProps) {
    const { fields, append, remove } = useFieldArray({
        control: methods.control,
        name: 'components'
    });

    const componentTotal = methods.watch('components')
        .reduce((sum, c) => sum + Number(c.weight || 0), 0);

    function handleError(errors: FieldValues) {
        formErrors(errors, methods);
    }

    return (
        <div className="flex flex-col gap-4">
            <PeriodForm
                {...periodFormProps}
                control={methods.control}
                disabled={disabled}
                formProps={{
                    id: formId,
                    onSubmit: methods.handleSubmit(onSubmit, handleError)
                }}
                maxWeight={maxWeight}
            />
            <PeriodTableForm
                {...periodTableFormProps}
                componentTotal={componentTotal}
                control={methods.control}
                disabled={disabled}
                fields={fields as (GradingComponentTemplate & { id: string })[]}
                onAddRow={function() {
                    append(DEFAULT_COMPONENT);
                }}
                onRemoveRow={remove}
            />
        </div>
    );
}