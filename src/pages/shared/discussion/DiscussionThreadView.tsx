import CommonButton from '@components/button/CommonButton';
import CommonTextarea from '@components/textarea/CommonTextarea';
import DiscussionAttachmentList from '@pages/shared/discussion/DiscussionAttachmentList';
import DiscussionAttachmentPicker from '@pages/shared/discussion/DiscussionAttachmentPicker';
import { ArrowLeftIcon, CheckCircleIcon, PushPinIcon, TrashIcon } from '@phosphor-icons/react';
import {
    deletePost, deleteThread, getDiscussionThread, replyToThread, setPostAnswer,
    setThreadPinned, setThreadResolved, uploadDiscussionFile
} from '@services/discussion.service';
import { useAppStore } from '@stores/app.store';
import { useToastStore } from '@stores/toast.store';
import { DiscussionAttachmentPayload, DiscussionThreadDetail } from '@type/discussion.type';
import { formatDate } from '@utils/date.util';
import { extractClipboardFiles } from '@utils/file.util';
import {
    ChangeEvent, ClipboardEvent, KeyboardEvent, useEffect, useState
} from 'react';

const REPLY_MAX_LENGTH = 2000;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const REPLY_TEXTAREA_SX = {
    '& .common_textarea_html_input': {
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        resize: 'none'
    }
};

interface DiscussionThreadViewProps {
    threadId: string;
    onBack: () => void;
    onDeleted: () => void;
}

