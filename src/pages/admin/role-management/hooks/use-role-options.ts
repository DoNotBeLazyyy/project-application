import { CommonSelectOption } from '@components/select/CommonSelect';
import { getRoles } from '@services/role.service';
import { RoleOption } from '@type/role.type';
import { useEffect, useState } from 'react';

interface UseRoleOptionsProps {
    withAllOption?: boolean;
}

export function useRoleOptions({ withAllOption = false }: UseRoleOptionsProps = {}) {
    const [roleOptions, setRoleOptions] = useState<CommonSelectOption[]>([]);

    useEffect(function() {
        async function fetchRoles() {
            const result = await getRoles();

            if (result.data) {
                const options: CommonSelectOption[] = result.data.map(function(role: RoleOption) {
                    return {
                        label: role.label,
                        value: role.code
                    };
                });

                setRoleOptions(
                    withAllOption
                        ? [{ label: 'All Roles', value: 'All' }, ...options]
                        : options
                );
            }
        }

        fetchRoles();
    }, [withAllOption]);

    return { roleOptions };
}