export default function PageLoadingFallback() {
    return (
        <div
            aria-busy="true"
            aria-label="Loading page content"
            className="flex flex-1 flex-col items-center justify-center min-h-[400px] p-8 w-full"
            role="status"
        >
            <div className="flex flex-col gap-4 items-center justify-center">
                <div className="animate-spin border-4 border-slate-200 border-t-[#022179] h-12 rounded-full w-12" />
                <span className="animate-pulse font-medium text-[#022179] text-sm tracking-wide">
                    Loading content...
                </span>
            </div>
        </div>
    );
}