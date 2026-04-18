import { CommonSelectOption } from '@components/select/CommonSelect';
import { getUsersByRoles } from '@services/user.service';
import { UserOption } from '@type/user.type';
import { useEffect, useState } from 'react';

interface UseUserOptionsProps {
    roleCodes?: string[];
}

export function useUserOptions({ roleCodes }: UseUserOptionsProps = {}) {
    const [userOptions, setUserOptions] = useState<CommonSelectOption[]>([]);

    useEffect(function() {
        async function fetchUsers() {
            const result = await getUsersByRoles(roleCodes);

            if (result.data) {
                setUserOptions(
                    result.data.map((user: UserOption) => ({
                        label: `${user.full_name} — ${user.role_label}`,
                        value: user.id
                    }))
                );
            }
        }

        fetchUsers();
    }, []);

    return { userOptions };
}