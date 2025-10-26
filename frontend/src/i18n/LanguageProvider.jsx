import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations';

const LanguageContext = createContext({
  language: 'ar',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const stored = localStorage.getItem('language');
    return stored === 'en' ? 'en' : 'ar';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language === 'en' ? 'en' : 'ar';
    document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
  }, [language]);

  const setLanguage = useCallback((value) => {
    setLanguageState(value === 'en' ? 'en' : 'ar');
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'ar' ? 'en' : 'ar'));
  }, []);

  const translate = useCallback(
    (key, params = {}) => {
      const dict = translations[language] || translations.ar;
      const fallback = translations.ar || {};
      const template = (dict && dict[key]) || (fallback && fallback[key]) || key;
      if (!template || typeof template !== 'string') {
        return key;
      }
      return Object.keys(params).reduce((acc, paramKey) => {
        const value = params[paramKey];
        const pattern = new RegExp(`{{\s*${paramKey}\s*}}`, 'g');
        return acc.replace(pattern, value ?? '');
      }, template);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t: translate,
    }),
    [language, setLanguage, toggleLanguage, translate]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  return useContext(LanguageContext);
}
