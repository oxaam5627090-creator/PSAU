import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function Dashboard() {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    fetchUploads();
  }, [navigate]);

  const fetchUploads = async () => {
    const response = await fetch(`${API_URL}/uploads`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (response.ok) {
      const data = await response.json();
      setUploads(data);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header>
        <div>
          <h2>مرحبا {user?.name}</h2>
          <p>تخصصك: {user?.college}</p>
        </div>
        <div className="header-actions">
          <Link to="/chat" className="primary-btn">
            ابدأ محادثة جديدة
          </Link>
          <button onClick={handleLogout} className="secondary-btn">
            خروج
          </button>
        </div>
      </header>

      <section className="uploads">
        <h3>ملفاتك الأخيرة</h3>
        <table>
          <thead>
            <tr>
              <th>المعرف</th>
              <th>النوع</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {uploads.map((file) => (
              <tr key={file.id}>
                <td>{file.id}</td>
                <td>{file.file_type}</td>
                <td>{new Date(file.uploaded_at).toLocaleString('ar-SA')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default Dashboard;
