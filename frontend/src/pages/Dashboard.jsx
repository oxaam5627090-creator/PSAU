import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Dashboard.css';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function Dashboard() {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useTranslation();
  const [uploads, setUploads] = useState([]);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ name: '', college: '', notes: '' });
  const [scheduleEntries, setScheduleEntries] = useState([{ day: '', time: '', course: '' }]);
  const [profileMessage, setProfileMessage] = useState('');
  const [scheduleMessage, setScheduleMessage] = useState('');
  const [languageMessage, setLanguageMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchUploads();
  }, [navigate]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/user/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) {
        throw new Error(t('dashboardProfileError'));
      }

      const data = await response.json();
      setProfile(data);
      setLanguage(data.preferredLanguage || 'ar');
      syncUserStorage({
        id: data.id,
        name: data.name,
        college: data.college,
        schedule: data.schedule,
        personalInfo: data.personalInfo,
        preferredLanguage: data.preferredLanguage,
      });

      setProfileForm({
        name: data.name || '',
        college: data.college || '',
        notes: (data.personalInfo && data.personalInfo.notes) || '',
      });

      const normalizedSchedule = normalizeSchedule(data.schedule);
      setScheduleEntries(normalizedSchedule.length ? normalizedSchedule : [createEmptyRow()]);
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message);
    }
  };

  const fetchUploads = async () => {
    try {
      const response = await fetch(`${API_URL}/uploads`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) {
        throw new Error(t('dashboardUploadsError'));
      }
      const data = await response.json();
      setUploads(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    clearMessages();
    try {
      const existingInfo = (profile && profile.personalInfo) || {};
      const personalInfo = { ...existingInfo };
      const notes = profileForm.notes.trim();
      if (notes) {
        personalInfo.notes = notes;
      } else {
        delete personalInfo.notes;
      }

      const response = await fetch(`${API_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: profileForm.name,
          college: profileForm.college,
          personalInfo,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || t('dashboardProfileSaveError'));
      }

      const updated = await response.json();
      setProfile(updated);
      syncUserStorage({
        name: updated.name,
        college: updated.college,
        personalInfo: updated.personalInfo,
      });
      setProfileForm({
        name: updated.name || '',
        college: updated.college || '',
        notes: (updated.personalInfo && updated.personalInfo.notes) || '',
      });
      setProfileMessage(t('dashboardProfileSaved'));
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleScheduleChange = (index, field, value) => {
    setScheduleEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addScheduleRow = () => {
    setScheduleEntries((prev) => [...prev, createEmptyRow()]);
  };

  const removeScheduleRow = (index) => {
    setScheduleEntries((prev) => {
      if (prev.length === 1) {
        return [createEmptyRow()];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleSaveSchedule = async () => {
    clearMessages();
    try {
      const cleaned = scheduleEntries
        .map((entry) => ({
          day: entry.day.trim(),
          time: entry.time.trim(),
          course: entry.course.trim(),
        }))
        .filter((entry) => entry.day || entry.time || entry.course);

      const response = await fetch(`${API_URL}/user/schedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ schedule: cleaned }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || t('dashboardScheduleSaveError'));
      }

      const updated = await response.json();
      setProfile(updated);
      syncUserStorage({ schedule: updated.schedule });
      const normalized = normalizeSchedule(updated.schedule);
      setScheduleEntries(normalized.length ? normalized : [createEmptyRow()]);
      setScheduleMessage(t('dashboardScheduleSaved'));
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleLanguageChange = async (nextLanguage) => {
    clearMessages();
    try {
      const response = await fetch(`${API_URL}/user/language`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ language: nextLanguage }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || t('dashboardLanguageError'));
      }

      const updated = await response.json();
      setProfile(updated);
      syncUserStorage({ preferredLanguage: updated.preferredLanguage });
      setLanguageMessage(t('dashboardLanguageUpdated'));
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const clearMessages = () => {
    setProfileMessage('');
    setScheduleMessage('');
    setLanguageMessage('');
    setErrorMessage('');
  };

  const greeting = useMemo(() => {
    if (!profile) return '';
    return t('dashboardGreeting', { name: profile.name || '' });
  }, [profile, t]);

  const collegeLine = useMemo(() => {
    if (!profile) return '';
    return t('dashboardCollege', { college: profile.college || '-' });
  }, [profile, t]);

  return (
    <div className="dashboard" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header>
        <div>
          <h2>{greeting}</h2>
          <p>{collegeLine}</p>
        </div>
        <div className="header-actions">
          <LanguageToggle onLanguageChange={handleLanguageChange} />
          <Link to="/chat" className="primary-btn">
            {t('dashboardStartChat')}
          </Link>
          <button onClick={handleLogout} className="secondary-btn">
            {t('dashboardLogout')}
          </button>
        </div>
      </header>

      {errorMessage && <div className="dashboard-alert error">{errorMessage}</div>}
      {languageMessage && <div className="dashboard-alert success">{languageMessage}</div>}

      <section className="profile">
        <h3>{t('dashboardProfileTitle')}</h3>
        {profileMessage && <div className="dashboard-alert success">{profileMessage}</div>}
        <div className="profile-grid">
          <label>
            {t('dashboardProfileName')}
            <input
              type="text"
              name="name"
              value={profileForm.name}
              onChange={handleProfileChange}
            />
          </label>
          <label>
            {t('dashboardProfileCollege')}
            <input
              type="text"
              name="college"
              value={profileForm.college}
              onChange={handleProfileChange}
            />
          </label>
          <label className="profile-notes">
            {t('dashboardProfileNotes')}
            <textarea
              name="notes"
              value={profileForm.notes}
              onChange={handleProfileChange}
              rows={4}
            />
          </label>
        </div>
        <button type="button" className="primary-btn" onClick={handleSaveProfile}>
          {t('dashboardProfileSave')}
        </button>
      </section>

      <section className="schedule">
        <h3>{t('dashboardScheduleTitle')}</h3>
        {scheduleMessage && <div className="dashboard-alert success">{scheduleMessage}</div>}
        <div className="schedule-table">
          <div className="schedule-header">
            <span>{t('dashboardScheduleDay')}</span>
            <span>{t('dashboardScheduleTime')}</span>
            <span>{t('dashboardScheduleCourse')}</span>
            <span></span>
          </div>
          {scheduleEntries.length === 0 && (
            <p className="empty-message">{t('dashboardScheduleEmpty')}</p>
          )}
          {scheduleEntries.map((entry, index) => (
            <div key={index} className="schedule-row">
              <input
                type="text"
                value={entry.day}
                placeholder={t('scheduleDayPlaceholder')}
                onChange={(e) => handleScheduleChange(index, 'day', e.target.value)}
              />
              <input
                type="text"
                value={entry.time}
                placeholder={t('scheduleTimePlaceholder')}
                onChange={(e) => handleScheduleChange(index, 'time', e.target.value)}
              />
              <input
                type="text"
                value={entry.course}
                placeholder={t('scheduleCoursePlaceholder')}
                onChange={(e) => handleScheduleChange(index, 'course', e.target.value)}
              />
              <button
                type="button"
                className="secondary-btn"
                onClick={() => removeScheduleRow(index)}
              >
                {t('dashboardScheduleRemoveRow')}
              </button>
            </div>
          ))}
        </div>
        <div className="schedule-actions">
          <button type="button" className="secondary-btn" onClick={addScheduleRow}>
            {t('dashboardScheduleAddRow')}
          </button>
          <button type="button" className="primary-btn" onClick={handleSaveSchedule}>
            {t('dashboardScheduleSave')}
          </button>
        </div>
      </section>

      <section className="uploads">
        <h3>{t('dashboardUploadsTitle')}</h3>
        <table>
          <thead>
            <tr>
              <th>{t('dashboardUploadsTableName')}</th>
              <th>{t('dashboardUploadsTableType')}</th>
              <th>{t('dashboardUploadsTableDate')}</th>
            </tr>
          </thead>
          <tbody>
            {uploads.map((file) => (
              <tr key={file.id}>
                <td>{file.original_name || file.file_path}</td>
                <td>{file.file_type}</td>
                <td>
                  {new Date(file.uploaded_at).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default Dashboard;

function createEmptyRow() {
  return { day: '', time: '', course: '' };
}

function normalizeSchedule(schedule) {
  if (!schedule) {
    return [];
  }

  if (Array.isArray(schedule)) {
    return schedule.map((entry) => ({
      day: entry.day || '',
      time: entry.time || '',
      course: entry.course || entry.subject || '',
    }));
  }

  if (typeof schedule === 'object') {
    return Object.entries(schedule).map(([day, value]) => {
      if (value && typeof value === 'object') {
        return {
          day,
          time: value.time || '',
          course: value.course || value.subject || '',
        };
      }
      return { day, time: '', course: typeof value === 'string' ? value : '' };
    });
  }

  return [];
}

function syncUserStorage(patch) {
  try {
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...stored, ...patch }));
  } catch (error) {
    // Ignore JSON errors silently.
  }
}
