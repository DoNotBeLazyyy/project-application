import CommonButton from '@components/button/CommonButton';
import { CalendarDotsIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { AttendanceSession } from '@type/faculty.type';

interface AttendanceSessionListProps {
    selectedSessionId?: string | null;
    sessions: AttendanceSession[];
    onCreateOpen: () => void;
    onDelete: (sessionId: string) => Promise<void>;
    onSelectSession: (session: AttendanceSession) => Promise<void>;
}

export default function AttendanceSessionList({
    selectedSessionId,
    sessions,
    onCreateOpen,
    onDelete,
    onSelectSession
}: AttendanceSessionListProps) {

    return (
        <div className="flex flex-col flex-shrink-0 gap-3 w-full md:w-80 h-full min-h-0">
            <div className="flex items-center justify-between pb-1">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Class Sessions ({sessions.length})
                </span>
                <CommonButton
                    size="small"
                    startIcon={<PlusIcon size={14} weight="bold" />}
                    variant="contained"
                    onClick={onCreateOpen}
                >
                    New Session
                </CommonButton>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 pr-1">
                {sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 p-4 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
                        <CalendarDotsIcon size={32} className="text-slate-400 mb-2" />
                        <p className="text-xs text-slate-500">
                            No attendance sessions recorded yet. Click &ldquo;New Session&rdquo; to begin.
                        </p>
                    </div>
                ) : (
                    sessions.map((session) => {
                        const isSelected = selectedSessionId === session.id;
                        const dateObj = new Date(session.session_date);
                        const weekday = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
                        const formattedDate = dateObj.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        });

                        return (
                            <div
                                key={session.id}
                                onClick={() => onSelectSession(session)}
                                className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer text-left flex flex-col gap-1.5 select-none ${
                                    isSelected
                                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                                        : 'bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-2xs hover:shadow-xs'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shrink-0">
                                            {weekday}
                                        </span>
                                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                                            {formattedDate}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        title="Delete Session"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(session.id);
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                                    >
                                        <TrashIcon size={14} weight="bold" />
                                    </button>
                                </div>

                                {session.notes ? (
                                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                                        {session.notes}
                                    </p>
                                ) : (
                                    <span className="text-[11px] text-slate-400 italic">
                                        No agenda notes
                                    </span>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}