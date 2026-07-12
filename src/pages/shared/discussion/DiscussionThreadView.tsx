import CommonButton from '@components/button/CommonButton';
import CommonTextarea from '@components/textarea/CommonTextarea';
import { ArrowLeftIcon, CheckCircleIcon, PushPinIcon, TrashIcon } from '@phosphor-icons/react';
import {
    deletePost, deleteThread, getDiscussionThread, replyToThread, setPostAnswer,
    setThreadPinned, setThreadResolved
} from '@services/discussion.service';
import { useAppStore } from '@stores/app.store';
import { DiscussionThreadDetail } from '@type/discussion.type';
import { formatDate } from '@utils/date.util';
import { ChangeEvent, useEffect, useState } from 'react';

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
    const [thread, setThread] = useState<DiscussionThreadDetail | null>(null);
    const [replyBody, setReplyBody] = useState('');

    async function loadThread() {
        const result = await getDiscussionThread(threadId);

        if (result.data) {
            setThread(result.data);
        }
    }

    useEffect(function() {
        loadThread();
    }, [threadId]);

    async function handleReply() {
        if (!replyBody.trim()) {
            return;
        }

        const result = await replyToThread(threadId, replyBody.trim());

        if (!result.error) {
            setReplyBody('');
            await loadThread();
        }
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
        <div className="flex flex-col gap-4">
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
                            <div className="flex items-center justify-between">
                                <span className="text-(--mui-palette-text-disabled) text-xs">
                                    {post.author_name} · {formatDate(new Date(post.created_at))}
                                </span>
                                <div className="flex gap-2 items-center">
                                    {canManageThread && (
                                        <button
                                            className="text-(--mui-palette-success-main) text-xs"
                                            type="button"
                                            onClick={function() {
                                                handleToggleAnswer(post.id, post.is_answer);
                                            }}
                                        >
                                            {post.is_answer
                                                ? 'Unmark answer'
                                                : 'Mark as answer'}
                                        </button>
                                    )}
                                    {(thread.can_moderate || isPostOwner) && (
                                        <button
                                            className="text-(--mui-palette-error-main) text-xs"
                                            type="button"
                                            onClick={function() {
                                                handleDeletePost(post.id);
                                            }}
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex flex-col gap-2">
                <CommonTextarea
                    maxLength={2000}
                    placeholder="Write a reply..."
                    value={replyBody}
                    onChange={function(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
                        setReplyBody(e.target.value);
                    }}
                />
                <div className="flex justify-end">
                    <CommonButton
                        disabled={!replyBody.trim()}
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