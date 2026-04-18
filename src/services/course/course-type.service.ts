import { callRpc } from '@services/supabase.wrapper';
import { CourseTypeFormValues, CourseTypeListRow, CourseTypeOption } from '@type/course/course-type.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';

export async function listCourseTypes(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[]
): Promise<ServiceResult<CommonListResDto<CourseTypeListRow>>> {
    return callRpc<CommonListResDto<CourseTypeListRow>>('fn_list_course_types_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null
    });
}

export async function getCourseTypeById(
    courseTypeId: string
): Promise<ServiceResult<CourseTypeFormValues>> {
    return callRpc<CourseTypeFormValues>('fn_get_course_type_by_id', {
        p_course_type_id: courseTypeId
    });
}

export async function getCourseTypes(): Promise<ServiceResult<CourseTypeOption[]>> {
    return callRpc<CourseTypeOption[]>('fn_get_course_types');
}

export async function createCourseType(
    params: CourseTypeFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_course_type', {
        p_code: params.code,
        p_description: params.description || null,
        p_label: params.label
    });
}

export async function updateCourseType(
    courseTypeId: string,
    params: CourseTypeFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_course_type', {
        p_code: params.code,
        p_description: params.description || null,
        p_label: params.label,
        p_course_type_id: courseTypeId
    });
}

export async function deleteCourseType(
    courseTypeId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_course_type', {
        p_course_type_id: courseTypeId
    });
}