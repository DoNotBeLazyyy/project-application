import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import { AnnouncementDetailModal } from '@components/modal/AnnouncementDetailModal';
import CommonModal from '@components/modal/CommonModal';
import CommonTextarea from '@components/textarea/CommonTextarea';
import {
    CalendarBlankIcon,
    MegaphoneIcon,
    PaperPlaneTiltIcon,
    PlusIcon,
    PushPinIcon,
    TrashIcon,
    UserIcon,
    XIcon
} from '@phosphor-icons/react';
import { createAnnouncement, deleteAnnouncement, listSectionAnnouncements } from '@services/announcement.service';
import { AnnouncementFeedRow } from '@type/announcement.type';
import { formatShortDate } from '@utils/date.util';
import { ChangeEvent, useEffect, useState } from 'react';

interface SectionAnnouncementPanelProps {
    canManage?: boolean;
    sectionId: string;
}

export default function SectionAnnouncementPanel({ canManage = true, sectionId }: SectionAnnouncementPanelProps) {
    const [announcements, setAnnouncements] = useState<AnnouncementFeedRow[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementFeedRow | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isPinned, setIsPinned] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    async function loadAnnouncements() {
        const result = await listSectionAnnouncements(sectionId);
        if (result.data) {
            setAnnouncements(result.data.content);
        }
    }

    useEffect(function() {
        if (sectionId) {
            loadAnnouncements();
        }
    }, [sectionId]);

    function resetComposer() {
        setIsCreateOpen(false);
        setTitle('');
        setContent('');
        setIsPinned(false);
        setIsPosting(false);
    }

    async function handlePostAnnouncement() {
        if (!title.trim() || !content.trim() || isPosting) return;

        setIsPosting(true);
        const result = await createAnnouncement({
            attachments: [],
            content: content.trim(),
            expires_at: '',
            is_pinned: isPinned,
            section_ids: [sectionId],
            target_audience: 'Section',
            title: title.trim()
        });
        setIsPosting(false);

        if (!result.error) {
            resetComposer();
            await loadAnnouncements();
        }
    }

    async function handleConfirmDelete() {
        if (!pendingDeleteId) return;

        const result = await deleteAnnouncement(pendingDeleteId);
        setPendingDeleteId(null);

        if (!result.error) {
            await loadAnnouncements();
        }
    }

    return (
        <div className="flex flex-col gap-4 h-full min-h-0">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800 gap-2">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                        Announcements
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400">
                        {announcements.length}
                    </span>
                </div>

                {canManage && (
                    <CommonButton
                        size="small"
                        startIcon={<PlusIcon size={16} weight="bold" />}
                        variant="contained"
                        onClick={() => setIsCreateOpen(true)}
                    >
                        Post Announcement
                    </CommonButton>
                )}
            </div>

            {/* Content: Empty State or Bento Card Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {announcements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/50">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mb-3">
                            <MegaphoneIcon size={26} weight="duotone" />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            No announcements posted yet
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm mt-1">
                            Keep students informed about class updates, schedule adjustments, or important reminders.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                        {announcements.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedAnnouncement(item)}
                                className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4.5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer group hover:border-blue-400 dark:hover:border-blue-700"
                            >
                                <div>
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                        <div className="flex items-center gap-1.5">
                                            {item.is_pinned && (
                                                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                    <PushPinIcon size={12} weight="fill" />
                                                    Pinned
                                                </span>
                                            )}
                                        </div>

                                        {canManage && (
                                            <button
                                                type="button"
                                                title="Delete Announcement"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPendingDeleteId(item.id);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                            >
                                                <TrashIcon size={16} weight="bold" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
                                        {item.title}
                                    </h3>

                                    {/* Body preview */}
                                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed mb-3">
                                        {item.content}
                                    </p>
                                </div>

                                {/* Card Footer */}
                                <div className="border-t border-slate-100 dark:border-zinc-800 pt-2.5 flex items-center justify-between text-slate-400 text-xs mt-auto">
                                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                        <UserIcon size={13} />
                                        {item.author_name}
                                    </span>
                                    <span className="flex items-center gap-1 text-[11px]">
                                        <CalendarBlankIcon size={13} />
                                        {formatShortDate(item.created_at)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Read Modal: AnnouncementDetailModal */}
            <AnnouncementDetailModal
                announcement={selectedAnnouncement}
                onClose={() => setSelectedAnnouncement(null)}
            />

            {/* Write Modal: Create Section Announcement */}
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
                                <MegaphoneIcon size={18} weight="duotone" />
                            </div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                                New Section Announcement
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
                                Announcement Title <span className="text-rose-500">*</span>
                            </label>
                            <CommonInput
                                fullWidth
                                placeholder="e.g. Schedule Change for Upcoming Midterm Examination"
                                size="small"
                                value={title}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Details & Content <span className="text-rose-500">*</span>
                            </label>
                            <CommonTextarea
                                maxLength={2000}
                                placeholder="Write the announcement message for enrolled students..."
                                value={content}
                                onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setContent(e.target.value)}
                            />
                        </div>

                        <label className="flex gap-2 items-center text-slate-600 dark:text-slate-400 text-xs cursor-pointer select-none pt-1">
                            <input
                                checked={isPinned}
                                type="checkbox"
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setIsPinned(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>Pin announcement to top of section</span>
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                        <CommonButton
                            size="small"
                            variant="outlined"
                            onClick={resetComposer}
                            disabled={isPosting}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            size="small"
                            startIcon={<PaperPlaneTiltIcon size={16} weight="bold" />}
                            variant="contained"
                            disabled={!title.trim() || !content.trim() || isPosting}
                            onClick={handlePostAnnouncement}
                        >
                            {isPosting ? 'Posting...' : 'Post Announcement'}
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>

            {/* Delete Confirmation Modal */}
            <DeletePromptModal
                formButtonsProps={{
                    cancelProps: {
                        onClick: () => setPendingDeleteId(null)
                    },
                    confirmProps: {
                        onClick: handleConfirmDelete
                    }
                }}
                mainContent={{
                    title: 'Delete this announcement?'
                }}
                open={pendingDeleteId !== null}
                subContent={{ title: 'This will remove the announcement for all enrolled students in this section.' }}
                onClose={() => setPendingDeleteId(null)}
            />
        </div>
    );
}