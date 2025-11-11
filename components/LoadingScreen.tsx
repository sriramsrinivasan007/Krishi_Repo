import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { useTranslation } from '../hooks/useTranslation';

const LoadingScreen: React.FC = () => {
    const { t } = useTranslation();
    const [messageIndex, setMessageIndex] = useState(0);

    // FIX: Memoize messages array to prevent re-creation on every render, which would reset the interval.
    const messages = React.useMemo(() => [
        t('loading_message_1'),
        t('loading_message_2'),
        t('loading_message_3'),
        t('loading_message_4'),
        t('loading_message_5'),
    ], [t]);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
        }, 2500); // Change message every 2.5 seconds

        return () => clearInterval(interval);
    }, [messages.length]);

    return (
        <div className="flex flex-col items-center justify-center text-center h-96">
            <LoadingSpinner />
            <p className="text-xl text-brand-primary-light mt-6 font-semibold transition-opacity duration-500 ease-in-out h-8">
                {messages[messageIndex]}
            </p>
            <p className="text-md text-brand-text-secondary dark:text-gray-400 mt-2">{t('loading_subtitle')}</p>
        </div>
    );
};

export default LoadingScreen;
