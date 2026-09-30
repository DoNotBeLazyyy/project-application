import { CommonSelectOption } from '@components/select/CommonSelect';
import { getTerms, TermOption } from '@services/section.service';
import { useEffect, useState } from 'react';

export const ALL_TERMS_OPTION: CommonSelectOption = { label: 'All Terms', value: '' };

export function useTermOptions() {
    const [termOptions, setTermOptions] = useState<CommonSelectOption[]>([ALL_TERMS_OPTION]);

    useEffect(function() {
        async function fetchTerms() {
            const result = await getTerms();

            if (result.data) {
                setTermOptions([
                    ALL_TERMS_OPTION,
                    ...result.data.map((term: TermOption) => ({
                        label: term.label,
                        value: term.id
                    }))
                ]);
            }
        }

        fetchTerms();
    }, []);

    return { termOptions };
}