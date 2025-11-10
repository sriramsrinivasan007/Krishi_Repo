import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Locale } from '../types';
import { translations } from '../locales/translations';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, replacements?: { [key: string]: string }) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const getInitialLocale = (): Locale => {
  const savedLocale = localStorage.getItem('locale');
  if (savedLocale && Object.keys(translations).includes(savedLocale)) {
    return savedLocale as Locale;
  }
  return 'en';
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    localStorage.setItem('locale', locale);
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    if (Object.keys(translations).includes(newLocale)) {
      setLocaleState(newLocale);
    }
  };

  const t = useCallback((key: string, replacements?: { [key: string]: string }) => {
    let translation = translations[locale][key] || translations['en'][key] || key;
    if (replacements) {
        Object.keys(replacements).forEach(placeholder => {
            translation = translation.replace(`{{${placeholder}}}`, replacements[placeholder]);
        });
    }
    return translation;
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
