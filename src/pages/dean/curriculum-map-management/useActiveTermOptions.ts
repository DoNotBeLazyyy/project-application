import { CommonSelectOption } from '@components/select/CommonSelect';
import { getAcademicYearCalendarDetails, listSchoolYears } from '@services/school-year.service';
import { getTermTypes } from '@services/term/term-type.service';
import { listTerms } from '@services/term/term.service';
import { TermTypeOption } from '@type/term/term-type.type';
import { useEffect, useState } from 'react';

export interface TermTypeOptionWithMeta extends CommonSelectOption {
    code?: string;
    sequence?: number;
}

export function useActiveTermOptions(schoolYearIdOverride?: string) {
    const [termOptions, setTermOptions] = useState<TermTypeOptionWithMeta[]>([]);
    const [allTermTypes, setAllTermTypes] = useState<TermTypeOptionWithMeta[]>([]);
    const [activeSchoolYearId, setActiveSchoolYearId] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        let isMounted = true;

        async function fetchActiveTerms() {
            setIsLoading(true);

            let syId = schoolYearIdOverride;
            if (!syId) {
                const activeSyRes = await listSchoolYears(1, 10, '', [], { is_active: 'true', year: '' });
                syId = activeSyRes.data?.content?.[0]?.id || '';
            }

            if (isMounted && syId) {
                setActiveSchoolYearId(syId);
            }

            // 1. Fetch canonical term types
            const termTypesRes = await getTermTypes();
            const canonicalTypes: TermTypeOptionWithMeta[] = (termTypesRes.data || []).map((tt: TermTypeOption) => ({
                label: tt.label,
                value: tt.id,
                code: tt.code,
                sequence: tt.sequence
            }));

            if (isMounted) {
                setAllTermTypes(canonicalTypes);
            }

            if (!syId) {
                if (isMounted) {
                    setTermOptions(canonicalTypes);
                    setIsLoading(false);
                }
                return;
            }

            // 2. Fetch terms configured for this academic year
            const [calendarRes, listRes] = await Promise.all([
                getAcademicYearCalendarDetails(syId),
                listTerms(1, 100, '', [], { school_year_id: syId, status: 'All' })
            ]);

            const availableIds = new Set<string>();
            const termTypeOrder: string[] = [];

            if (calendarRes.data?.terms && Array.isArray(calendarRes.data.terms)) {
                for (const t of calendarRes.data.terms) {
                    if (t.term_type_id) {
                        const strId = String(t.term_type_id);
                        if (!availableIds.has(strId)) {
                            availableIds.add(strId);
                            termTypeOrder.push(strId);
                        }
                    }
                }
            }

            if (listRes.data?.content && Array.isArray(listRes.data.content)) {
                for (const t of listRes.data.content) {
                    if (t.term_type_id) {
                        const strId = String(t.term_type_id);
                        if (!availableIds.has(strId)) {
                            availableIds.add(strId);
                            termTypeOrder.push(strId);
                        }
                    }
                }
            }

            if (availableIds.size > 0) {
                const canonicalMap = new Map(canonicalTypes.map((c) => [String(c.value), c]));
                const filtered: TermTypeOptionWithMeta[] = [];

                for (const id of termTypeOrder) {
                    const found = canonicalMap.get(id);
                    if (found) {
                        filtered.push(found);
                    } else {
                        const calTerm = calendarRes.data?.terms?.find((t) => String(t.term_type_id) === id);
                        const listTerm = listRes.data?.content?.find((t) => String(t.term_type_id) === id);
                        filtered.push({
                            label: calTerm?.term_type_label || listTerm?.term_type_label || 'Term',
                            value: id,
                            code: calTerm?.term_type_code
                        });
                    }
                }

                if (isMounted) {
                    setTermOptions(filtered);
                }
            } else {
                if (isMounted) {
                    setTermOptions(canonicalTypes);
                }
            }

            if (isMounted) {
                setIsLoading(false);
            }
        }

        fetchActiveTerms();

        return () => {
            isMounted = false;
        };
    }, [schoolYearIdOverride]);

    return { termOptions, allTermTypes, activeSchoolYearId, isLoading };
}
