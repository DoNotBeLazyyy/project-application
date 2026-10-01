import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonModal from '@components/modal/CommonModal';
import CommonTextarea from '@components/textarea/CommonTextarea';
import DiscussionAttachmentPicker from '@pages/shared/discussion/DiscussionAttachmentPicker';
import DiscussionThreadView from '@pages/shared/discussion/DiscussionThreadView';
import {
    CalendarBlankIcon,
    ChatCircleTextIcon,
    ChatDotsIcon,
    CheckCircleIcon,
    PaperPlaneTiltIcon,
    PlusIcon,
    PushPinIcon,
    UserIcon,
    XIcon
} from '@phosphor-icons/react';
import { createThread, listSectionThreads, uploadDiscussionFile } from '@services/discussion.service';
import { useToastStore } from '@stores/toast.store';
import { DiscussionAttachmentPayload, DiscussionThreadRow } from '@type/discussion.type';
import { formatDate } from '@utils/date.util';
import { extractClipboardFiles } from '@utils/file.util';
import { ChangeEvent, ClipboardEvent, useEffect, useState } from 'react';

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const COMPOSE_TEXTAREA_SX = {
    '& .common_textarea_html_input': {
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        resize: 'none'
    }
};

interface SectionDiscussionPanelProps {
    sectionId: string;
}

