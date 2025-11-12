import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface ApiKeyErrorDisplayProps {
  smallText?: boolean;
}

const ApiKeyErrorDisplay: React.FC<ApiKeyErrorDisplayProps> = ({ smallText = false }) => {
  const { t } = useTranslation();
  const vercelDocsUrl = 'https://vercel.com/docs/projects/environment-variables';

  const textSize = smallText ? 'text-sm' : '';

  return (
    <div className={`text-left max-w-xl mx-auto ${textSize}`}>
      <p className="mb-4">{t('error_api_key_missing_intro')}</p>
      <ol className="list-decimal list-inside space-y-2 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
        <li>
          {t('error_api_key_step1_prefix')}{' '}
          <a href={vercelDocsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-red-800 dark:text-red-300 underline hover:text-red-900 dark:hover:text-red-200">
            {t('error_api_key_step1_link')}
          </a>
          {t('error_api_key_step1_suffix')}
        </li>
        <li>
          {t('error_api_key_step2')}{' '}
          <code className="px-2 py-1 font-mono text-sm bg-red-200 dark:bg-red-800/50 text-red-900 dark:text-red-200 rounded">
            VITE_API_KEY
          </code>.
        </li>
        <li>{t('error_api_key_step3')}</li>
        <li>{t('error_api_key_step4')}</li>
      </ol>
    </div>
  );
};

export default ApiKeyErrorDisplay;
