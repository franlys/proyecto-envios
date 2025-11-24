import React from 'react';

const Loader = ({ size = 'medium', text = 'Cargando...' }) => {
    const sizeClasses = {
        small: 'w-5 h-5',
        medium: 'w-10 h-10',
        large: 'w-16 h-16',
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[200px] w-full">
            <div className={`relative ${sizeClasses[size]}`}>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-primary-200 rounded-full animate-pulse"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            {text && (
                <p className="mt-4 text-gray-500 font-medium animate-pulse">{text}</p>
            )}
        </div>
    );
};

export default Loader;
