import { getProgramElectiveTracks } from '@services/curriculum-map.service';
import { useCallback, useEffect, useState } from 'react';

/**
 * Loads the elective track names a program lists on its printed curriculum.
 */
export function useElectiveTracks(programId: string) {
    const [electiveTracks, setElectiveTracks] = useState<string[]>([]);

    const fetchElectiveTracks = useCallback(async function() {
        if (!programId) {
            setElectiveTracks([]);
            return;
        }

        const result = await getProgramElectiveTracks(programId);
        setElectiveTracks(Array.isArray(result.data)
            ? result.data
            : []);
    }, [programId]);

    useEffect(function() {
        fetchElectiveTracks();
    }, [fetchElectiveTracks]);

    return { electiveTracks, fetchElectiveTracks };
}