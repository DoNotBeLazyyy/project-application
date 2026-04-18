import { CommonSelectOption } from '@components/select/CommonSelect';
import { getDepartments } from '@services/department.service';
import { DepartmentOption } from '@type/department.type';
import { useEffect, useState } from 'react';

export function useDepartmentOptions() {
    const [departmentOptions, setDepartmentOptions] = useState<CommonSelectOption[]>([]);

    useEffect(function() {
        async function fetchDepartments() {
            const result = await getDepartments();

            if (result.data) {
                setDepartmentOptions(
                    result.data.map((department: DepartmentOption) => ({
                        label: department.label,
                        value: department.id
                    }))
                );
            }
        }

        fetchDepartments();
    }, []);

    return { departmentOptions };
}