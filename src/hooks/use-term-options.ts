import { CommonSelectOption } from '@components/select/CommonSelect';
import { getTerms, TermOption } from '@services/term/term.service';
import { useEffect, useMemo, useState } from 'react';

export const ALL_TERMS_OPTION: CommonSelectOption = { label: 'All Terms', value: '' };

interface UseTermOptionsParams {
    /** Only terms of the active academic year (for creating records). */
    isActiveYearOnly?: boolean;
    /** Put an "All Terms" option (empty value) first. */
    hasAllOption?: boolean;
}

/**
 * Loads every term (newest first) once, for term pickers on the dean and registrar pages.
 *
 * @param params - Which terms to offer and whether to add "All Terms".
 * @returns The raw terms, the select options, and whether loading finished.
 */
export function useTermOptions({ isActiveYearOnly = false, hasAllOption = false }: UseTermOptionsParams = {}) {
    const [terms, setTerms] = useState<TermOption[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(function() {
        let isMounted = true;

        async function fetchTerms() {
            const result = await getTerms();
            if (!isMounted) return;
            setTerms(result.data ?? []);
            setIsLoaded(true);
        }

        fetchTerms();

        return function() {
            isMounted = false;
        };
    }, []);

    const termOptions = useMemo<CommonSelectOption[]>(function() {
        const visibleTerms = isActiveYearOnly
            ? terms.filter((term) => term.is_active_academic_year !== false)
            : terms;
        const options = visibleTerms.map((term) => ({
            label: term.label,
            value: term.id
        }));

        return hasAllOption
            ? [ALL_TERMS_OPTION, ...options]
            : options;
    }, [terms, isActiveYearOnly, hasAllOption]);

    return {
        isLoaded, termOptions, terms
    };
}