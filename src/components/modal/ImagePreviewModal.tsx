import {
    ArrowCounterClockwiseIcon,
    CaretLeftIcon,
    CaretRightIcon,
    DownloadSimpleIcon,
    FileImageIcon,
    MagnifyingGlassMinusIcon,
    MagnifyingGlassPlusIcon,
    SpinnerIcon,
    XIcon
} from '@phosphor-icons/react';
import { formatFileSize, triggerFileDownload } from '@utils/file.util';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface ImagePreviewItem {
    url: string;
    fileName: string;
    fileSize?: number | null;
}

export interface ImagePreviewModalProps {
    open: boolean;
    images: ImagePreviewItem[];
    initialIndex?: number;
    onClose: VoidFunction;
    onDownload?: (image: ImagePreviewItem) => void;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;
const SCALE_STEP = 0.25;
const SWIPE_THRESHOLD = 45;

export default function ImagePreviewModal({
    images,
    initialIndex = 0,
    onClose,
    onDownload,
    open
}: ImagePreviewModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const dragStartRef = useRef({ x: 0, y: 0 });
    const dragDistanceRef = useRef({ x: 0, y: 0 });
    const hasMovedRef = useRef(false);
    const initialTouchDistanceRef = useRef<number | null>(null);
    const initialScaleRef = useRef(1);
    const containerRef = useRef<HTMLDivElement>(null);
    const wasOpenRef = useRef(false);

    // Sync current index only when modal initially opens or when initialIndex explicitly updates on open
    useEffect(() => {
        if (open && (!wasOpenRef.current || currentIndex >= images.length)) {
            setCurrentIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
            setScale(1);
            setPosition({ x: 0, y: 0 });
            setIsLoading(true);
            setLoadError(false);
        }
        wasOpenRef.current = open;
    }, [open, initialIndex, images.length, currentIndex]);

    // Reset zoom and pan
    const resetTransform = useCallback(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }, []);

    const currentImage = images[currentIndex] || images[0];

    // Preload adjacent images for instant left/right navigation
    useEffect(() => {
        if (!open || images.length <= 1) return;

        const nextIndex = (currentIndex + 1) % images.length;
        const prevIndex = (currentIndex - 1 + images.length) % images.length;

        if (images[nextIndex]?.url) {
            const imgNext = new Image();
            imgNext.src = images[nextIndex].url;
        }
        if (images[prevIndex]?.url) {
            const imgPrev = new Image();
            imgPrev.src = images[prevIndex].url;
        }
    }, [open, currentIndex, images]);

    // Lock page background scrolling while modal is open
    useEffect(() => {
        if (!open) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    // Handle zoom adjustments
    const handleZoomIn = useCallback(() => {
        setScale((prev) => Math.min(MAX_SCALE, +(prev + SCALE_STEP).toFixed(2)));
    }, []);

    const handleZoomOut = useCallback(() => {
        setScale((prev) => {
            const next = Math.max(MIN_SCALE, +(prev - SCALE_STEP).toFixed(2));
            if (next <= 1) {
                setPosition({ x: 0, y: 0 });
            }
            return next;
        });
    }, []);

    const handleResetZoom = useCallback(() => {
        resetTransform();
    }, [resetTransform]);

    // Navigation Left and Right
    const handlePrev = useCallback(() => {
        if (images.length <= 1) return;
        setCurrentIndex((prev) => (prev > 0
            ? prev - 1
            : images.length - 1));
        resetTransform();
        setIsLoading(true);
        setLoadError(false);
    }, [images.length, resetTransform]);

    const handleNext = useCallback(() => {
        if (images.length <= 1) return;
        setCurrentIndex((prev) => (prev < images.length - 1
            ? prev + 1
            : 0));
        resetTransform();
        setIsLoading(true);
        setLoadError(false);
    }, [images.length, resetTransform]);

    // Download current image
    const handleDownload = useCallback(() => {
        if (!currentImage?.url) return;
        if (onDownload) {
            onDownload(currentImage);
        }
        else {
            triggerFileDownload(currentImage.url, currentImage.fileName);
        }
    }, [currentImage, onDownload]);

    // Keyboard controls
    useEffect(() => {
        if (!open) return;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
            else if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
                event.preventDefault();
                handlePrev();
            }
            else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
                event.preventDefault();
                handleNext();
            }
            else if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                handleZoomIn();
            }
            else if (event.key === '-' || event.key === '_') {
                event.preventDefault();
                handleZoomOut();
            }
            else if (event.key === '0') {
                event.preventDefault();
                handleResetZoom();
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose, handlePrev, handleNext, handleZoomIn, handleZoomOut, handleResetZoom]);

