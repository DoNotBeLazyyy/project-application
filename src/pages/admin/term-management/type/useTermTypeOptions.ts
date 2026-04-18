import { CommonSelectOption } from '@components/select/CommonSelect';
import { getTermTypes } from '@services/term/term-type.service';
import { TermTypeOption } from '@type/term/term-type.type';
import { useEffect, useState } from 'react';

export function useTermTypeOptions() {
    const [termTypeOptions, setTermTypeOptions] = useState<CommonSelectOption[]>([]);

    useEffect(() => {
        async function fetchTermTypes() {
            const result = await getTermTypes();

            if (result.data) {
                setTermTypeOptions(
                    result.data.map((termType: TermTypeOption) => {
                        return {
                            label: termType.label,
                            value: termType.id
                        };
                    })
                );
            }
        }

        fetchTermTypes();
    }, []);

    return { termTypeOptions };
}