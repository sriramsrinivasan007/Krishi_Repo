import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { languages } from '../locales/translations';
import type { Locale } from '../types';

const LanguageSelector: React.FC = () => {
  const { locale, setLocale } = useTranslation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocale(e.target.value as Locale);
  };

  return (
    <div className="relative">
      <select
        value={locale}
        onChange={handleLanguageChange}
        className="appearance-none bg-secondary border-2 border-transparent text-secondary-foreground font-semibold py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:border-ring transition duration-300 cursor-pointer"
        aria-label="Select language"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-background text-foreground">
            {lang.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-secondary-foreground">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
    </div>
  );
};

export default LanguageSelector;