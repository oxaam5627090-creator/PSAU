import './LanguageToggle.css';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

function LanguageToggle({ onLanguageChange }) {
  const { language, setLanguage, t } = useTranslation();

  const handleClick = () => {
    const next = language === 'ar' ? 'en' : 'ar';
    setLanguage(next);
    if (typeof onLanguageChange === 'function') {
      onLanguageChange(next);
    }
  };

  return (
    <button type="button" className="language-toggle" onClick={handleClick}>
      {language === 'ar' ? t('languageSwitchToEnglish') : t('languageSwitchToArabic')}
    </button>
  );
}

export default LanguageToggle;
