import { getProgramElectiveTracks } from '@services/curriculum-map.service';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads the elective track names a program lists on its printed curriculum.
 */
export function useElectiveTracks(programId: string) {
    const [electiveTracks, setElectiveTracks] = useState<string[]>([]);
    const latestProgramIdRef = useRef(programId);

    const fetchElectiveTracks = useCallback(async function() {
        latestProgramIdRef.current = programId;

        if (!programId) {
            setElectiveTracks([]);
            return;
        }

        const result = await getProgramElectiveTracks(programId);

        // A slower answer for a program the user already switched away from is dropped
        if (latestProgramIdRef.current !== programId) {
            return;
        }

        setElectiveTracks(Array.isArray(result.data)
            ? result.data
            : []);
    }, [programId]);

    useEffect(function() {
        fetchElectiveTracks();
    }, [fetchElectiveTracks]);

    return { electiveTracks, fetchElectiveTracks };
}