import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import { MinusCircleIcon } from '@phosphor-icons/react';
import { SpecialGradeConfig } from '@type/grading-config.type';
import { useForm } from 'react-hook-form';

interface SpecialGradeItemProps {
    grade: SpecialGradeConfig;
    onRemove: () => void;
    onUpdate: (field: keyof SpecialGradeConfig, value: string | boolean) => void;
}

export default function SpecialGradeItem({
    grade,
    onRemove,
    onUpdate
}: SpecialGradeItemProps) {
    const { control } = useForm<{
        requires_completion: boolean;
        is_passing: boolean;
        is_active: boolean;
    }>({
        defaultValues: {
            requires_completion: grade.requires_completion,
            is_passing: grade.is_passing,
            is_active: grade.is_active
        }
    });

    return (
        <div className="border border-(--mui-palette-divider) flex gap-4 items-stretch p-4 rounded-lg">
            <div className="flex flex-col gap-4 grow min-w-0">
                <CommonInput
                    containerClassName="w-full"
                    fullWidth
                    label="Label"
                    size="small"
                    value={grade.label}
                    onChange={function(e) {
                        onUpdate('label', e.target.value);
                    }}
                />
                <div className="flex gap-4 items-end">
                    <CommonInput
                        containerClassName="flex-[1] min-w-0"
                        fullWidth
                        label="Code"
                        size="small"
                        value={grade.code}
                        onChange={function(e) {
                            onUpdate('code', e.target.value);
                        }}
                    />
                    <CommonInput
                        containerClassName="flex-[3] min-w-0"
                        fullWidth
                        label="Description"
                        size="small"
                        value={grade.description}
                        onChange={function(e) {
                            onUpdate('description', e.target.value);
                        }}
                    />
                </div>
                <div className="flex gap-4 items-end">
                    <CommonInput
                        containerClassName="flex-1 min-w-0"
                        fullWidth
                        label="Min Absence % (optional)"
                        size="small"
                        type="number"
                        value={grade.min_absence_percentage}
                        onChange={function(e) {
                            onUpdate('min_absence_percentage', e.target.value);
                        }}
                    />
                    <CommonInput
                        containerClassName="flex-1 min-w-0"
                        fullWidth
                        label="Completion Deadline (days)"
                        size="small"
                        type="number"
                        value={grade.completion_deadline_days}
                        onChange={function(e) {
                            onUpdate('completion_deadline_days', e.target.value);
                        }}
                    />
                </div>
                <div className="flex flex-wrap gap-6 items-center">
                    <ValidCommonCheckbox
                        control={control}
                        label="Requires Completion"
                        name="requires_completion"
                        onChange={function(e) {
                            onUpdate('requires_completion', e.target.checked);
                        }}
                    />
                    <ValidCommonCheckbox
                        control={control}
                        label="Is Passing"
                        name="is_passing"
                        onChange={function(e) {
                            onUpdate('is_passing', e.target.checked);
                        }}
                    />
                    <ValidCommonCheckbox
                        control={control}
                        label="Active"
                        name="is_active"
                        onChange={function(e) {
                            onUpdate('is_active', e.target.checked);
                        }}
                    />
                </div>
            </div>
            <CommonButton
                color="error"
                size="small"
                sx={{ alignSelf: 'stretch', maxHeight: 'none', minWidth: 56, width: 56 }}
                onClick={onRemove}
            >
                <MinusCircleIcon size={16} weight="bold" />
            </CommonButton>
        </div>
    );
}