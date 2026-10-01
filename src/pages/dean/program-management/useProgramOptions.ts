import { CommonSelectOption } from '@components/select/CommonSelect';
import { getPrograms } from '@services/program/program.service';
import { ProgramOption } from '@type/program/program.type';
import { useEffect, useState } from 'react';

export function useProgramOptions() {
    const [programOptions, setProgramOptions] = useState<(CommonSelectOption & { code?: string })[]>([]);

    useEffect(function() {
        async function fetchPrograms() {
            const result = await getPrograms();

            if (result.data) {
                setProgramOptions(
                    result.data.map((program: ProgramOption) => ({
                        label: program.label,
                        value: program.id,
                        code: program.code
                    }))
                );
            }
        }

        fetchPrograms();
    }, []);

    return { programOptions };
}