import { CommonSelectOption } from '@components/select/CommonSelect';
import { getPrograms } from '@services/program/program.service';
import { ProgramOption } from '@type/program/program.type';
import { useEffect, useState } from 'react';

export function useProgramOptions() {
    const [programOptions, setProgramOptions] = useState<(CommonSelectOption & { code?: string; department_id?: string })[]>([]);
    const [programs, setPrograms] = useState<ProgramOption[]>([]);

    useEffect(function() {
        async function fetchPrograms() {
            const result = await getPrograms();

            if (result.data) {
                setPrograms(result.data);
                setProgramOptions(
                    result.data.map((program: ProgramOption) => ({
                        label: program.label,
                        value: program.id,
                        code: program.code,
                        department_id: program.department_id
                    }))
                );
            }
        }

        fetchPrograms();
    }, []);

    return { programOptions, programs };
}