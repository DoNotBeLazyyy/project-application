import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';

interface SessionTimeoutModalProps {
    open: boolean;
    onLogout: () => void;
    onStayLoggedIn: () => void;
}

export default function SessionTimeoutModal({
    open,
    onLogout,
    onStayLoggedIn
}: SessionTimeoutModalProps) {
    return (
        <CommonModal
            closeOnBackdropClick={false}
            closeOnEscape={false}
            open={open}
        >
            <div className="flex flex-col gap-4 p-6">
                <div className="flex flex-col gap-1">
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-lg">
                        Session About to Expire
                    </h2>
                    <p className="text-(--mui-palette-text-secondary) text-sm">
                        You have been inactive for a while. For your security, your session
                        will expire soon. Do you want to stay logged in?
                    </p>
                </div>
                <div className="flex gap-2 justify-end">
                    <CommonButton
                        color="inherit"
                        variant="outlined"
                        onClick={onLogout}
                    >
                        Log Out
                    </CommonButton>
                    <CommonButton
                        variant="contained"
                        onClick={onStayLoggedIn}
                    >
                        Stay Logged In
                    </CommonButton>
                </div>
            </div>
        </CommonModal>
    );
}