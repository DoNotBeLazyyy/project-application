import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard, { BentoCardFact } from '@components/card/CommonBentoCard';
import {
    ChartLineUpIcon,
    EyeIcon,
    MinusCircleIcon,
    PencilSimpleIcon,
    PercentIcon,
    SealCheckIcon
} from '@phosphor-icons/react';
import { AcademicThreshold } from '@type/academic-threshold.type';
import {
    formatGwaBand,
    formatThresholdDiscount,
    hasThresholdDiscount
} from '@utils/academic-threshold.util';

export interface AcademicThresholdGridCardProps {
    row: AcademicThreshold;
    isSelected: boolean;
    onToggleSelect: () => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
}

const FACT_ICON_SIZE = 13;

/**
 * AcademicThresholdGridCard
 *
 * Grid (bento) representation of one honor / scholarship / standing cutoff.
 * Follows the shared management-list card pattern (see
 * docs/MANAGEMENT_LIST_CARDS.md).
 *
 * A threshold is defined by three short scalars - the GWA band it covers,
 * whether a failing grade voids it, and the discount it carries - so those
 * go in the fact row rather than eating a row each. The band is the fact an
 * admin scans for, and the two conditional ones keep a "Not applicable" value
 * for the categories they do not apply to, so a column of cards stays even.
 *
 * There is no Delete action: thresholds are a fixed, seeded ladder - rows
 * are retired by clearing Active, not removed.
 */
export default function AcademicThresholdGridCard({
    row,
    isSelected,
    onToggleSelect,
    onView,
    onEdit
}: AcademicThresholdGridCardProps) {
    const isStanding = row.category === 'Standing';

    const facts: BentoCardFact[] = [
        {
            icon: <ChartLineUpIcon size={FACT_ICON_SIZE} weight="fill" />,
            label: 'GWA Band',
            value: formatGwaBand(row.min_gwa, row.max_gwa)
        },
        {
            icon: <SealCheckIcon size={FACT_ICON_SIZE} weight="fill" />,
            label: 'Min Subj',
            value: isStanding || row.min_subject_grade === null
                ? 'None'
                : `\u2264 ${Number(row.min_subject_grade).toFixed(2)}`
        },
        {
            icon: row.requires_no_failing
                ? <SealCheckIcon size={FACT_ICON_SIZE} weight="fill" />
                : <MinusCircleIcon size={FACT_ICON_SIZE} weight="fill" />,
            label: 'No Failing',
            tone: row.requires_no_failing
                ? 'info'
                : 'neutral',
            value: isStanding
                ? 'Not applicable'
                : (row.requires_no_failing
                    ? 'Required'
                    : 'Not required')
        },
        {
            icon: <PercentIcon size={FACT_ICON_SIZE} weight="fill" />,
            label: 'Discount',
            tone: hasThresholdDiscount(row)
                ? 'positive'
                : 'neutral',
            value: formatThresholdDiscount(row)
        }
    ];

    return (
        <CommonBentoCard
            actionMenu={(
                <BentoCardActionMenu
                    actions={[
                        {
                            key: 'view',
                            label: 'View',
                            icon: <EyeIcon size={18} weight="bold" />,
                            onClick: () => onView(row.id)
                        },
                        {
                            key: 'edit',
                            label: 'Edit',
                            icon: <PencilSimpleIcon size={18} weight="bold" />,
                            onClick: () => onEdit(row.id)
                        }
                    ]}
                    ariaLabel="Academic threshold actions"
                />
            )}
            facts={facts}
            isSelected={isSelected}
            selectVariant="button"
            status={row.is_active
                ? 'Active'
                : 'Inactive'}
            title={row.label}
            onClick={() => onView(row.id)}
            onToggleSelect={onToggleSelect}
        />
    );
}