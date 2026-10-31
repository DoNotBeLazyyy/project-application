import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import BulkImportModal from '@components/modal/BulkImportModal';
import CommonModal from '@components/modal/CommonModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import ModalStepperHeader, { ModalStepItem } from '@components/modal/ModalStepperHeader';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { DEFAULT_ASSSESSMENT_VALUES, DEFAULT_QUESTION_VALUES } from '@constants/faculty.constant';
import { useFormDraft } from '@hooks/useFormDraft';
import AssessmentAttachmentPanel from '@pages/faculty/sections/assessments/builder/AssessmentAttachmentPanel';
import QuestionList from '@pages/faculty/sections/assessments/builder/QuestionList';
import QuestionModal from '@pages/faculty/sections/assessments/builder/QuestionModal';
import RubricAttachPanel from '@pages/faculty/sections/assessments/builder/RubricAttachPanel';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    FloppyDiskIcon,
    NotepadIcon,
    XIcon
} from '@phosphor-icons/react';
import {
    bulkImportQuestions,
    createAssessment,
    deleteQuestion,
    getAssessmentById,
    getAssessmentQuestions,
    listAssessments,
    updateAssessment,
    upsertQuestion
} from '@services/assessment.service';
import { listGradingComponents, listGradingPeriodsBySection } from '@services/faculty.service';
import { useToastStore } from '@stores/toast.store';
import {
    AssessmentAttachment,
    AssessmentFormValues,
    AssessmentQuestion,
    AssessmentType,
    QuestionBulkRow,
    QuestionFormValues
} from '@type/assessment.type';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import { isPastDateTime } from '@utils/date.util';
import { DEFAULT_FORM_OPTIONS, formErrors } from '@utils/form.util';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

export const ASSESSMENT_WIZARD_STEPS: ModalStepItem[] = [
    {
        step: 1,
        title: 'Overview & Grading',
        subtitle: 'Assessment title, type, grading component, and points'
    },
    {
        step: 2,
        title: 'Schedule & Timing',
        subtitle: 'Dates, time limits, attempts, and availability windows'
    },
    {
        step: 3,
        title: 'Questions & Content',
        subtitle: 'Question bank, choices, points distribution, and bulk import'
    },
    {
        step: 4,
        title: 'Rubrics & Display Rules',
        subtitle: 'Shuffle settings, pagination, attachments, and final review'
    }
];

// Mirrors what fn_bulk_import_questions reads: question_text and question_type are required per row,
// points defaults to 1, is_required is FALSE only for FALSE/NO/0/N, and choices are only stored for
// Multiple Choice / True or False / Matching (each needs at least one choice marked with *).
const QUESTION_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    {
        key: 'question_text', label: 'Question Text', hint: 'Required. The question as students will see it', sample: 'What is the primary role of an operating system kernel?', aliases: ['question', 'prompt', 'item']
    },
    {
        key: 'question_type', label: 'Question Type', hint: 'Required. One of: Multiple Choice | True or False | Short Answer | Essay | Fill in the Blank | Matching | File Upload (exact spelling)', sample: 'Multiple Choice', aliases: ['type', 'item_type']
    },
    {
        key: 'points', label: 'Points', hint: 'Number greater than 0 (blank defaults to 1)', sample: '2', required: false, aliases: ['point', 'score', 'weight']
    },
    {
        key: 'is_required', label: 'Required', hint: 'TRUE or FALSE (blank defaults to TRUE)', sample: 'TRUE', required: false, aliases: ['required']
    },
    {
        key: 'explanation', label: 'Explanation', hint: 'Optional explanation shown after grading', sample: 'The kernel manages core hardware and resource allocation.', required: false
    },
    {
        key: 'choices', label: 'Choices', hint: 'Required for Multiple Choice, True or False and Matching: separate with | and mark each correct choice with * (e.g. True*|False). Leave blank for Short Answer, Essay, Fill in the Blank and File Upload', sample: 'Resource Management*|Web Browsing|Word Processing|Photo Editing', required: false, aliases: ['options', 'answers']
    }
];

