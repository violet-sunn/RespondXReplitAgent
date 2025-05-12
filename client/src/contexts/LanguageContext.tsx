import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';

import enLocale from '../locales/en.json';
import ruLocale from '../locales/ru.json';
import esLocale from '../locales/es.json';

// Map of language codes to their full names
export const LANGUAGES = {
  en: 'English',
  ru: 'Русский',
  es: 'Español'
};

// Type for our translation function
type TranslateFunction = (key: string, params?: Record<string, string>) => string;

interface LanguageContextType {
  language: string;
  setLanguage: (language: string) => void;
  t: TranslateFunction;
  isLanguageLoaded: boolean;
}

interface LanguageProviderProps {
  children: ReactNode;
}

// Create language context with default values
const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: () => '',
  isLanguageLoaded: false
});

// Map of available locales
const locales: Record<string, Record<string, any>> = {
  en: enLocale,
  ru: ruLocale,
  es: esLocale
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<string>('en');
  const [translations, setTranslations] = useState<Record<string, any>>(locales.en);
  const [isLanguageLoaded, setIsLanguageLoaded] = useState<boolean>(false);

  // Load language from user settings on initial load
  useEffect(() => {
    const fetchLanguageSettings = async () => {
      try {
        const response = await apiRequest('GET', '/api/settings');
        const data = await response.json();
        
        if (data?.language?.defaultLanguage) {
          setLanguage(data.language.defaultLanguage);
        } else {
          // If no language settings found, use browser language or default to English
          const browserLang = navigator.language.split('-')[0];
          const supportedLang = Object.keys(locales).includes(browserLang) ? browserLang : 'en';
          setLanguage(supportedLang);
        }
      } catch (error) {
        console.error('Failed to load language settings:', error);
        setLanguage('en'); // Default to English if there's an error
      } finally {
        setIsLanguageLoaded(true);
      }
    };

    fetchLanguageSettings();
  }, []);

  // Update language setting
  const setLanguage = async (lang: string) => {
    if (Object.keys(locales).includes(lang)) {
      setLanguageState(lang);
      setTranslations(locales[lang]);
      
      // Save language preference to server
      try {
        await apiRequest('PATCH', '/api/settings/language', {
          defaultLanguage: lang
        });
      } catch (error) {
        console.error('Failed to save language setting:', error);
      }
    } else {
      console.error(`Language ${lang} is not supported`);
    }
  };

  // Translation function
  const t: TranslateFunction = (key, params) => {
    // Split key by dots to access nested properties
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key; // Return the key if translation not found
      }
    }
    
    // Return the translation or the key if no translation found
    if (typeof value === 'string') {
      // Replace parameters if any
      if (params) {
        return Object.entries(params).reduce(
          (str, [paramKey, paramVal]) => str.replace(`{${paramKey}}`, paramVal),
          value
        );
      }
      return value;
    }
    
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isLanguageLoaded }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = () => useContext(LanguageContext);