import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import AssessmentWizardModal from '@pages/faculty/sections/assessments/builder/AssessmentWizardModal';
import DuplicateToSectionsModal from '@pages/shared/content/DuplicateToSectionsModal';
import RubricsTab from '@pages/faculty/sections/rubrics/RubricsTab';
import {
    CalendarBlankIcon,
    CheckCircleIcon,
    CopySimpleIcon,
    EyeIcon,
    EyeSlashIcon,
    FilesIcon,
    ListChecksIcon,
    NotepadIcon,
    PencilSimpleIcon,
    PlusIcon,
    QuestionIcon,
    TrashIcon
} from '@phosphor-icons/react';
import {
    deleteAssessment,
    duplicateAssessmentToSections,
    listAssessments,
    publishAssessment,
    unpublishAssessment
} from '@services/assessment.service';
import { AssessmentListRow, AssessmentType } from '@type/assessment.type';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TYPE_VARIANT_MAP: Record<AssessmentType, 'success' | 'error' | 'warning' | 'info'> = {
    Quiz: 'info',
    Exam: 'error',
    Activity: 'success',
    Assignment: 'warning',
    Project: 'info',
    'Lab Report': 'info'
};

const TYPE_COLOR_MAP: Record<AssessmentType, { bg: string; text: string; border: string }> = {
    Quiz: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
    Exam: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
    Activity: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
    Assignment: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
    Project: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
    'Lab Report': { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' }
};

interface AssessmentsTabProps {
    sectionId: string;
}

export default function AssessmentsTab({ sectionId }: AssessmentsTabProps) {
    const navigate = useNavigate();
    const [activeView, setActiveView] = useState<'assessments' | 'rubrics'>('assessments');
    const [assessments, setAssessments] = useState<AssessmentListRow[]>([]);
    const [duplicating, setDuplicating] = useState<AssessmentListRow | null>(null);

    // Stepper Wizard Modal state
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardAssessmentId, setWizardAssessmentId] = useState<string | null>(null);

    useEffect(function() {
        fetchAssessments();
    }, [sectionId]);

    async function fetchAssessments() {
        const result = await listAssessments(sectionId);
        if (result.data) {
            setAssessments(result.data);
        }
    }

    async function handlePublishToggle(row: AssessmentListRow) {
        const result = row.is_published
            ? await unpublishAssessment(row.id)
            : await publishAssessment(row.id);

        if (!result.error) {
            await fetchAssessments();
        }
    }

    async function handleDelete(id: string) {
        const result = await deleteAssessment(id);
        if (!result.error) {
            await fetchAssessments();
        }
    }

    function handleOpenCreateWizard() {
        setWizardAssessmentId(null);
        setIsWizardOpen(true);
    }

    function handleOpenEditWizard(assessmentId: string) {
        setWizardAssessmentId(assessmentId);
        setIsWizardOpen(true);
    }

    return (
        <div className="flex flex-col gap-4 h-full min-h-0">
            {/* Top Toolbar */}
            <div className="flex flex-wrap gap-2 items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
                <div className="flex gap-1.5 items-center">
                    <button
                        type="button"
                        onClick={() => setActiveView('assessments')}
                        className={`px-3.5 py-1.5 text-xs rounded-full font-bold transition-all cursor-pointer ${
                            activeView === 'assessments'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Assessments ({assessments.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveView('rubrics')}
                        className={`px-3.5 py-1.5 text-xs rounded-full font-bold transition-all cursor-pointer ${
                            activeView === 'rubrics'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Grading Rubrics
                    </button>
                </div>
                {activeView === 'assessments' && (
                    <CommonButton
                        size="small"
                        startIcon={<PlusIcon size={16} weight="bold" />}
                        variant="contained"
                        onClick={handleOpenCreateWizard}
                    >
                        New Assessment
                    </CommonButton>
                )}
            </div>

            {activeView === 'rubrics' ? (
                <div className="flex-1 min-h-0 overflow-y-auto">
                    <RubricsTab sectionId={sectionId} />
                </div>
            ) : (
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {assessments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                                <NotepadIcon size={28} weight="duotone" />
                            </div>
                            <div className="flex flex-col gap-1 max-w-sm">
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    No assessments created yet
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Create quizzes, exams, assignments, or activities for this section using the step-by-step Assessment Builder.
                                </p>
                            </div>
                            <CommonButton
                                size="small"
                                startIcon={<PlusIcon size={16} weight="bold" />}
                                variant="contained"
                                onClick={handleOpenCreateWizard}
                            >
                                Create First Assessment
                            </CommonButton>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                            {assessments.map((item) => {
                                const typeStyle = TYPE_COLOR_MAP[item.assessment_type] || TYPE_COLOR_MAP.Quiz;
                                const isPub = item.is_published;

                                return (
                                    <div
                                        key={item.id}
                                        className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4.5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between select-none relative group h-full"
                                    >
                                        <div>
                                            {/* Header: Type Badge + Status Badge + Actions */}
                                            <div className="flex items-center justify-between mb-3 gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
                                                    >
                                                        {item.assessment_type}
                                                    </span>
                                                    <span
                                                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                                            isPub
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                                        }`}
                                                    >
                                                        {isPub ? 'Published' : 'Draft'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        title="Copy to other sections"
                                                        onClick={() => setDuplicating(item)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                                    >
                                                        <CopySimpleIcon size={16} weight="bold" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="Delete Assessment"
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                    >
                                                        <TrashIcon size={16} weight="bold" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Assessment Title */}
                                            <div className="mb-3">
                                                <h3 className="font-bold leading-snug text-base text-slate-900 dark:text-slate-100 tracking-tight line-clamp-2">
                                                    {item.title}
                                                </h3>
                                            </div>

                                            {/* Bento Metrics Grid */}
                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                <div className="bg-slate-50/90 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/80 p-2.5 rounded-xl">
                                                    <span className="block font-medium leading-none text-[10px] text-slate-400">
                                                        Points
                                                    </span>
                                                    <span className="font-bold leading-tight mt-1 text-slate-800 dark:text-slate-200 text-xs block">
                                                        {item.total_points} pts
                                                    </span>
                                                </div>
                                                <div className="bg-slate-50/90 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/80 p-2.5 rounded-xl">
                                                    <span className="block font-medium leading-none text-[10px] text-slate-400">
                                                        Questions
                                                    </span>
                                                    <span className="font-bold leading-tight mt-1 text-slate-800 dark:text-slate-200 text-xs block">
                                                        {item.question_count}
                                                    </span>
                                                </div>
                                                <div className="bg-slate-50/90 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/80 p-2.5 rounded-xl">
                                                    <span className="block font-medium leading-none text-[10px] text-slate-400">
                                                        Submissions
                                                    </span>
                                                    <span className="font-bold leading-tight mt-1 text-slate-800 dark:text-slate-200 text-xs block">
                                                        {item.submission_count}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Due Date Fact */}
                                            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/60 mb-3.5">
                                                <CalendarBlankIcon size={14} className="text-slate-400 shrink-0" />
                                                <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                                    Due:{' '}
                                                    <strong>
                                                        {item.due_at
                                                            ? new Date(item.due_at).toLocaleDateString(undefined, {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })
                                                            : 'No deadline'}
                                                    </strong>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Bento Card Footer Action Bar */}
                                        <div className="border-t border-slate-100 dark:border-zinc-800 pt-3 flex items-center justify-between gap-2 mt-auto">
                                            <button
                                                type="button"
                                                onClick={() => handlePublishToggle(item)}
                                                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                                                    isPub
                                                        ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                                }`}
                                            >
                                                {isPub ? <EyeSlashIcon size={14} weight="bold" /> : <EyeIcon size={14} weight="bold" />}
                                                {isPub ? 'Unpublish' : 'Publish'}
                                            </button>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/faculty/sections/${sectionId}/assessments/${item.id}/submissions`)}
                                                    className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                                >
                                                    <ListChecksIcon size={14} weight="bold" />
                                                    Submissions
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEditWizard(item.id)}
                                                    className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                                >
                                                    <PencilSimpleIcon size={14} weight="bold" />
                                                    Builder
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {duplicating && (
                        <DuplicateToSectionsModal
                            entityLabel="Assessment"
                            entityTitle={duplicating.title}
                            open={duplicating !== null}
                            sectionId={sectionId}
                            onClose={() => setDuplicating(null)}
                            onConfirm={(sectionIds: string[]) => duplicateAssessmentToSections(duplicating.id, sectionIds)}
                            onDuplicated={fetchAssessments}
                        />
                    )}
                </div>
            )}

            {/* Stepper Assessment Builder Wizard Modal */}
            <AssessmentWizardModal
                assessmentId={wizardAssessmentId}
                open={isWizardOpen}
                sectionId={sectionId}
                onClose={() => setIsWizardOpen(false)}
                onSuccess={fetchAssessments}
            />
        </div>
    );
}