export default function SectionDiscussionPanel({ sectionId }: SectionDiscussionPanelProps) {
    const [threads, setThreads] = useState<DiscussionThreadRow[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [filterMode, setFilterMode] = useState<'All' | 'Pinned' | 'Unanswered' | 'Resolved'>('All');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const showToast = useToastStore((s) => s.showToast);

    async function loadThreads() {
        const result = await listSectionThreads(sectionId, 1, 50, '', []);
        if (result.data) {
            setThreads(result.data.content);
        }
    }

    useEffect(function() {
        loadThreads();
    }, [sectionId]);

    const filteredThreads = threads.filter((t) => {
        if (filterMode === 'Pinned') return t.is_pinned;
        if (filterMode === 'Unanswered') return t.reply_count === 0 && !t.is_resolved;
        if (filterMode === 'Resolved') return t.is_resolved;
        return true;
    });

    function resetComposer() {
        setIsCreateOpen(false);
        setTitle('');
        setBody('');
        setFiles([]);
        setIsUploading(false);
    }

    function handleAddFiles(added: File[]) {
        const accepted = added.filter(function(file) {
            if (file.size > MAX_ATTACHMENT_BYTES) {
                showToast(`${file.name} is larger than 25 MB and was skipped.`, 'warning');
                return false;
            }
            return true;
        });

        if (accepted.length > 0) {
            setFiles((prev) => [...prev, ...accepted]);
        }
    }

    function handleRemoveFile(index: number) {
        setFiles((prev) => prev.filter((_file, i) => i !== index));
    }

    function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
        const pasted = extractClipboardFiles(event.clipboardData);
        if (pasted.length === 0) return;
        event.preventDefault();
        handleAddFiles(pasted);
    }

    async function handleCreate() {
        if (!title.trim() || !body.trim() || isUploading) return;

        setIsUploading(true);
        const uploaded: DiscussionAttachmentPayload[] = [];

        for (const file of files) {
            const upload = await uploadDiscussionFile(sectionId, file);
            if (upload.error || !upload.data) {
                setIsUploading(false);
                showToast(`Failed to upload ${file.name}.`, 'error');
                return;
            }
            uploaded.push(upload.data);
        }

        const result = await createThread(sectionId, title.trim(), body.trim(), uploaded);
        setIsUploading(false);

        if (!result.error) {
            resetComposer();
            await loadThreads();
        }
    }

    const FILTER_OPTIONS: ('All' | 'Pinned' | 'Unanswered' | 'Resolved')[] = ['All', 'Pinned', 'Unanswered', 'Resolved'];

    return (
        <div className="flex flex-col gap-4 h-full min-h-0">
            {/* Top Toolbar */}
            <div className="flex flex-wrap gap-2 items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
                <div className="flex flex-wrap gap-1.5 items-center">
                    {FILTER_OPTIONS.map((f) => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setFilterMode(f)}
                            className={`px-3 py-1.5 text-xs rounded-full font-bold transition-all cursor-pointer ${
                                filterMode === f
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            {f === 'All' ? `All Threads (${threads.length})` : f}
                        </button>
                    ))}
                </div>

                <CommonButton
                    size="small"
                    startIcon={<PlusIcon size={16} weight="bold" />}
                    variant="contained"
                    onClick={() => setIsCreateOpen(true)}
                >
                    New Discussion
                </CommonButton>
            </div>

            {/* Discussion Threads Bento Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {filteredThreads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/50">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mb-3">
                            <ChatCircleTextIcon size={26} weight="duotone" />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            No {filterMode !== 'All' ? filterMode.toLowerCase() : ''} discussions found
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm mt-1">
                            Start a discussion thread to engage students in questions, peer reviews, or topic debates.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                        {filteredThreads.map((thread) => (
                            <div
                                key={thread.id}
                                onClick={() => setSelectedThreadId(thread.id)}
                                className={`rounded-2xl p-4.5 border transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-2xs hover:shadow-md ${
                                    thread.is_pinned
                                        ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200/90 dark:border-amber-800/80 hover:border-amber-400'
                                        : 'bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-700'
                                }`}
                            >
                                <div>
                                    {/* Badges Header */}
                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {thread.is_pinned && (
                                                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                    <PushPinIcon size={12} weight="fill" />
                                                    Pinned
                                                </span>
                                            )}
                                            {thread.is_resolved && (
                                                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                    <CheckCircleIcon size={12} weight="fill" />
                                                    Resolved
                                                </span>
                                            )}
                                        </div>

                                        {/* Reply Counter Badge */}
                                        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300">
                                            <ChatDotsIcon size={13} weight="bold" />
                                            {thread.reply_count}
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
                                        {thread.title}
                                    </h3>

                                    {/* Preview */}
                                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed mb-3">
                                        {thread.body}
                                    </p>
                                </div>

                                {/* Footer: Author + Date */}
                                <div className="border-t border-slate-100 dark:border-zinc-800 pt-2.5 flex items-center justify-between text-slate-400 text-xs mt-auto">
                                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                        <UserIcon size={13} />
                                        {thread.author_name}
                                    </span>
                                    <span className="flex items-center gap-1 text-[11px]">
                                        <CalendarBlankIcon size={13} />
                                        {formatDate(new Date(thread.created_at))}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Read Modal: DiscussionThreadModal */}
            <CommonModal
                dialogProps={{
                    fullWidth: true,
                    maxWidth: 'md'
                }}
                open={Boolean(selectedThreadId)}
                onClose={() => {
                    setSelectedThreadId(null);
                    loadThreads();
                }}
            >
                <div className="flex flex-col h-[85vh] max-h-[760px] bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden p-4 sm:p-6">
                    {selectedThreadId && (
                        <DiscussionThreadView
                            threadId={selectedThreadId}
                            onBack={() => {
                                setSelectedThreadId(null);
                                loadThreads();
                            }}
                            onDeleted={() => {
                                setSelectedThreadId(null);
                                loadThreads();
                            }}
                        />
                    )}
                </div>
            </CommonModal>

            {/* Write Modal: Create Discussion */}
            <CommonModal
                dialogProps={{
                    fullWidth: true,
                    maxWidth: 'sm'
                }}
                open={isCreateOpen}
                onClose={resetComposer}
            >
                <div className="flex flex-col bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden p-5 sm:p-6 gap-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                                <ChatCircleTextIcon size={18} weight="duotone" />
                            </div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                                New Discussion Thread
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={resetComposer}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <XIcon size={18} weight="bold" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Discussion Title <span className="text-rose-500">*</span>
                            </label>
                            <CommonInput
                                fullWidth
                                placeholder="e.g. Question regarding Week 3 Database Normalization"
                                size="small"
                                value={title}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Message / Details <span className="text-rose-500">*</span>
                            </label>
                            <CommonTextarea
                                maxLength={2000}
                                placeholder="What would you like to discuss with the class? You can also paste screenshots directly."
                                sx={COMPOSE_TEXTAREA_SX}
                                value={body}
                                onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setBody(e.target.value)}
                                onPaste={handlePaste}
                            />
                        </div>

                        <div className="flex flex-col gap-1 pt-1">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Attachments (optional)
                            </span>
                            <DiscussionAttachmentPicker
                                files={files}
                                isDisabled={isUploading}
                                onAdd={handleAddFiles}
                                onRemove={handleRemoveFile}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                        <CommonButton
                            size="small"
                            variant="outlined"
                            onClick={resetComposer}
                            disabled={isUploading}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            size="small"
                            startIcon={<PaperPlaneTiltIcon size={16} weight="bold" />}
                            variant="contained"
                            disabled={!title.trim() || !body.trim() || isUploading}
                            onClick={handleCreate}
                        >
                            {isUploading ? 'Posting...' : 'Post Discussion'}
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>
        </div>
    );
}