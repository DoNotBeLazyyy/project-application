import { CommonSelectOption } from '@components/select/CommonSelect';
import { getSchoolYears, listSchoolYears } from '@services/school-year.service';
import { SchoolYearOption } from '@type/school-year.type';
import { useEffect, useState } from 'react';

export function useSchoolYearOptions() {
    const [schoolYearOptions, setSchoolYearOptions] = useState<CommonSelectOption[]>([]);
    const [activeSchoolYearId, setActiveSchoolYearId] = useState<string>('');

    useEffect(function() {
        async function fetchSchoolYears() {
            const [yearsResult, activeResult] = await Promise.all([
                getSchoolYears(),
                listSchoolYears(1, 100, '', [], { is_active: 'true', year: '' })
            ]);

            if (yearsResult.data) {
                setSchoolYearOptions(
                    yearsResult.data.map((schoolYear: SchoolYearOption) => ({
                        label: schoolYear.label,
                        value: schoolYear.id
                    }))
                );
            }

            if (activeResult.data?.content && activeResult.data.content.length > 0) {
                setActiveSchoolYearId(activeResult.data.content[0].id);
            }
        }

        fetchSchoolYears();
    }, []);

    return { activeSchoolYearId, schoolYearOptions };
}