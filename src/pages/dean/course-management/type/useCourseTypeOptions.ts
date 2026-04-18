import { CommonSelectOption } from '@components/select/CommonSelect';
import { getCourseTypes } from '@services/course/course-type.service';
import { CourseTypeOption } from '@type/course/course-type.type';
import { useEffect, useState } from 'react';

export function useCourseTypeOptions() {
    const [courseTypeOptions, setCourseTypeOptions] = useState<CommonSelectOption[]>([]);

    useEffect(function() {
        async function fetchCourseTypes() {
            const result = await getCourseTypes();

            if (result.data) {
                setCourseTypeOptions(
                    result.data.map((courseType: CourseTypeOption) => ({
                        label: courseType.label,
                        value: courseType.id
                    }))
                );
            }
        }

        fetchCourseTypes();
    }, []);

    return { courseTypeOptions };
}