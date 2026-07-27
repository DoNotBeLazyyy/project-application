import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import BulkImportModal from '@components/modal/BulkImportModal';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { DEFAULT_ASSSESSMENT_VALUES, DEFAULT_QUESTION_VALUES } from '@constants/faculty.constant';
import AssessmentSettingsForm from '@pages/faculty/sections/assessments/builder/AssessmentSettingsForm';
import QuestionList from '@pages/faculty/sections/assessments/builder/QuestionList';
import QuestionModal from '@pages/faculty/sections/assessments/builder/QuestionModal';
import RubricAttachPanel from '@pages/faculty/sections/assessments/builder/RubricAttachPanel';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import {
    bulkImportQuestions, createAssessment, deleteQuestion, getAssessmentById, getAssessmentQuestions, updateAssessment, upsertQuestion
} from '@services/assessment.service';
import { listGradingComponents, listGradingPeriodsBySection } from '@services/faculty.service';
import { AssessmentFormValues, AssessmentQuestion, QuestionBulkRow, QuestionFormValues } from '@type/assessment.type';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import { isPastDateTime } from '@utils/date.util';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

const QUESTION_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    { key: 'question_text', label: 'Question', hint: 'e.g. What is the capital of France?' },
    { key: 'question_type', label: 'Type', hint: 'Multiple Choice | True or False | Short Answer | Essay | Fill in the Blank | Matching | File Upload' },
    { key: 'points', label: 'Points', hint: 'e.g. 2' },
    { key: 'is_required', label: 'Required', hint: 'TRUE or FALSE' },
    { key: 'explanation', label: 'Explanation', hint: 'Optional' },
    { key: 'choices', label: 'Choices', hint: 'Paris*|London|Rome — separate with | and mark correct with *' }
];

