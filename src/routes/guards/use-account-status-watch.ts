import { getMyAccountStatus } from '@services/auth.service';
import { useAppStore } from '@stores/app.store';
import { useEffect } from 'react';

// How often the account status is checked while the tab is open
const STATUS_CHECK_INTERVAL_MS = 3 * 60 * 1000;

/**
 * Checks the signed-in user's account status when the window gets focus and every few
 * minutes. A changed status is written to the store, so AuthGuard can sign out an account
 * that was deactivated or suspended while it was in use.
 *
 * @param isEnabled - Only check while someone is signed in.
 */
export default function useAccountStatusWatch(isEnabled: boolean) {
    useEffect(function() {
        if (!isEnabled) return;

        let isChecking = false;

        async function handleCheck() {
            if (isChecking) return;

            isChecking = true;

            try {
                const status = await getMyAccountStatus();
                const { setUserProfile, userProfile } = useAppStore.getState();

                if (status && userProfile && userProfile.status !== status) {
                    setUserProfile({ ...userProfile, status });
                }
            }
            finally {
                isChecking = false;
            }
        }

        const intervalId = window.setInterval(handleCheck, STATUS_CHECK_INTERVAL_MS);
        window.addEventListener('focus', handleCheck);

        return function() {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleCheck);
        };
    }, [isEnabled]);
}