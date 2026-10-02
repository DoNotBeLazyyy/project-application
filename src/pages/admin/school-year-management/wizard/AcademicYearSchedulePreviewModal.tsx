import CommonModal from '@components/modal/CommonModal';
import { CalendarDotsIcon, XIcon } from '@phosphor-icons/react';
import { WizardCalendarExceptionItem, WizardTermItem } from '@type/school-year.type';
import AcademicYearTimelinePreview from './AcademicYearTimelinePreview';

interface AcademicYearSchedulePreviewModalProps {
    open: boolean;
    startDate?: string;
    endDate?: string;
    terms?: WizardTermItem[];
    holidays?: WizardCalendarExceptionItem[];
    onClose: () => void;
}

export default function AcademicYearSchedulePreviewModal({
    open,
    startDate,
    endDate,
    terms = [],
    holidays = [],
    onClose
}: AcademicYearSchedulePreviewModalProps) {
    return (
        <CommonModal
            cardProps={{
                className: 'w-full sm:max-w-3xl p-0 overflow-hidden flex flex-col h-full sm:h-auto'
            }}
            fullWidth
            maxWidth="md"
            open={open}
            onClose={onClose}
        >
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center shrink-0">
                        <CalendarDotsIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                            Academic Calendar Schedule & Holiday Overlay
                        </h3>
                        <p className="text-xs text-slate-500">
                            Visual timeline preview for academic terms, enrollment windows, grading periods, and holiday overlays.
                        </p>
                    </div>
                </div>

                <button
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                    title="Close Preview"
                    type="button"
                    onClick={onClose}
                >
                    <XIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-900/40">
                <AcademicYearTimelinePreview
                    endDate={endDate}
                    holidays={holidays}
                    startDate={startDate}
                    terms={terms}
                />
            </div>
        </CommonModal>
    );
}
