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
        <div className="border border-(--mui-palette-divider) flex flex-col gap-3 p-4 rounded-lg">
            <div className="flex gap-3 items-start">
                <CommonInput
                    label="Code"
                    size="small"
                    sx={{ width: 100 }}
                    value={grade.code}
                    onChange={function(e) {
                        onUpdate('code', e.target.value);
                    }}
                />
                <CommonInput
                    label="Label"
                    size="small"
                    value={grade.label}
                    onChange={function(e) {
                        onUpdate('label', e.target.value);
                    }}
                />
                <CommonInput
                    label="Description"
                    size="small"
                    sx={{ flex: 1 }}
                    value={grade.description}
                    onChange={function(e) {
                        onUpdate('description', e.target.value);
                    }}
                />
                <CommonButton
                    color="error"
                    size="small"
                    onClick={onRemove}
                >
                    <MinusCircleIcon size={16} weight="bold" />
                </CommonButton>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
                <CommonInput
                    label="Min Absence % (optional)"
                    size="small"
                    sx={{ width: 200 }}
                    type="number"
                    value={grade.min_absence_percentage}
                    onChange={function(e) {
                        onUpdate('min_absence_percentage', e.target.value);
                    }}
                />
                <CommonInput
                    label="Completion Deadline (days)"
                    size="small"
                    sx={{ width: 220 }}
                    type="number"
                    value={grade.completion_deadline_days}
                    onChange={function(e) {
                        onUpdate('completion_deadline_days', e.target.value);
                    }}
                />
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
    );
}