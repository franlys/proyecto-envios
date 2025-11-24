// admin_web/src/hooks/useIsMobile.js
import { useState, useEffect } from 'react';

export const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);
    const [isCapacitor, setIsCapacitor] = useState(false);

    useEffect(() => {
        // Detectar si estamos en Capacitor
        const checkCapacitor = () => {
            return window.Capacitor !== undefined;
        };

        // Detectar si es móvil por tamaño de pantalla
        const checkMobile = () => {
            return window.innerWidth < 1024; // lg breakpoint de Tailwind
        };

        setIsCapacitor(checkCapacitor());
        setIsMobile(checkMobile());

        const handleResize = () => {
            setIsMobile(checkMobile());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return { isMobile, isCapacitor, isMobileApp: isMobile || isCapacitor };
};