const ASSESSMENT_TYPE_OPTIONS: { label: string; value: AssessmentType }[] = [
    { label: 'Quiz', value: 'Quiz' },
    { label: 'Exam', value: 'Exam' },
    { label: 'Activity', value: 'Activity' },
    { label: 'Assignment', value: 'Assignment' },
    { label: 'Project', value: 'Project' },
    { label: 'Lab Report', value: 'Lab Report' }
];

interface AssessmentWizardModalProps {
    open: boolean;
    sectionId: string;
    assessmentId?: string | null;
    readOnly?: boolean;
    onClose: VoidFunction;
    onSuccess: VoidFunction;
}

export default function AssessmentWizardModal({
    open,
    sectionId,
    assessmentId,
    readOnly = false,
    onClose,
    onSuccess
}: AssessmentWizardModalProps) {
    const isNew = !assessmentId || assessmentId === 'new';
    const [currentStep, setCurrentStep] = useState(1);
    const [activeAssessmentId, setActiveAssessmentId] = useState<string>(isNew
        ? ''
        : assessmentId);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);

    const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
    const [attachments, setAttachments] = useState<AssessmentAttachment[]>([]);
    const [componentOptions, setComponentOptions] = useState<CommonSelectOption[]>([]);
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<AssessmentQuestion | null>(null);
    const [expandedQuestionId, setExpandedQuestionId] = useState('');
    const [isImportOpen, setIsImportOpen] = useState(false);

    const settingsMethods = useForm<AssessmentFormValues>({ ...DEFAULT_FORM_OPTIONS, defaultValues: DEFAULT_ASSSESSMENT_VALUES });
    const questionMethods = useForm<QuestionFormValues>({ ...DEFAULT_FORM_OPTIONS, defaultValues: DEFAULT_QUESTION_VALUES });

    const draftGuard = useFormDraft({
        control: settingsMethods.control,
        enabled: open && !readOnly && !isSaving,
        formId: `assessment-wizard-${sectionId}-${assessmentId || 'new'}`
    });

    const watchedQuestionType = questionMethods.watch('question_type');
    const watchedChoices = questionMethods.watch('choices');
    const showAllQuestions = settingsMethods.watch('show_all_questions');
    const allowPastDates = settingsMethods.watch('allow_past_dates');

    // Load grading components for this section
    useEffect(() => {
        if (!sectionId || !open) return;

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
                })));

            setComponentOptions(options);
        }

        fetchComponents();
    }, [sectionId, open]);

    // Load assessment data when editing
    useEffect(() => {
        if (!open) {
            setCurrentStep(1);
            setActiveAssessmentId(isNew
                ? ''
                : assessmentId || '');
            settingsMethods.reset(DEFAULT_ASSSESSMENT_VALUES);
            setQuestions([]);
            setAttachments([]);
            return;
        }

        const targetId = isNew
            ? ''
            : assessmentId || '';
        setActiveAssessmentId(targetId);

        if (targetId) {
            setIsLoading(true);
            Promise.all([
                getAssessmentById(targetId),
                getAssessmentQuestions(targetId),
                listAssessments(sectionId)
            ])
                .then(([settingsResult, questionsResult, listResult]) => {
                    if (settingsResult.data) {
                        const d = settingsResult.data;
                        settingsMethods.reset({
                            title: d.title ?? '',
                            description: d.description ?? '',
                            assessment_type: d.assessment_type ?? 'Quiz',
                            grading_component_id: d.grading_component_id ?? '',
                            total_points: String(d.total_points ?? 100),
                            passing_points: d.passing_points !== null && d.passing_points !== undefined && String(d.passing_points) !== ''
                                ? String(d.passing_points)
                                : '',
                            time_limit_minutes: d.time_limit_minutes
                                ? String(d.time_limit_minutes)
                                : '',
                            max_attempts: String(d.max_attempts ?? 1),
                            opens_at: d.opens_at ?? '',
                            due_at: d.due_at ?? '',
                            closes_at: d.closes_at ?? '',
                            show_results_at: d.show_results_at ?? '',
                            scheduled_publish_at: d.scheduled_publish_at ?? '',
                            shuffle_questions: d.shuffle_questions ?? false,
                            shuffle_choices: d.shuffle_choices ?? false,
                            show_all_questions: d.show_all_questions ?? true,
                            questions_per_page: d.questions_per_page
                                ? String(d.questions_per_page)
                                : '',
                            allow_student_review: d.allow_student_review ?? true,
                            allow_past_dates: [d.due_at, d.closes_at, d.show_results_at].some((date) =>
                                isPastDateTime(date ?? ''))
                        });
                    }

                    if (questionsResult.data) {
                        setQuestions(questionsResult.data);
                    }

                    if (listResult.data) {
                        const match = listResult.data.find((item) => item.id === targetId);
                        setAttachments(match?.attachments ?? []);
                    }
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
        else {
            settingsMethods.reset(DEFAULT_ASSSESSMENT_VALUES);
            setQuestions([]);
            setAttachments([]);
        }
    }, [open, assessmentId, isNew, sectionId]);

    async function refreshAttachments() {
        if (!sectionId || !activeAssessmentId) return;
        const result = await listAssessments(sectionId);
        if (result.data) {
            const match = result.data.find((item) => item.id === activeAssessmentId);
            setAttachments(match?.attachments ?? []);
        }
    }

    async function refreshQuestions() {
        if (!activeAssessmentId) return;
        const result = await getAssessmentQuestions(activeAssessmentId);
        if (result.data) setQuestions(result.data);
    }

    const configuredTotalPoints = Number(settingsMethods.watch('total_points') || '0');
    const questionSumPoints = questions.reduce((sum, q) => sum + q.points, 0);

    function validateNotPast(label: string) {
        return function(value: string | boolean) {
            if (allowPastDates || typeof value !== 'string' || !isPastDateTime(value)) return true;
            return `${label} is in the past. Tick "Allow past dates" if this is intentional.`;
        };
    }

    // Mirrors the window checks in fn_create_assessment / fn_update_assessment and chk_assessment_window
    function validateBefore(otherName: 'opens_at' | 'due_at' | 'closes_at', message: string, allowEqual = false) {
        return function(value: string | boolean) {
            const other = settingsMethods.getValues(otherName);
            if (typeof value !== 'string' || !value || !other) return true;
            const current = new Date(value)
                .getTime();
            const target = new Date(other)
                .getTime();
            if (Number.isNaN(current) || Number.isNaN(target)) return true;
            return (allowEqual
                ? current <= target
                : current < target) || message;
        };
    }

    function validateWholeNumber(label: string, isOptional = true) {
        return function(value: string | boolean) {
            if (typeof value !== 'string' || (isOptional && value === '')) return true;
            const parsed = Number(value);
            if (!Number.isInteger(parsed) || parsed < 1) return `${label} must be a whole number of at least 1.`;
            return parsed <= 32767 || `${label} must be 32767 or less.`;
        };
    }

    async function validateFields(names: (keyof AssessmentFormValues)[]): Promise<boolean> {
        const isValid = await settingsMethods.trigger(names);
        if (!isValid) {
            formErrors(settingsMethods.formState.errors, settingsMethods);
        }
        return isValid;
    }

    function validateStep1(): Promise<boolean> {
        return validateFields(['title', 'assessment_type', 'grading_component_id', 'total_points', 'passing_points', 'description']);
    }

    function validateStep2(): Promise<boolean> {
        return validateFields([
            'time_limit_minutes',
            'max_attempts',
            'scheduled_publish_at',
            'opens_at',
            'due_at',
            'closes_at',
            'show_results_at'
        ]);
    }

    async function validateStep4(): Promise<boolean> {
        if (settingsMethods.getValues('show_all_questions')) return true;
        return validateFields(['questions_per_page']);
    }

    async function persistAssessmentIfNew(): Promise<string | null> {
        if (activeAssessmentId) return activeAssessmentId;

        const isValid = await validateStep1();
        if (!isValid) return null;

        setIsSaving(true);
        const values = settingsMethods.getValues();
        const result = await createAssessment(sectionId, values);
        setIsSaving(false);

        if (!result.error && result.data?.id) {
            setActiveAssessmentId(result.data.id);
            return result.data.id;
        }
        return null;
    }

    async function handleNext() {
        if (currentStep === 1) {
            const valid = await validateStep1();
            if (!valid) return;

            // Automatically persist draft if new so user can author questions in Step 3
            if (!activeAssessmentId) {
                const newId = await persistAssessmentIfNew();
                if (!newId) return;
            }
            setCurrentStep(2);
        }
        else if (currentStep === 2) {
            const valid = await validateStep2();
            if (!valid) return;
            setCurrentStep(3);
        }
        else if (currentStep === 3) {
            setCurrentStep(4);
        }
    }

    function handleBack() {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
        }
    }

    async function handleStepClick(stepNumber: number) {
        if (stepNumber === currentStep) return;
        if (readOnly) {
            setCurrentStep(stepNumber);
            return;
        }
        if (stepNumber < currentStep) {
            setCurrentStep(stepNumber);
            return;
        }

        if (currentStep === 1) {
            const valid = await validateStep1();
            if (!valid) return;
            if (!activeAssessmentId) {
                const newId = await persistAssessmentIfNew();
                if (!newId) return;
            }
        }
        if (currentStep === 2 && stepNumber > 2) {
            const valid = await validateStep2();
            if (!valid) return;
        }

        setCurrentStep(stepNumber);
    }

    async function handleSaveAssessment() {
        const valid1 = await validateStep1();
        if (!valid1) {
            setCurrentStep(1);
            return;
        }
        const valid2 = await validateStep2();
        if (!valid2) {
            setCurrentStep(2);
            return;
        }
        const valid4 = await validateStep4();
        if (!valid4) {
            setCurrentStep(4);
            return;
        }

        setIsSaving(true);
        const values = settingsMethods.getValues();

        try {
            if (!activeAssessmentId) {
                const res = await createAssessment(sectionId, values);
                if (!res.error) {
                    draftGuard.clearDraft();
                    useToastStore.getState()
                        .showToast('Assessment created successfully.', 'success');
                    onSuccess();
                    onClose();
                }
            }
            else {
                const res = await updateAssessment(activeAssessmentId, values);
                if (!res.error) {
                    draftGuard.clearDraft();
                    useToastStore.getState()
                        .showToast('Assessment saved successfully.', 'success');
                    onSuccess();
                    onClose();
                }
            }
        }
        finally {
            setIsSaving(false);
        }
    }

    function handleOpenAddQuestion() {
        setEditingQuestion(null);
        const remaining = configuredTotalPoints - questionSumPoints;
        const suggestedPoints = remaining > 0
            ? remaining
            : questions.length === 0 && configuredTotalPoints > 0
                ? configuredTotalPoints
                : 1;

        questionMethods.reset({
            ...DEFAULT_QUESTION_VALUES,
            points: String(suggestedPoints)
        });
        setIsQuestionModalOpen(true);
    }

    async function handleSyncTotalPoints(newTotal: number) {
        settingsMethods.setValue('total_points', String(newTotal), { shouldDirty: true });
        if (activeAssessmentId) {
            const currentValues = settingsMethods.getValues();
            await updateAssessment(activeAssessmentId, { ...currentValues, total_points: String(newTotal) });
            useToastStore.getState()
                .showToast(`Assessment total points updated to ${newTotal} pts.`, 'success');
        }
    }

    function handleOpenEditQuestion(question: AssessmentQuestion) {
        setEditingQuestion(question);
        questionMethods.reset({
            question_text: question.question_text,
            question_type: question.question_type,
            points: String(question.points),
            explanation: question.explanation ?? '',
            is_required: question.is_required,
            allowed_file_types: question.allowed_file_types?.join(', ') ?? '',
            max_file_size_mb: question.max_file_size_mb
                ? String(question.max_file_size_mb)
                : '',
            max_file_count: question.max_file_count
                ? String(question.max_file_count)
                : '',
            choices: question.choices.length > 0
                ? question.choices.map((c) => ({ choice_text: c.choice_text, is_correct: c.is_correct }))
                : [
                    { choice_text: '', is_correct: false },
                    { choice_text: '', is_correct: false }
                ]
        });
        setIsQuestionModalOpen(true);
    }

    function handleCloseQuestionModal() {
        setIsQuestionModalOpen(false);
        setEditingQuestion(null);
        questionMethods.reset(DEFAULT_QUESTION_VALUES);
    }

    async function handleQuestionSubmit(values: QuestionFormValues) {
        if (!activeAssessmentId) return;
        const sequence = editingQuestion?.sequence ?? questions.length + 1;
        const result = await upsertQuestion(activeAssessmentId, editingQuestion?.id ?? null, values, sequence);

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
        setExpandedQuestionId((prev) => (prev === questionId
            ? ''
            : questionId));
    }

    const currentStepConfig = ASSESSMENT_WIZARD_STEPS.find((s) => s.step === currentStep);

    const step1Fields: FormFieldConfig<AssessmentFormValues>[] = [
        {
            label: 'Title',
            name: 'title',
            rules: { required: 'Required' },
            type: 'text',
            gridCols: 2
        },
        {
            label: 'Assessment Type',
            name: 'assessment_type',
            options: ASSESSMENT_TYPE_OPTIONS,
            rules: { required: 'Required' },
            type: 'select',
            gridCols: 1
        },
        {
            label: 'Grading Component',
            name: 'grading_component_id',
            options: componentOptions,
            type: 'select',
            gridCols: 1
        },
        {
            label: 'Total Points',
            name: 'total_points',
            rules: {
                required: 'Required',
                deps: 'passing_points',
                validate: (value) => Number(value) > 0 || 'Total points must be greater than 0.'
            },
            type: 'number',
            gridCols: 1
        },
        {
            label: 'Passing Points',
            name: 'passing_points',
            rules: {
                validate: function(value) {
                    if (value === '' || value === null || value === undefined) return true;
                    const passing = Number(value);
                    if (Number.isNaN(passing) || passing < 0) return 'Passing points cannot be negative.';
                    return passing <= Number(settingsMethods.getValues('total_points') || 0) || 'Passing points cannot exceed total points.';
                }
            },
            type: 'number',
            gridCols: 1
        },
        {
            label: 'Description',
            name: 'description',
            type: 'text-area',
            gridCols: 2
        }
    ];

    const step2TimingFields: FormFieldConfig<AssessmentFormValues>[] = [
        {
            fieldProps: { helperText: 'Timer starts as soon as the student opens the assessment. Leave blank for unlimited.' },
            label: 'Time Limit (Minutes)',
            name: 'time_limit_minutes',
            placeholder: 'e.g. 60',
            rules: { validate: validateWholeNumber('Time limit') },
            type: 'number'
        },
        {
            fieldProps: { helperText: 'How many attempts each student is granted.' },
            label: 'Maximum Attempts',
            name: 'max_attempts',
            placeholder: 'e.g. 1',
            rules: { required: 'Required', validate: validateWholeNumber('Maximum attempts', false) },
            type: 'number'
        }
    ];

    const step2ScheduleFields: FormFieldConfig<AssessmentFormValues>[] = [
        {
            fieldProps: { helperText: 'When the assessment auto-publishes to students.' },
            label: 'Scheduled Publish',
            name: 'scheduled_publish_at',
            rules: { validate: validateBefore('opens_at', 'Scheduled publish must be on or before the opening date.', true) },
            type: 'datetime'
        },
        {
            fieldProps: { helperText: 'When students can begin taking the assessment.' },
            label: 'Opens At',
            name: 'opens_at',
            rules: {
                validate: {
                    beforeDue: validateBefore('due_at', 'Opening date must be before the due date.'),
                    beforeClose: validateBefore('closes_at', 'Opening date must be before the closing date.')
                }
            },
            type: 'datetime'
        },
        {
            fieldProps: { disablePast: !allowPastDates, helperText: 'Submission deadline; attempts after this are marked late.' },
            label: 'Due At',
            name: 'due_at',
            rules: { deps: 'closes_at', validate: validateNotPast('Due date') },
            type: 'datetime'
        },
        {
            fieldProps: { disablePast: !allowPastDates, helperText: 'Hard cutoff; no submissions accepted after this.' },
            label: 'Closes At',
            name: 'closes_at',
            rules: {
                validate: {
                    notPast: validateNotPast('Closing date'),
                    afterDue: function(value) {
                        const due = settingsMethods.getValues('due_at');
                        if (typeof value !== 'string' || !value || !due) return true;
                        return new Date(value)
                            .getTime() >= new Date(due)
                            .getTime() || 'Closing date must be on or after the due date.';
                    }
                }
            },
            type: 'datetime'
        },
        {
            fieldProps: { disablePast: !allowPastDates, helperText: 'When students can review scores and answers.' },
            label: 'Show Results At',
            name: 'show_results_at',
            rules: { validate: validateNotPast('Results release date') },
            type: 'datetime'
        }
    ];

    const step2OptionFields: FormFieldConfig<AssessmentFormValues>[] = [
        {
            fieldProps: { label: 'Let students review questions after closing' },
            name: 'allow_student_review',
            type: 'checkbox'
        },
        {
            fieldProps: { label: 'Allow past dates for due, closing and results (backdating)' },
            name: 'allow_past_dates',
            type: 'checkbox'
        }
    ];

    const step4DisplayFields: FormFieldConfig<AssessmentFormValues>[] = [
        {
            fieldProps: { label: 'Shuffle questions per student attempt' },
            name: 'shuffle_questions',
            type: 'checkbox'
        },
        {
            fieldProps: { label: 'Shuffle answer choices per question' },
            name: 'shuffle_choices',
            type: 'checkbox'
        },
        {
            fieldProps: { label: 'Display all questions at once (single page)' },
            name: 'show_all_questions',
            type: 'checkbox'
        },
        ...(showAllQuestions
            ? []
            : [
                {
                    label: 'Questions Per Page',
                    name: 'questions_per_page' as const,
                    placeholder: 'e.g. 5',
                    rules: {
                        required: 'Required when questions are paginated',
                        validate: validateWholeNumber('Questions per page', false)
                    },
                    type: 'number' as const
                }
            ])
    ];

    function handleCloseModal() {
        if (isSaving) return;
        if (!readOnly && draftGuard.hasRealChanges) {
            setIsConfirmCloseOpen(true);
            return;
        }
        draftGuard.clearDraft();
        onClose();
    }

    function handleDiscardAndClose() {
        setIsConfirmCloseOpen(false);
        draftGuard.clearDraft();
        onClose();
    }

    return (
        <CommonModal
            cardProps={{
                className: 'w-full max-w-4xl p-0 overflow-hidden flex flex-col max-h-[92vh]'
            }}
            fullWidth
            maxWidth="lg"
            open={open}
            onClose={handleCloseModal}
        >
            {/* Modal Top Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                            <NotepadIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1 sm:min-w-[260px]">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                {readOnly
                                    ? 'View Assessment Details'
                                    : activeAssessmentId && !isNew
                                        ? `Edit Assessment: ${settingsMethods.watch('title') || 'Untitled'}`
                                        : 'Create Assessment Builder'}
                            </h2>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Unified setup for assessment identity, schedule, grading component, questions, and display rules.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Close"
                            type="button"
                            onClick={handleCloseModal}
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stepper Progress Bar Header */}
            <ModalStepperHeader
                currentStep={currentStep}
                readOnly={readOnly}
                steps={ASSESSMENT_WIZARD_STEPS}
                onStepClick={handleStepClick}
            />

            {/* Wizard Step Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-900/40">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-500">Loading assessment details...</p>
                    </div>
                ) : (
                    <>
                        {/* Step 1: Overview & Grading */}
                        {currentStep === 1 && (
                            <div className="flex flex-col gap-4">
                                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm block mb-3">
                                        Assessment Identity & Grading Component
                                    </span>
                                    <CommonForm
                                        containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                                        control={settingsMethods.control}
                                        fields={step1Fields}
                                        formProps={{
                                            id: 'assessment-wizard-step1-form',
                                            onSubmit: (e) => e.preventDefault()
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 2: Schedule & Timing */}
                        {currentStep === 2 && (
                            <div className="flex flex-col gap-4">
                                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs flex flex-col gap-4">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                        Time Limits & Attempt Controls
                                    </span>
                                    <CommonForm
                                        component="div"
                                        containerClassName="grid grid-cols-1 sm:grid-cols-2 gap-4"
                                        control={settingsMethods.control}
                                        enableDraftRecovery={false}
                                        fields={step2TimingFields}
                                    />

                                    <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 flex flex-col gap-4">
                                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                            Availability & Deadlines
                                        </span>
                                        <CommonForm
                                            component="div"
                                            containerClassName="grid grid-cols-1 sm:grid-cols-2 gap-4"
                                            control={settingsMethods.control}
                                            enableDraftRecovery={false}
                                            fields={step2ScheduleFields}
                                        />

                                        <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-slate-100 dark:border-zinc-800">
                                            <CommonForm
                                                component="div"
                                                containerClassName="flex flex-col gap-2"
                                                control={settingsMethods.control}
                                                enableDraftRecovery={false}
                                                fields={step2OptionFields}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Questions & Content */}
                        {currentStep === 3 && (
                            <div className="flex flex-col gap-4">
                                {activeAssessmentId
                                    ? (
                                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
                                            <QuestionList
                                                assessmentDbId={activeAssessmentId}
                                                configuredTotalPoints={configuredTotalPoints}
                                                expandedQuestionId={expandedQuestionId}
                                                questions={questions}
                                                onAddQuestion={handleOpenAddQuestion}
                                                onDeleteQuestion={handleDeleteQuestion}
                                                onEditQuestion={handleOpenEditQuestion}
                                                onImportQuestions={() => setIsImportOpen(true)}
                                                onSyncTotalPoints={handleSyncTotalPoints}
                                                onToggleExpand={handleToggleExpand}
                                            />
                                        </div>
                                    )
                                    : (
                                        <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
                                            <p className="text-slate-500 text-sm">
                                            Please complete Step 1 to initialize the assessment before adding questions.
                                            </p>
                                        </div>
                                    )}
                            </div>
                        )}

                        {/* Step 4: Settings & Rubrics */}
                        {currentStep === 4 && (
                            <div className="flex flex-col gap-4">
                                {activeAssessmentId && (
                                    <RubricAttachPanel
                                        assessmentId={activeAssessmentId}
                                        sectionId={sectionId}
                                    />
                                )}

                                <AssessmentAttachmentPanel
                                    assessmentDbId={activeAssessmentId}
                                    attachments={attachments}
                                    onAttachmentsChange={refreshAttachments}
                                />

                                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs flex flex-col gap-3">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                        Question Presentation & Display Rules
                                    </span>
                                    <CommonForm
                                        component="div"
                                        containerClassName="grid grid-cols-1 sm:grid-cols-2 gap-3"
                                        control={settingsMethods.control}
                                        enableDraftRecovery={false}
                                        fields={step4DisplayFields}
                                    />
                                </div>

                                {/* Summary Card */}
                                <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-800/60 flex items-center justify-between gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wide">
                                            Points Summary
                                        </span>
                                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                                            Configured Total: <strong>{configuredTotalPoints} pts</strong> | Questions Sum: <strong>{questionSumPoints} pts</strong> ({questions.length} question{questions.length === 1
                                                ? ''
                                                : 's'})
                                        </p>
                                    </div>
                                    {questionSumPoints !== configuredTotalPoints && (
                                        <CommonButton
                                            color="primary"
                                            size="small"
                                            variant="outlined"
                                            onClick={() => handleSyncTotalPoints(questionSumPoints)}
                                        >
                                            Sync to {questionSumPoints} pts
                                        </CommonButton>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Sticky Bottom Action Bar */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shrink-0 flex items-center justify-between gap-3 safe-bottom z-10">
                {/* Back Button */}
                <CommonButton
                    color="inherit"
                    disabled={currentStep === 1 || isLoading || isSaving}
                    size="medium"
                    startIcon={<ArrowLeftIcon className="w-4 h-4" />}
                    variant="outlined"
                    onClick={handleBack}
                >
                    Back
                </CommonButton>

                {/* Step indicator on desktop */}
                <div className="hidden sm:block text-xs font-medium text-slate-500">
                    Step {currentStep} of 4 — {currentStepConfig?.title}
                </div>

                {/* Next / Save Action */}
                <div className="flex items-center gap-2">
                    {currentStep < 4
                        ? (
                            <CommonButton
                                color="primary"
                                disabled={isLoading || isSaving}
                                endIcon={<ArrowRightIcon className="w-4 h-4" />}
                                size="medium"
                                variant="contained"
                                onClick={handleNext}
                            >
                            Next Step
                            </CommonButton>
                        )
                        : readOnly
                            ? (
                                <CommonButton
                                    color="primary"
                                    size="medium"
                                    variant="contained"
                                    onClick={handleCloseModal}
                                >
                            Close
                                </CommonButton>
                            )
                            : (
                                <CommonButton
                                    color="primary"
                                    disabled={isLoading || isSaving}
                                    loading={isSaving}
                                    size="medium"
                                    startIcon={<FloppyDiskIcon className="w-4 h-4" />}
                                    variant="contained"
                                    onClick={handleSaveAssessment}
                                >
                                    {isSaving
                                        ? 'Saving Assessment...'
                                        : isNew
                                            ? 'Save Assessment'
                                            : 'Save Changes'}
                                </CommonButton>
                            )}
                </div>
            </div>

            {/* Sub-modals */}
            <BulkImportModal<QuestionBulkRow>
                open={isImportOpen}
                templateColumns={QUESTION_TEMPLATE_COLUMNS}
                templateDownloadFilename="questions_template.csv"
                title="Import Questions"
                onBulkImport={(rows: QuestionBulkRow[]) => {
                    return bulkImportQuestions(activeAssessmentId, rows);
                }}
                onClose={() => {
                    setIsImportOpen(false);
                    refreshQuestions();
                }}
                onMapRow={(row) => ({
                    // Header aliases are already folded into the template keys by the parser
                    choices: (row.choices ?? '').trim(),
                    explanation: row.explanation ?? '',
                    is_required: row.is_required ?? '',
                    points: row.points ?? '',
                    question_text: row.question_text ?? '',
                    question_type: row.question_type ?? ''
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
            <DraftRecoveryPromptModal
                open={draftGuard.isPromptOpen}
                onContinue={draftGuard.handleContinue}
                onDiscard={draftGuard.handleDiscard}
            />
            <DiscardChangesPromptModal
                open={isConfirmCloseOpen}
                onContinueEditing={() => setIsConfirmCloseOpen(false)}
                onDiscard={handleDiscardAndClose}
            />
        </CommonModal>
    );
}