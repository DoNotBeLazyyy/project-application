import { CurriculumMapEntry, CurriculumMapGrouped } from '@type/curriculum-map.type';
import { useMemo } from 'react';

export function useCurriculumMapGrouped(entries: CurriculumMapEntry[]): CurriculumMapGrouped[] {
    return useMemo(function() {
        const yearMap = new Map<number, Map<string, CurriculumMapEntry[]>>();

        entries.forEach(function(entry) {
            if (!yearMap.has(entry.year_level)) {
                yearMap.set(entry.year_level, new Map());
            }

            const termMap = yearMap.get(entry.year_level);

            if (!termMap?.has(entry.term_type_id)) {
                termMap?.set(entry.term_type_id, []);
            }

            termMap?.get(entry.term_type_id)
                ?.push(entry);
        });

        const yearLevels = Array.from(yearMap.keys())
            .sort((a, b) => a - b);

        return yearLevels.map(function(yearLevel) {
            const termMap = yearMap.get(yearLevel);

            const terms = Array.from(termMap?.entries() ?? [])
                .map(function([termTypeId, termEntries]) {
                    const first = termEntries[0];
                    return {
                        termTypeId,
                        termTypeLabel: first.term_type_label,
                        termTypeCode: first.term_type_code,
                        termTypeSequence: first.term_type_sequence,
                        entries: termEntries.sort((a, b) => a.sequence - b.sequence),
                        totalUnits: termEntries.reduce((sum, entry) => sum + entry.total_units, 0)
                    };
                });

            terms.sort((a, b) => a.termTypeSequence - b.termTypeSequence);

            return { yearLevel, terms };
        });
    }, [entries]);
}