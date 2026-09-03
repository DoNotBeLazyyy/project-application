import { CommonSelectOption } from '@components/select/CommonSelect';
import { getCourseTypes } from '@services/course/course-type.service';
import { CourseTypeOption } from '@type/course/course-type.type';
import { useEffect, useMemo, useState } from 'react';

export function useCourseTypeOptions() {
    const [courseTypes, setCourseTypes] = useState<CourseTypeOption[]>([]);
    const courseTypeOptions = useMemo<CommonSelectOption[]>(function() {
        return courseTypes.map((courseType) => ({
            label: courseType.label,
            value: courseType.id
        }));
    }, [courseTypes]);

    useEffect(function() {
        async function fetchCourseTypes() {
            const result = await getCourseTypes();

            if (result.data) {
                setCourseTypes(result.data);
            }
        }

        fetchCourseTypes();
    }, []);

    return { courseTypeOptions, courseTypes };
}