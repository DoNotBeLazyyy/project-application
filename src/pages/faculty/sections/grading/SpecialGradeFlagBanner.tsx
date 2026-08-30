import CommonButton from '@components/button/CommonButton';
import { FlagIcon, SealCheckIcon } from '@phosphor-icons/react';
import { SpecialGradeFlag } from '@type/grading-config.type';
import { describeEvidence } from '@utils/special-grade.util';

export interface SpecialGradeFlagBannerProps {
    flags: SpecialGradeFlag[];
    isBusy?: boolean;
    onApply: (flag: SpecialGradeFlag) => void;
    onDismiss: (flag: SpecialGradeFlag) => void;
}

/**
 * SpecialGradeFlagBanner
 *
 * Surfaces students the rule engine believes meet a special grade's conditions.
 *
 * A flag is a proposal, never a decision — nothing has been written to the
 * student's record when this appears. The evidence line is shown rather than
 * hidden behind a tooltip because the person clicking Apply is accountable for
 * the mark and should not have to hunt for the reason.
 *
 * Sits alongside the grade calculation failure banner in GradeSheetPanel and
 * deliberately mirrors its shape, so faculty read both the same way.
 */
export default function SpecialGradeFlagBanner({
    flags,
    isBusy = false,
    onApply,
    onDismiss
}: SpecialGradeFlagBannerProps) {
    const pending = flags.filter((flag) => flag.status === 'Pending');

    if (pending.length === 0) {
        return null;
    }

    return (
        <div className="bg-(--mui-palette-warning-main)/10 border border-(--mui-palette-warning-main) flex flex-col gap-2 max-h-72 overflow-y-auto p-3 rounded-lg">
            <div className="flex gap-2 items-center text-(--mui-palette-warning-main)">
                <FlagIcon size={16} weight="fill" />
                <p className="font-semibold text-sm">
                    {pending.length}
                    {' student(s) meet the conditions for a special grade'}
                </p>
            </div>

            <p className="text-(--mui-palette-text-secondary) text-xs">
                Nothing has been applied yet. Review each one — this period cannot be approved
                while a flag is still open.
            </p>

            <ul className="flex flex-col gap-2">
                {pending.map(function(flag) {
                    return (
                        <li
                            className="bg-(--mui-palette-background-paper) flex flex-col gap-2 p-2 rounded-lg"
                            key={flag.id}
                        >
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="bg-(--mui-palette-warning-main)/20 font-semibold px-2 py-0.5 rounded text-(--mui-palette-warning-main) text-xs">
                                    {flag.code}
                                </span>
                                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                    {flag.full_name}
                                </span>
                                <span className="text-(--mui-palette-text-secondary) text-xs">
                                    {flag.student_number}
                                </span>
                                {flag.is_passing
                                    ? (
                                        <span className="flex gap-1 items-center text-(--mui-palette-success-main) text-xs">
                                            <SealCheckIcon size={12} weight="fill" />
                                            Counts as passing
                                        </span>
                                    )
                                    : null}
                            </div>

                            <p className="text-(--mui-palette-text-secondary) text-xs">
                                {describeEvidence(flag.evidence)}
                            </p>

                            <div className="flex gap-2">
                                <CommonButton
                                    disabled={isBusy}
                                    size="small"
                                    variant="contained"
                                    onClick={() => onApply(flag)}
                                >
                                    {`Apply ${flag.code}`}
                                </CommonButton>
                                <CommonButton
                                    disabled={isBusy}
                                    size="small"
                                    variant="outlined"
                                    onClick={() => onDismiss(flag)}
                                >
                                    Dismiss
                                </CommonButton>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}