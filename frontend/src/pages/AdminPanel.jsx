import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminPanel.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function AdminPanel() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    fetchOverview();
  }, [navigate]);

  const fetchOverview = async () => {
    const response = await fetch(`${API_URL}/admin/overview`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (response.ok) {
      const data = await response.json();
      setOverview(data);
    }
  };

  return (
    <div className="admin-panel">
      <header>
        <button className="secondary-btn" onClick={() => navigate('/dashboard')}>
          لوحة الطالب
        </button>
        <h2>لوحة التحكم</h2>
      </header>

      {overview && (
        <>
          <section className="stats">
            <div>
              <span>الطلاب</span>
              <strong>{overview.stats.users}</strong>
            </div>
            <div>
              <span>المحادثات</span>
              <strong>{overview.stats.chats}</strong>
            </div>
            <div>
              <span>الملفات</span>
              <strong>{overview.stats.uploads}</strong>
            </div>
          </section>

          <section>
            <h3>أحدث الملفات</h3>
            <ul>
              {overview.latestUploads.map((item) => (
                <li key={item.id}>
                  {item.file_path} - {new Date(item.uploaded_at).toLocaleString('ar-SA')}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3>مصادر التدريب للتخصيص</h3>
            <ul>
              {overview.fineTuneSources.map((item, index) => (
                <li key={index}>{item.file_path}</li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

export default AdminPanel;
