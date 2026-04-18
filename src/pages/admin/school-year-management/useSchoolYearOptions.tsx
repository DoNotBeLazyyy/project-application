import { CommonSelectOption } from '@components/select/CommonSelect';
import { getSchoolYears } from '@services/school-year.service';
import { SchoolYearOption } from '@type/school-year.type';
import { useEffect, useState } from 'react';

export function useSchoolYearOptions() {
    const [schoolYearOptions, setSchoolYearOptions] = useState<CommonSelectOption[]>([]);

    useEffect(function() {
        async function fetchSchoolYears() {
            const result = await getSchoolYears();

            if (result.data) {
                setSchoolYearOptions(
                    result.data.map((schoolYear: SchoolYearOption) => ({
                        label: schoolYear.label,
                        value: schoolYear.id
                    }))
                );
            }
        }

        fetchSchoolYears();
    }, []);

    return { schoolYearOptions };
}