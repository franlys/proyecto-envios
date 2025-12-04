import { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

const PullToRefresh = ({ onRefresh, children }) => {
    const [startY, setStartY] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const containerRef = useRef(null);
    const THRESHOLD = 80;

    const handleTouchStart = (e) => {
        // Solo activar si estamos al principio del scroll
        if (window.scrollY === 0) {
            setStartY(e.touches[0].clientY);
        }
    };

    const handleTouchMove = (e) => {
        if (startY === 0) return;
        const currentY = e.touches[0].clientY;
        const distance = currentY - startY;

        // Solo permitir pull si estamos en el top y arrastramos hacia abajo
        if (distance > 0 && window.scrollY === 0) {
            // Add resistance
            setPullDistance(Math.min(distance * 0.5, 120));
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance > THRESHOLD) {
            setRefreshing(true);
            setPullDistance(THRESHOLD); // Snap to threshold
            try {
                await onRefresh();
            } finally {
                setTimeout(() => {
                    setRefreshing(false);
                    setPullDistance(0);
                    setStartY(0);
                }, 500);
            }
        } else {
            setPullDistance(0);
            setStartY(0);
        }
    };

    return (
        <div
            ref={containerRef}
            className="min-h-screen relative"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Indicator */}
            <div
                className="fixed top-16 left-0 w-full flex justify-center items-center pointer-events-none transition-all duration-200 z-50"
                style={{
                    opacity: pullDistance > 0 ? 1 : 0,
                    transform: `translateY(${pullDistance > 0 ? pullDistance : -50}px)`
                }}
            >
                <div className={`bg-white dark:bg-slate-800 rounded-full p-3 shadow-lg border border-slate-200 dark:border-slate-700 ${refreshing ? 'animate-spin' : ''}`}>
                    <RefreshCw size={24} className={`text-indigo-600 ${pullDistance > THRESHOLD && !refreshing ? 'rotate-180 transition-transform duration-300' : ''}`} />
                </div>
            </div>

            {/* Content */}
            <div
                style={{
                    transform: `translateY(${pullDistance}px)`,
                    transition: refreshing ? 'transform 0.2s' : 'none'
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default PullToRefresh;