export default function AssessmentBuilderPage() {
    const { sectionId = '', assessmentId = '' } = useParams<{ sectionId: string; assessmentId: string }>();
    const navigate = useNavigate();
    const isNew = assessmentId === 'new';

    const [assessmentDbId, setAssessmentDbId] = useState(isNew
        ? ''
        : assessmentId);
    const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
    const [componentOptions, setComponentOptions] = useState<CommonSelectOption[]>([]);
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<AssessmentQuestion | null>(null);
    const [expandedQuestionId, setExpandedQuestionId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);

    const settingsMethods = useForm<AssessmentFormValues>({ defaultValues: DEFAULT_ASSSESSMENT_VALUES });
    const questionMethods = useForm<QuestionFormValues>({ defaultValues: DEFAULT_QUESTION_VALUES });

    const watchedQuestionType = questionMethods.watch('question_type');
    const watchedChoices = questionMethods.watch('choices');

    useEffect(function() {
        if (!sectionId) return;

        async function fetchComponents() {
            const periodsResult = await listGradingPeriodsBySection(sectionId);
            const periods = periodsResult.data ?? [];

            if (periods.length === 0) {
                setComponentOptions([]);
                return;
            }

            const componentResults = await Promise.all(
                periods.map((period) => listGradingComponents(sectionId, period.id))
            );

            const options = periods.flatMap((period, index) =>
                (componentResults[index].data ?? []).map((c) => ({
                    label: `${period.name} — ${c.name} (${c.weight}%)`,
                    value: c.id
                }))
            );

            setComponentOptions(options);
        }

        fetchComponents();
    }, [sectionId]);

    useEffect(function() {
        if (isNew || !assessmentDbId) return;

        async function fetchAssessment() {
            const [settingsResult, questionsResult] = await Promise.all([
                getAssessmentById(assessmentDbId),
                getAssessmentQuestions(assessmentDbId)
            ]);

            if (settingsResult.data) {
                const d = settingsResult.data;
                settingsMethods.reset({
                    title:                d.title ?? '',
                    description:          d.description ?? '',
                    assessment_type:      d.assessment_type ?? 'Quiz',
                    grading_component_id: d.grading_component_id ?? '',
                    total_points:         String(d.total_points ?? 100),
                    passing_points:       d.passing_points
                        ? String(d.passing_points)
                        : '',
                    time_limit_minutes:   d.time_limit_minutes
                        ? String(d.time_limit_minutes)
                        : '',
                    max_attempts:         String(d.max_attempts ?? 1),
                    opens_at:             d.opens_at ?? '',
                    due_at:               d.due_at ?? '',
                    closes_at:            d.closes_at ?? '',
                    show_results_at:      d.show_results_at ?? '',
                    scheduled_publish_at: d.scheduled_publish_at ?? '',
                    shuffle_questions:    d.shuffle_questions ?? false,
                    shuffle_choices:      d.shuffle_choices ?? false,
                    show_all_questions:   d.show_all_questions ?? true,
                    questions_per_page:   d.questions_per_page
                        ? String(d.questions_per_page)
                        : '',
                    allow_past_dates:     [d.due_at, d.closes_at, d.show_results_at]
                        .some((date) => isPastDateTime(date ?? ''))
                });
            }

            if (questionsResult.data) {
                setQuestions(questionsResult.data);
            }
        }

        fetchAssessment();
    }, [assessmentDbId, isNew]);

    async function handleSettingsSubmit(values: AssessmentFormValues) {
        setIsSaving(true);

        try {
            if (!assessmentDbId) {
                const result = await createAssessment(sectionId, values);

                if (!result.error && result.data?.id) {
                    setAssessmentDbId(result.data.id);
                    navigate(`/faculty/sections/${sectionId}/assessments/${result.data.id}/builder`, { replace: true });
                }
            }
            else {
                await updateAssessment(assessmentDbId, values);
            }
        }
        finally {
            setIsSaving(false);
        }
    }

    async function refreshQuestions() {
        const result = await getAssessmentQuestions(assessmentDbId);
        if (result.data) setQuestions(result.data);
    }

    function handleOpenAddQuestion() {
        setEditingQuestion(null);
        questionMethods.reset(DEFAULT_QUESTION_VALUES);
        setIsQuestionModalOpen(true);
    }

    function handleOpenEditQuestion(question: AssessmentQuestion) {
        setEditingQuestion(question);
        questionMethods.reset({
            question_text:      question.question_text,
            question_type:      question.question_type,
            points:             String(question.points),
            explanation:        question.explanation ?? '',
            is_required:        question.is_required,
            allowed_file_types: question.allowed_file_types?.join(', ') ?? '',
            max_file_size_mb:   question.max_file_size_mb
                ? String(question.max_file_size_mb)
                : '',
            max_file_count:     question.max_file_count
                ? String(question.max_file_count)
                : '',
            choices:            question.choices.length > 0
                ? question.choices.map((c) => ({ choice_text: c.choice_text, is_correct: c.is_correct }))
                : [{ choice_text: '', is_correct: false }, { choice_text: '', is_correct: false }]
        });
        setIsQuestionModalOpen(true);
    }

    function handleCloseQuestionModal() {
        setIsQuestionModalOpen(false);
        setEditingQuestion(null);
        questionMethods.reset(DEFAULT_QUESTION_VALUES);
    }

    async function handleQuestionSubmit(values: QuestionFormValues) {
        const sequence = editingQuestion?.sequence ?? questions.length + 1;
        const result = await upsertQuestion(assessmentDbId, editingQuestion?.id ?? null, values, sequence);

        if (!result.error) {
            await refreshQuestions();
            handleCloseQuestionModal();
        }
    }

    async function handleDeleteQuestion(questionId: string) {
        const result = await deleteQuestion(questionId);
        if (!result.error) await refreshQuestions();
    }

    function handleToggleExpand(questionId: string) {
        setExpandedQuestionId((prev) => prev === questionId
            ? ''
            : questionId);
    }

    return (
        <CommonCard className="h-full w-full">
            <div className="flex flex-col gap-4 h-full">
                <div className="flex gap-3 items-center">
                    <CommonButton
                        color="inherit"
                        size="small"
                        startIcon={<ArrowLeftIcon size={16} weight="bold" />}
                        variant="outlined"
                        onClick={function() {
                            navigate(`/faculty/sections/${sectionId}?tab=assessments`);
                        }}
                    >
                    Back
                    </CommonButton>
                    <div className="flex flex-col">
                        <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                        Assessment Builder
                        </h1>
                        <p className="text-(--mui-palette-text-secondary) text-sm">
                            {isNew
                                ? 'Create a new assessment'
                                : 'Edit assessment settings and questions'}
                        </p>
                    </div>
                </div>
                {assessmentDbId && (
                    <RubricAttachPanel
                        assessmentId={assessmentDbId}
                        sectionId={sectionId}
                    />
                )}
                <div className="flex flex-1 gap-4 min-h-0">
                    <AssessmentSettingsForm
                        componentOptions={componentOptions}
                        isNew={isNew}
                        isSaving={isSaving}
                        methods={settingsMethods}
                        onSubmit={handleSettingsSubmit}
                    />
                    <QuestionList
                        assessmentDbId={assessmentDbId}
                        expandedQuestionId={expandedQuestionId}
                        questions={questions}
                        onAddQuestion={handleOpenAddQuestion}
                        onDeleteQuestion={handleDeleteQuestion}
                        onEditQuestion={handleOpenEditQuestion}
                        onImportQuestions={function() {
                            setIsImportOpen(true);
                        }}
                        onToggleExpand={handleToggleExpand}
                    />
                </div>
                <BulkImportModal<QuestionBulkRow>
                    open={isImportOpen}
                    templateColumns={QUESTION_TEMPLATE_COLUMNS}
                    title="Import Questions"
                    onBulkImport={function(rows: QuestionBulkRow[]) {
                        return bulkImportQuestions(assessmentDbId, rows);
                    }}
                    onClose={function() {
                        setIsImportOpen(false);
                        refreshQuestions();
                    }}
                    onMapRow={(row) => ({
                        choices:       row.choices,
                        explanation:   row.explanation,
                        is_required:   row.is_required,
                        points:        row.points,
                        question_text: row.question_text,
                        question_type: row.question_type
                    })}
                    onSuccess={refreshQuestions}
                />
                <QuestionModal
                    editingQuestion={editingQuestion}
                    isOpen={isQuestionModalOpen}
                    methods={questionMethods}
                    watchedChoices={watchedChoices}
                    watchedQuestionType={watchedQuestionType}
                    onClose={handleCloseQuestionModal}
                    onSubmit={handleQuestionSubmit}
                />
            </div>
        </CommonCard>
    );
}