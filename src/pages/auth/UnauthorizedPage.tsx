import CommonButton from '@components/button/CommonButton';
import { useAppStore } from '@stores/app.store';
import { useNavigate } from 'react-router-dom';

export default function UnauthorizedPage() {
    const navigate = useNavigate();
    const activeRole = useAppStore((s) => s.activeRole);

    function handleBack() {
        navigate(-1);
    }

    function handleSwitchRole() {
        if (activeRole) {
            navigate(`/${activeRole.toLowerCase()}`);
        }
        else {
            navigate('/login');
        }
    }

    return (
        <div className="flex flex-col gap-4 h-full items-center justify-center w-full">
            <h3 className="font-bold text-(--mui-palette-text-primary) text-5xl">
                403
            </h3>
            <h5 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                Access Denied
            </h5>
            <p className="text-(--mui-palette-text-secondary)">
                You do not have permission to view this page.
            </p>
            <div className="flex gap-2">
                <CommonButton
                    variant="outlined"
                    onClick={handleBack}
                >
                    Go Back
                </CommonButton>
                <CommonButton
                    variant="contained"
                    onClick={handleSwitchRole}
                >
                    Go to My Dashboard
                </CommonButton>
            </div>
        </div>
    );
}