import { CommonSelectOption } from '@components/select/CommonSelect';
import { getProgramLevels } from '@services/program/program-level.service';
import { ProgramLevelOption } from '@type/program/program-level.type';
import { useEffect, useState } from 'react';

export function useProgramLevelOptions() {
    const [programLevelOptions, setProgramLevelOptions] = useState<CommonSelectOption[]>([]);

    useEffect(function() {
        async function fetchProgramLevels() {
            const result = await getProgramLevels();

            if (result.data) {
                setProgramLevelOptions(
                    result.data.map((programLevel: ProgramLevelOption) => ({
                        label: programLevel.label,
                        value: programLevel.id
                    }))
                );
            }
        }

        fetchProgramLevels();
    }, []);

    return { programLevelOptions };
}