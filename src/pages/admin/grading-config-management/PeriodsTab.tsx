import PeriodComposer from '@pages/admin/grading-config-management/PeriodComposer';

/**
 * PeriodsTab
 *
 * Periods deliberately do not use `CommonTableCard`. A management list answers
 * "which row?" — this tab answers "does the term add up?", over a set the 100%
 * budget caps at a handful of ordered, interdependent parts. See
 * `PeriodComposer` for the screen and `docs/MANAGEMENT_LIST_CARDS.md` for when
 * the grid pattern does apply.
 */
export default function PeriodsTab() {
    return <PeriodComposer />;
}