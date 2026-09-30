import EntityFormPage from '@components/entity-form/EntityFormPage';
import EvaluationTemplateFormPanel from '@pages/admin/evaluation-management/EvaluationTemplateForm';
import EvaluationTemplateViewPanel from '@pages/admin/evaluation-management/EvaluationTemplateViewPanel';
import { createEvaluationTemplate, getEvaluationTemplateById, updateEvaluationTemplate } from '@services/evaluation.service';
import { EvaluationTemplateForm } from '@type/evaluation.type';
import { ServiceResult } from '@type/service.type';

const FORM_ID = 'evaluation-template-form';

const BASE_PATH = '/admin/evaluations';

const DEFAULT_QUESTIONS = [
    {
        question_text: '',
        question_type: 'Rating' as const,
        is_required: true,
        min_rating: '1',
        max_rating: '5'
    }
];

const DEFAULT_VALUES: EvaluationTemplateForm = {
    title: '',
    description: '',
    is_active: true,
    sequence: '1',
    target_mode: 'INCLUDE',
    suggestion_placeholder: '',
    program_ids: [],
    questions: DEFAULT_QUESTIONS
};

async function fetchTemplate(id: string): Promise<ServiceResult<EvaluationTemplateForm>> {
    const result = await getEvaluationTemplateById(id);

    if (!result.data) {
        return { data: null, error: result.error };
    }

    return {
        data: {
            id: result.data.id,
            title: result.data.title,
            description: result.data.description ?? '',
            is_active: result.data.is_active,
            sequence: String(result.data.sequence ?? 1),
            target_mode: result.data.target_mode ?? 'INCLUDE',
            suggestion_placeholder: result.data.suggestion_placeholder ?? '',
            program_ids: result.data.program_ids ?? [],
            questions: result.data.questions.length
                ? result.data.questions.map(function(question) {
                    return {
                        id: question.id,
                        question_text: question.question_text,
                        question_type: question.question_type,
                        is_required: question.is_required,
                        min_rating: String(question.min_rating ?? 1),
                        max_rating: String(question.max_rating ?? 5)
                    };
                })
                : DEFAULT_QUESTIONS
        },
        error: null
    };
}

export default function EvaluationTemplateDetailPage() {
    return (
        <EntityFormPage<EvaluationTemplateForm>
            backTo={BASE_PATH}
            defaultValues={DEFAULT_VALUES}
            fetchById={fetchTemplate}
            formId={FORM_ID}
            renderForm={function({ control, disabled, id, onSubmit }) {
                return (
                    <EvaluationTemplateFormPanel
                        control={control}
                        disabled={disabled}
                        id={id}
                        onSubmit={onSubmit}
                    />
                );
            }}
            subheader={{
                create: 'Define a section, its program scope, and its questions.',
                edit: 'Update this section, its program scope, and its questions.',
                view: 'Viewing evaluation section details.'
            }}
            title={{
                create: 'Add Evaluation Section',
                edit: 'Edit Evaluation Section',
                view: 'View Evaluation Section'
            }}
            renderView={function(values) {
                return <EvaluationTemplateViewPanel values={values} />;
            }}
            onCreate={createEvaluationTemplate}
            onUpdate={updateEvaluationTemplate}
        />
    );
}