import { CommonSelectOption } from '@components/select/CommonSelect';
import { getTerms, TermOption } from '@services/section.service';
import { useEffect, useState } from 'react';

export function useTermOptions() {
    const [termOptions, setTermOptions] = useState<CommonSelectOption[]>([]);

    useEffect(function() {
        async function fetchTerms() {
            const result = await getTerms();

            if (result.data) {
                setTermOptions([
                    { label: 'All Terms', value: '' },
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