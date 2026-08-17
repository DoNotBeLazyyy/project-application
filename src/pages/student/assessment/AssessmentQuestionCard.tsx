import ValidCommonInput from '@components/input/ValidCommonInput';
import ValidCommonSelect from '@components/select/ValidCommonSelect';
import FileUploadAnswer from '@pages/student/assessment/FileUploadAnswer';
import { StudentQuestion } from '@type/student-portal.type';
import { Control } from 'react-hook-form';

interface AssessmentQuestionCardProps {
    control: Control<Record<string, string>>;
    index: number;
    question: StudentQuestion;
    submissionId: string;
}

export default function AssessmentQuestionCard({
    control,
    index,
    question,
    submissionId
}: AssessmentQuestionCardProps) {
    const choiceOptions = question.choices.map((c) => ({
        label: c.choice_text,
        value: c.id
    }));

    const isChoiceBased = ['Multiple Choice', 'True or False', 'Matching'].includes(question.question_type);
    const isTextBased = ['Short Answer', 'Essay', 'Fill in the Blank'].includes(question.question_type);

    return (
        <div className="border border-(--mui-palette-divider) flex flex-col gap-3 p-4 rounded-lg">
            <div className="flex gap-2 items-start justify-between">
                <p className="font-medium min-w-0 text-(--mui-palette-text-primary) text-sm wrap-break-word">
                    {index + 1}. {question.question_text}
                    {question.is_required && (
                        <span className="ml-1 text-(--mui-palette-error-main)">*</span>
                    )}
                </p>
                <span className="shrink-0 text-(--mui-palette-text-secondary) text-xs">
                    {question.points} pt{question.points !== 1
                        ? 's'
                        : ''}
                </span>
            </div>
            {isChoiceBased && (
                <ValidCommonSelect
                    control={control}
                    fullWidth
                    label="Your answer"
                    name={`answer_${question.id}`}
                    options={choiceOptions}
                    size="small"
                />
            )}
            {isTextBased && (
                <ValidCommonInput
                    control={control}
                    fullWidth
                    label="Your answer"
                    multiline={question.question_type === 'Essay'}
                    name={`answer_${question.id}`}
                    rows={question.question_type === 'Essay'
                        ? 4
                        : 1}
                    size="small"
                />
            )}
            {question.question_type === 'File Upload' && (
                <FileUploadAnswer
                    question={question}
                    submissionId={submissionId}
                />
            )}
        </div>
    );
}