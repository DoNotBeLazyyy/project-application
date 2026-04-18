import { CommonSelectOption } from '@components/select/CommonSelect';
import { getSections } from '@services/section.service';
import { SectionOption } from '@type/section.type';
import { useEffect, useState } from 'react';

export function useSectionOptions() {
    const [sectionOptions, setSectionOptions] = useState<CommonSelectOption[]>([]);

    useEffect(function() {
        async function fetchSections() {
            const result = await getSections();

            if (result.data) {
                setSectionOptions(
                    result.data.map((section: SectionOption) => ({
                        label: section.label,
                        value: section.id
                    }))
                );
            }
        }

        fetchSections();
    }, []);

    return { sectionOptions };
}