    // Mouse wheel zoom
    const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        const delta = event.deltaY < 0
            ? SCALE_STEP
            : -SCALE_STEP;
        setScale((prev) => {
            const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(prev + delta).toFixed(2)));
            if (next <= 1) {
                setPosition({ x: 0, y: 0 });
            }
            return next;
        });
    };

    // Double-click toggle
    const handleDoubleClick = () => {
        if (scale > 1) {
            resetTransform();
        }
        else {
            setScale(2);
        }
    };

    // Mouse drag / pan / swipe handlers
    const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.button !== 0) return; // Only left-click
        hasMovedRef.current = false;
        dragDistanceRef.current = { x: 0, y: 0 };
        setIsDragging(true);

        dragStartRef.current = {
            x: event.clientX - (scale > 1
                ? position.x
                : 0),
            y: event.clientY - (scale > 1
                ? position.y
                : 0)
        };
    };

    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;

        const deltaX = event.clientX - dragStartRef.current.x;
        const deltaY = event.clientY - dragStartRef.current.y;
        dragDistanceRef.current = { x: deltaX, y: deltaY };

        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            hasMovedRef.current = true;
        }

        if (scale > 1) {
            setPosition({
                x: event.clientX - dragStartRef.current.x,
                y: event.clientY - dragStartRef.current.y
            });
        }
    };

    const handleMouseUp = () => {
        if (isDragging && scale <= 1 && images.length > 1 && hasMovedRef.current) {
            // Horizontal swipe gesture at 1x scale
            if (dragDistanceRef.current.x < -SWIPE_THRESHOLD) {
                handleNext();
            }
            else if (dragDistanceRef.current.x > SWIPE_THRESHOLD) {
                handlePrev();
            }
        }
        setIsDragging(false);
    };

    // Touch gesture handlers for mobile
    const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
        if (event.touches.length === 1) {
            setIsDragging(true);
            hasMovedRef.current = false;
            dragDistanceRef.current = { x: 0, y: 0 };
            dragStartRef.current = {
                x: event.touches[0].clientX - (scale > 1
                    ? position.x
                    : 0),
                y: event.touches[0].clientY - (scale > 1
                    ? position.y
                    : 0)
            };
        }
        else if (event.touches.length === 2) {
            setIsDragging(false);
            const dist = Math.hypot(
                event.touches[0].clientX - event.touches[1].clientX,
                event.touches[0].clientY - event.touches[1].clientY
            );
            initialTouchDistanceRef.current = dist;
            initialScaleRef.current = scale;
        }
    };

    const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
        if (event.touches.length === 1 && isDragging) {
            const currentX = event.touches[0].clientX;
            const currentY = event.touches[0].clientY;
            const deltaX = currentX - dragStartRef.current.x;
            const deltaY = currentY - dragStartRef.current.y;
            dragDistanceRef.current = { x: deltaX, y: deltaY };

            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                hasMovedRef.current = true;
            }

            if (scale > 1) {
                setPosition({
                    x: currentX - dragStartRef.current.x,
                    y: currentY - dragStartRef.current.y
                });
            }
        }
        else if (event.touches.length === 2 && initialTouchDistanceRef.current !== null) {
            const dist = Math.hypot(
                event.touches[0].clientX - event.touches[1].clientX,
                event.touches[0].clientY - event.touches[1].clientY
            );
            const newScale = Math.min(
                MAX_SCALE,
                Math.max(MIN_SCALE, +(initialScaleRef.current * (dist / initialTouchDistanceRef.current)).toFixed(2))
            );
            setScale(newScale);
        }
    };

    const handleTouchEnd = () => {
        if (isDragging && scale <= 1 && images.length > 1 && hasMovedRef.current) {
            if (dragDistanceRef.current.x < -SWIPE_THRESHOLD) {
                handleNext();
            }
            else if (dragDistanceRef.current.x > SWIPE_THRESHOLD) {
                handlePrev();
            }
        }
        setIsDragging(false);
        initialTouchDistanceRef.current = null;
    };

    // Backdrop click: close if user clicked the backdrop without dragging
    const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === containerRef.current && !hasMovedRef.current) {
            onClose();
        }
    };

    if (!open || !currentImage) return null;

    return (
        <div
            aria-label={currentImage.fileName || 'Image preview'}
            aria-modal="true"
            className="fixed inset-0 z-[9999] flex flex-col bg-black/90 backdrop-blur-md select-none outline-none animate-in fade-in duration-200"
            ref={containerRef}
            role="dialog"
            onClick={handleBackdropClick}
        >
            {/* Top Toolbar */}
            <header className="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10 shrink-0 text-white z-20">
                {/* Left: File Info & Navigation Counter */}
                <div className="flex items-center gap-2.5 min-w-0 max-w-[45%]">
                    <FileImageIcon
                        className="text-blue-400 shrink-0"
                        size={20}
                        weight="bold"
                    />
                    <div className="flex flex-col min-w-0">
                        <span
                            className="text-sm font-semibold truncate text-white"
                            title={currentImage.fileName}
                        >
                            {currentImage.fileName}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-white/70">
                            {currentImage.fileSize !== undefined && currentImage.fileSize !== null && (
                                <span>{formatFileSize(currentImage.fileSize)}</span>
                            )}
                            {images.length > 1 && (
                                <span className="bg-white/15 px-1.5 py-0.2 rounded font-medium text-white">
                                    {currentIndex + 1} of {images.length}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Header Left/Right Quick Navigation buttons */}
                    {images.length > 1 && (
                        <div className="hidden md:flex items-center gap-1 ml-2 bg-white/10 p-0.5 rounded-lg border border-white/10">
                            <button
                                aria-label="Previous image"
                                className="cursor-pointer p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                                title="Previous image (Left Arrow or A)"
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrev();
                                }}
                            >
                                <CaretLeftIcon
                                    size={16}
                                    weight="bold"
                                />
                            </button>
                            <span className="text-xs px-1 text-white/90 font-medium">
                                {currentIndex + 1} / {images.length}
                            </span>
                            <button
                                aria-label="Next image"
                                className="cursor-pointer p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                                title="Next image (Right Arrow or D)"
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNext();
                                }}
                            >
                                <CaretRightIcon
                                    size={16}
                                    weight="bold"
                                />
                            </button>
                        </div>
                    )}
                </div>

                {/* Center: Zoom Controls */}
                <div className="flex items-center gap-1 sm:gap-1.5 bg-white/10 px-2 py-1 rounded-full backdrop-blur-sm border border-white/10">
                    <button
                        aria-label="Zoom out"
                        className="cursor-pointer p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        disabled={scale <= MIN_SCALE}
                        title="Zoom out (-)"
                        type="button"
                        onClick={handleZoomOut}
                    >
                        <MagnifyingGlassMinusIcon
                            size={18}
                            weight="bold"
                        />
                    </button>

                    <button
                        aria-label="Reset zoom"
                        className="cursor-pointer px-2 py-0.5 text-xs font-semibold text-white/90 hover:text-white hover:bg-white/15 rounded transition-colors"
                        title="Reset zoom to 100% (0)"
                        type="button"
                        onClick={handleResetZoom}
                    >
                        {Math.round(scale * 100)}%
                    </button>

                    <button
                        aria-label="Zoom in"
                        className="cursor-pointer p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        disabled={scale >= MAX_SCALE}
                        title="Zoom in (+)"
                        type="button"
                        onClick={handleZoomIn}
                    >
                        <MagnifyingGlassPlusIcon
                            size={18}
                            weight="bold"
                        />
                    </button>

                    <div className="w-[1px] h-4 bg-white/20 mx-0.5" />

                    <button
                        aria-label="Fit to screen"
                        className="cursor-pointer p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors"
                        title="Reset zoom and position"
                        type="button"
                        onClick={handleResetZoom}
                    >
                        <ArrowCounterClockwiseIcon
                            size={16}
                            weight="bold"
                        />
                    </button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    <button
                        aria-label="Download image"
                        className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-medium transition-colors border border-white/10"
                        title="Download image"
                        type="button"
                        onClick={handleDownload}
                    >
                        <DownloadSimpleIcon
                            size={16}
                            weight="bold"
                        />
                        <span className="hidden sm:inline">Download</span>
                    </button>

                    <button
                        aria-label="Close preview"
                        className="cursor-pointer p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors ml-1"
                        title="Close preview (Esc)"
                        type="button"
                        onClick={onClose}
                    >
                        <XIcon
                            size={20}
                            weight="bold"
                        />
                    </button>
                </div>
            </header>

            {/* Main Interactive Viewport */}
            <div
                className="flex-1 relative flex items-center justify-center overflow-hidden w-full h-full"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onTouchStart={handleTouchStart}
                onWheel={handleWheel}
            >
                {/* Previous Image Floating Side Button */}
                {images.length > 1 && (
                    <button
                        aria-label="Previous image"
                        className="cursor-pointer absolute left-4 sm:left-6 z-30 p-3 sm:p-3.5 rounded-full bg-black/65 hover:bg-black/90 text-white/90 hover:text-white border border-white/25 shadow-xl transition-all backdrop-blur-md hover:scale-110 active:scale-95"
                        title="Previous image (Left Arrow or A)"
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePrev();
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                    >
                        <CaretLeftIcon
                            size={28}
                            weight="bold"
                        />
                    </button>
                )}

                {/* Loading state indicator */}
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70 pointer-events-none z-10">
                        <SpinnerIcon
                            className="animate-spin text-white"
                            size={32}
                        />
                        <span className="text-xs">Loading image preview...</span>
                    </div>
                )}

                {/* Error state */}
                {loadError && (
                    <div className="flex flex-col items-center justify-center gap-3 text-white/80 p-6 text-center z-10">
                        <FileImageIcon
                            className="text-red-400"
                            size={48}
                            weight="duotone"
                        />
                        <p className="text-sm">Unable to load image preview.</p>
                        <button
                            className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs font-medium cursor-pointer"
                            type="button"
                            onClick={handleDownload}
                        >
                            Try downloading directly
                        </button>
                    </div>
                )}

                {/* The Zoomable, Pannable & Navigable Image */}
                <div
                    className={`flex items-center justify-center w-full h-full p-6 select-none ${
                        scale > 1
                            ? isDragging
                                ? 'cursor-grabbing'
                                : 'cursor-grab'
                            : 'cursor-zoom-in'
                    }`}
                    style={{
                        touchAction: 'none'
                    }}
                    onDoubleClick={handleDoubleClick}
                >
                    <img
                        alt={currentImage.fileName}
                        className={`max-w-[92vw] max-h-[80vh] object-contain transition-opacity duration-200 pointer-events-auto ${
                            isLoading
                                ? 'opacity-0'
                                : 'opacity-100'
                        }`}
                        draggable={false}
                        key={currentImage.url || currentIndex}
                        src={currentImage.url}
                        style={{
                            transform: `translate3d(${position.x}px, ${position.y}px, 0px) scale(${scale})`,
                            transition: isDragging
                                ? 'none'
                                : 'transform 120ms ease-out'
                        }}
                        onError={() => {
                            setIsLoading(false);
                            setLoadError(true);
                        }}
                        onLoad={() => {
                            setIsLoading(false);
                            setLoadError(false);
                        }}
                    />
                </div>

                {/* Next Image Floating Side Button */}
                {images.length > 1 && (
                    <button
                        aria-label="Next image"
                        className="cursor-pointer absolute right-4 sm:right-6 z-30 p-3 sm:p-3.5 rounded-full bg-black/65 hover:bg-black/90 text-white/90 hover:text-white border border-white/25 shadow-xl transition-all backdrop-blur-md hover:scale-110 active:scale-95"
                        title="Next image (Right Arrow or D)"
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNext();
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                    >
                        <CaretRightIcon
                            size={28}
                            weight="bold"
                        />
                    </button>
                )}
            </div>

            {/* Bottom thumbnail strip for multiple images */}
            {images.length > 1 && (
                <footer className="flex items-center justify-center gap-2.5 py-3 px-4 bg-black/60 border-t border-white/10 shrink-0 overflow-x-auto z-20">
                    {images.map((img, idx) => (
                        <button
                            aria-label={`View ${img.fileName} (${idx + 1} of ${images.length})`}
                            className={`cursor-pointer w-14 h-11 rounded-lg border-2 overflow-hidden transition-all shrink-0 relative ${
                                idx === currentIndex
                                    ? 'border-blue-500 ring-2 ring-blue-400/50 scale-105 shadow-md'
                                    : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/50'
                            }`}
                            key={img.url || idx}
                            title={`${img.fileName} (${idx + 1}/${images.length})`}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentIndex(idx);
                                resetTransform();
                                setIsLoading(true);
                                setLoadError(false);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <img
                                alt={img.fileName}
                                className="w-full h-full object-cover"
                                src={img.url}
                            />
                            {idx === currentIndex && (
                                <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
                            )}
                        </button>
                    ))}
                </footer>
            )}
        </div>
    );
}