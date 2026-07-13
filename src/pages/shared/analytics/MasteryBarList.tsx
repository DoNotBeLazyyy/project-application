import { MasteryEntry } from '@type/analytics.type';

interface MasteryBarListProps {
    emptyLabel: string;
    entries: MasteryEntry[];
}

function barColor(scorePct: number | null): string {
    if (scorePct === null) return 'var(--mui-palette-text-disabled)';

    if (scorePct >= 85) return 'var(--mui-palette-success-main)';

    if (scorePct >= 75) return 'var(--mui-palette-info-main)';

    if (scorePct >= 60) return 'var(--mui-palette-warning-main)';

    return 'var(--mui-palette-error-main)';
}

export default function MasteryBarList({ emptyLabel, entries }: MasteryBarListProps) {
    if (entries.length === 0) {
        return (
            <p className="text-(--mui-palette-text-secondary) text-sm">
                {emptyLabel}
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {entries.map(function(entry) {
                const scorePct = entry.score_pct !== null
                    ? Number(entry.score_pct)
                    : null;

                return (
                    <div
                        className="flex flex-col gap-1"
                        key={entry.key}
                    >
                        <div className="flex gap-3 items-baseline justify-between">
                            <span className="text-(--mui-palette-text-primary) text-sm">
                                {entry.label}
                            </span>
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                {scorePct !== null
                                    ? `${scorePct.toFixed(1)}%`
                                    : '—'}
                            </span>
                        </div>
                        <div className="bg-(--mui-palette-action-hover) h-2 overflow-hidden rounded w-full">
                            <div
                                className="h-full rounded"
                                style={{
                                    backgroundColor: barColor(scorePct),
                                    width: `${Math.min(Math.max(scorePct ?? 0, 0), 100)}%`
                                }}
                            />
                        </div>
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                            {entry.item_count} item{entry.item_count === 1
                                ? ''
                                : 's'}
                            {entry.bloom_level
                                ? ` · ${entry.bloom_level}`
                                : ''}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}