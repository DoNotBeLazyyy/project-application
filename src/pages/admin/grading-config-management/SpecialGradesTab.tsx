import CommonButton from '@components/button/CommonButton';
import FormButtons from '@components/button/FormButtons';
import SpecialGradeItem from '@pages/admin/grading-config-management/SpecialGradeItem';
import { PlusCircleIcon } from '@phosphor-icons/react';
import { SpecialGradeConfig } from '@type/grading-config.type';

interface SpecialGradesTabProps {
    grades: SpecialGradeConfig[];
    isDirty: boolean;
    isSaving: boolean;
    onAddGrade: () => void;
    onRemoveGrade: (index: number) => Promise<void>;
    onSave: () => Promise<void>;
    onUpdateGrade: (index: number, field: keyof SpecialGradeConfig, value: string | boolean) => void;
}

export default function SpecialGradesTab({
    grades,
    isDirty,
    isSaving,
    onAddGrade,
    onRemoveGrade,
    onSave,
    onUpdateGrade
}: SpecialGradesTabProps) {
    return (
        <div className="flex flex-col gap-4">
            <p className="text-(--mui-palette-text-secondary) text-sm">
                Configure INC, FDA, DROP and other special grade rules.
            </p>
            <div className="flex flex-col gap-4">
                {grades.map((grade, index) => (
                    <SpecialGradeItem
                        grade={grade}
                        key={index}
                        onRemove={function() {
                            onRemoveGrade(index);
                        }}
                        onUpdate={function(field, value) {
                            onUpdateGrade(index, field, value);
                        }}
                    />
                ))}
            </div>
            <CommonButton
                color="primary"
                size="small"
                startIcon={<PlusCircleIcon weight="bold" />}
                variant="text"
                onClick={onAddGrade}
            >
                Add Special Grade
            </CommonButton>
            <FormButtons
                className="justify-start"
                confirmProps={{
                    children: isSaving
                        ? 'Saving...'
                        : 'Save',
                    disabled: isSaving || !isDirty,
                    variant: 'contained',
                    onClick: onSave
                }}
            />
        </div>
    );
}