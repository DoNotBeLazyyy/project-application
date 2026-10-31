import { CurriculumMapEntry, CurriculumMapGrouped } from '@type/curriculum-map.type';
import { useMemo } from 'react';

const YEAR_LEVEL_LABELS: Record<number, string> = {
    1: 'FIRST YEAR',
    2: 'SECOND YEAR',
    3: 'THIRD YEAR',
    4: 'FOURTH YEAR',
    5: 'FIFTH YEAR',
    6: 'SIXTH YEAR'
};

function isSummerEntry(entry: CurriculumMapEntry): boolean {
    if (!entry) return false;
    const code = entry.term_type_code ?? '';
    const label = entry.term_type_label ?? '';
    return /summer/i.test(code) || /summer/i.test(label);
}

function buildGroupLabel(yearLevel: number, isSummer: boolean): string {
    const yearLabel = YEAR_LEVEL_LABELS[yearLevel] ?? `YEAR ${yearLevel}`;

    return isSummer
        ? `${yearLabel} — SUMMER`
        : yearLabel;
}

export function useCurriculumMapGrouped(entries: CurriculumMapEntry[]): CurriculumMapGrouped[] {
    return useMemo(function() {
        const groupMap = new Map<string, Map<string, CurriculumMapEntry[]>>();

        (entries ?? []).forEach(function(entry) {
            if (!entry) return;
            const summer = isSummerEntry(entry);
            const groupKey = `${entry.year_level}-${summer
                ? 'summer'
                : 'regular'}`;

            if (!groupMap.has(groupKey)) {
                groupMap.set(groupKey, new Map());
            }

            const termMap = groupMap.get(groupKey);

            if (!termMap?.has(entry.term_type_id)) {
                termMap?.set(entry.term_type_id, []);
            }

            termMap?.get(entry.term_type_id)
                ?.push(entry);
        });

        const groupKeys = Array.from(groupMap.keys())
            .sort(function(a, b) {
                const [yearA, kindA] = a.split('-');
                const [yearB] = b.split('-');

                if (Number(yearA) !== Number(yearB)) {
                    return Number(yearA) - Number(yearB);
                }

                return kindA === 'summer'
                    ? 1
                    : -1;
            });

        return groupKeys.map(function(groupKey) {
            const [yearLevelStr, kind] = groupKey.split('-');
            const yearLevel = Number(yearLevelStr);
            const isSummer = kind === 'summer';
            const termMap = groupMap.get(groupKey);

            const terms = Array.from(termMap?.entries() ?? [])
                .map(function([termTypeId, termEntries]) {
                    const first = termEntries?.[0] ?? {} as Partial<CurriculumMapEntry>;
                    return {
                        termTypeId,
                        termTypeLabel: first.term_type_label ?? '',
                        termTypeCode: first.term_type_code ?? '',
                        termTypeSequence: first.term_type_sequence ?? 1,
                        entries: (termEntries ?? []).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)),
                        totalUnits: (termEntries ?? []).reduce((sum, entry) => sum + (Number(entry.total_units) || 0), 0)
                    };
                });

            terms.sort((a, b) => a.termTypeSequence - b.termTypeSequence);

            return {
                key: groupKey,
                yearLevel,
                isSummer,
                label: buildGroupLabel(yearLevel, isSummer),
                terms
            };
        });
    }, [entries]);
}