export default function DiscussionThreadView({
    threadId,
    onBack,
    onDeleted
}: DiscussionThreadViewProps) {
    const myId = useAppStore((s) => s.userProfile?.id);
    const showToast = useToastStore((s) => s.showToast);
    const [thread, setThread] = useState<DiscussionThreadDetail | null>(null);
    const [replyBody, setReplyBody] = useState('');
    const [replyFiles, setReplyFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    async function loadThread() {
        const result = await getDiscussionThread(threadId);

        if (result.data) {
            setThread(result.data);
        }
    }

    useEffect(function() {
        loadThread();
    }, [threadId]);

    function handleAddFiles(files: File[]) {
        const accepted = files.filter(function(file) {
            if (file.size > MAX_ATTACHMENT_BYTES) {
                showToast(`${file.name} is larger than 25 MB and was skipped.`, 'warning');

                return false;
            }

            return true;
        });

        if (accepted.length > 0) {
            setReplyFiles(function(prev) {
                return [...prev, ...accepted];
            });
        }
    }

    function handleRemoveFile(index: number) {
        setReplyFiles(function(prev) {
            return prev.filter(function(_file, i) {
                return i !== index;
            });
        });
    }

    function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
        const pasted = extractClipboardFiles(event.clipboardData);

        if (pasted.length === 0) {
            return;
        }

        event.preventDefault();
        handleAddFiles(pasted);
    }

    async function handleReply() {
        if (!replyBody.trim() || !thread || isUploading) {
            return;
        }

        setIsUploading(true);

        const uploaded: DiscussionAttachmentPayload[] = [];

        for (const file of replyFiles) {
            const upload = await uploadDiscussionFile(thread.section_id, file);

            if (upload.error || !upload.data) {
                setIsUploading(false);
                showToast(`Failed to upload ${file.name}.`, 'error');

                return;
            }

            uploaded.push(upload.data);
        }

        const result = await replyToThread(threadId, replyBody.trim(), uploaded);

        setIsUploading(false);

        if (!result.error) {
            setReplyBody('');
            setReplyFiles([]);
            await loadThread();
        }
    }

    function handleReplyKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key !== 'Enter') {
            return;
        }

        const target = event.target as HTMLTextAreaElement;

        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();

            const start = target.selectionStart ?? replyBody.length;
            const end = target.selectionEnd ?? start;
            const nextBody = `${replyBody.slice(0, start)}\n${replyBody.slice(end)}`;

            if (nextBody.length > REPLY_MAX_LENGTH) {
                return;
            }

            setReplyBody(nextBody);
            requestAnimationFrame(() => {
                target.setSelectionRange(start + 1, start + 1);
            });

            return;
        }

        if (event.shiftKey || event.altKey) {
            return;
        }

        event.preventDefault();
        handleReply();
    }

    async function handleDeleteThread() {
        const result = await deleteThread(threadId);

        if (!result.error) {
            onDeleted();
        }
    }

    async function handleTogglePin() {
        if (!thread) {
            return;
        }

        await setThreadPinned(threadId, !thread.is_pinned);
        await loadThread();
    }

    async function handleToggleResolved() {
        if (!thread) {
            return;
        }

        await setThreadResolved(threadId, !thread.is_resolved);
        await loadThread();
    }

    async function handleToggleAnswer(postId: string, isAnswer: boolean) {
        await setPostAnswer(postId, !isAnswer);
        await loadThread();
    }

    async function handleDeletePost(postId: string) {
        await deletePost(postId);
        await loadThread();
    }

    if (!thread) {
        return (
            <p className="py-8 text-(--mui-palette-text-secondary) text-center text-sm">
                Loading discussion...
            </p>
        );
    }

    const isThreadOwner = Boolean(myId) && thread.created_by === myId;
    const canManageThread = thread.can_moderate || isThreadOwner;

    return (
        <div className="flex flex-col gap-4 h-full min-h-0 overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
                <CommonButton
                    color="inherit"
                    size="small"
                    startIcon={<ArrowLeftIcon size={16} weight="bold" />}
                    variant="outlined"
                    onClick={onBack}
                >
                    Back
                </CommonButton>
                <div className="flex gap-2 items-center">
                    {thread.can_moderate && (
                        <CommonButton
                            color={thread.is_pinned
                                ? 'primary'
                                : 'inherit'}
                            size="small"
                            startIcon={<PushPinIcon
                                size={16}
                                weight={thread.is_pinned
                                    ? 'fill'
                                    : 'regular'} />}
                            variant="outlined"
                            onClick={handleTogglePin}
                        >
                            {thread.is_pinned
                                ? 'Unpin'
                                : 'Pin'}
                        </CommonButton>
                    )}
                    {canManageThread && (
                        <CommonButton
                            color={thread.is_resolved
                                ? 'success'
                                : 'inherit'}
                            size="small"
                            startIcon={<CheckCircleIcon
                                size={16}
                                weight={thread.is_resolved
                                    ? 'fill'
                                    : 'regular'} />}
                            variant="outlined"
                            onClick={handleToggleResolved}
                        >
                            {thread.is_resolved
                                ? 'Resolved'
                                : 'Mark resolved'}
                        </CommonButton>
                    )}
                    {canManageThread && (
                        <CommonButton
                            color="error"
                            size="small"
                            startIcon={<TrashIcon size={16} />}
                            variant="outlined"
                            onClick={handleDeleteThread}
                        >
                            Delete
                        </CommonButton>
                    )}
                </div>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-(--mui-palette-divider) p-4">
                <div className="flex gap-2 items-center">
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-lg">
                        {thread.title}
                    </h2>
                    {thread.is_resolved && (
                        <span className="text-(--mui-palette-success-main) text-xs">
                            Resolved
                        </span>
                    )}
                </div>
                <p className="text-(--mui-palette-text-primary) text-sm whitespace-pre-wrap">
                    {thread.body}
                </p>
                <DiscussionAttachmentList attachments={thread.attachments ?? []} />
                <span className="text-(--mui-palette-text-disabled) text-xs">
                    {thread.author_name} · {formatDate(new Date(thread.created_at))}
                </span>
            </div>
            <div className="flex flex-col gap-3">
                <span className="font-medium text-(--mui-palette-text-secondary) text-sm">
                    {thread.posts.length} Repl{thread.posts.length === 1
                        ? 'y'
                        : 'ies'}
                </span>
                {thread.posts.map(function(post) {
                    const isPostOwner = Boolean(myId) && post.created_by === myId;

                    return (
                        <div
                            className={
                                post.is_answer
                                    ? 'flex flex-col gap-2 rounded-lg border border-(--mui-palette-success-main) bg-(--mui-palette-success-main)/5 p-4'
                                    : 'flex flex-col gap-2 rounded-lg border border-(--mui-palette-divider) p-4'
                            }
                            key={post.id}
                        >
                            {post.is_answer && (
                                <span className="font-medium text-(--mui-palette-success-main) text-xs">
                                    Accepted answer
                                </span>
                            )}
                            <p className="text-(--mui-palette-text-primary) text-sm whitespace-pre-wrap">
                                {post.body}
                            </p>
                            <DiscussionAttachmentList attachments={post.attachments ?? []} />
                            <div className="flex items-center justify-between">
                                <span className="text-(--mui-palette-text-disabled) text-xs">
                                    {post.author_name} · {formatDate(new Date(post.created_at))}
                                </span>
                                <div className="flex gap-2 items-center">
                                    {canManageThread && (
                                        <CommonButton
                                            color="success"
                                            size="small"
                                            startIcon={<CheckCircleIcon size={16} />}
                                            variant="outlined"
                                            onClick={function() {
                                                handleToggleAnswer(post.id, post.is_answer);
                                            }}
                                        >
                                            {post.is_answer
                                                ? 'Unmark answer'
                                                : 'Mark as answer'}
                                        </CommonButton>
                                    )}
                                    {(thread.can_moderate || isPostOwner) && (
                                        <CommonButton
                                            color="error"
                                            size="small"
                                            startIcon={<TrashIcon size={16} />}
                                            variant="outlined"
                                            onClick={function() {
                                                handleDeletePost(post.id);
                                            }}
                                        >
                                            Delete
                                        </CommonButton>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
                <CommonTextarea
                    maxLength={REPLY_MAX_LENGTH}
                    placeholder="Write a reply... (Enter to post, Ctrl+Enter for a new line)"
                    sx={REPLY_TEXTAREA_SX}
                    value={replyBody}
                    onChange={function(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
                        setReplyBody(e.target.value);
                    }}
                    onKeyDown={handleReplyKeyDown}
                    onPaste={handlePaste}
                />
                <DiscussionAttachmentPicker
                    files={replyFiles}
                    isDisabled={isUploading}
                    onAdd={handleAddFiles}
                    onRemove={handleRemoveFile}
                />
                <div className="flex justify-end">
                    <CommonButton
                        disabled={!replyBody.trim() || isUploading}
                        size="small"
                        variant="contained"
                        onClick={handleReply}
                    >
                        Post Reply
                    </CommonButton>
                </div>
            </div>
        </div>
    );
}