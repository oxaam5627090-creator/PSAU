import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function Login() {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useTranslation();
  const [form, setForm] = useState({
    universityId: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || t('loginError'));
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.user?.preferredLanguage) {
        setLanguage(data.user.preferredLanguage);
      }

      navigate('/chat');

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="login-toggle">
        <LanguageToggle />
      </div>
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>{t('loginTitle')}</h1>
        {error && <p className="error">{error}</p>}
        <label>
          {t('loginUniversityId')}
          <input
            type="text"
            name="universityId"
            value={form.universityId}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          {t('loginPassword')}
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>
        <button type="submit">{t('loginSubmit')}</button>
        <p className="secondary-action">
          {t('loginRegisterPrompt')}{' '}
          <Link to="/register">{t('loginRegisterLink')}</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
