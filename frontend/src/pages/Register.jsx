import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Register.css';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function Register() {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const [form, setForm] = useState({
    universityId: '',
    name: '',
    college: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (form.confirmPassword && form.confirmPassword !== form.password) {
      setError(t('registerPasswordMismatch'));
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universityId: form.universityId,
          name: form.name,
          college: form.college,
          password: form.password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || t('registerError'));
      }

      setSuccess(t('registerSuccess'));
      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="register-page" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="register-toggle">
        <LanguageToggle />
      </div>
      <form className="register-card" onSubmit={handleSubmit}>
        <h1>{t('registerTitle')}</h1>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        <label>
          {t('registerUniversityId')}
          <input
            type="text"
            name="universityId"
            value={form.universityId}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          {t('registerName')}
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          {t('registerCollege')}
          <input
            type="text"
            name="college"
            value={form.college}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          {t('registerPassword')}
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          {t('registerConfirmPassword')}
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
          />
        </label>
        <button type="submit">{t('registerSubmit')}</button>
        <p className="secondary-action">
          {t('registerHaveAccount')}{' '}
          <Link to="/login">{t('registerLoginLink')}</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;
