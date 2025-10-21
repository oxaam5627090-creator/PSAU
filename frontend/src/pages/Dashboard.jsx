import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../components/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [uploads, setUploads] = useState([]);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const fetchUploads = async () => {
    const { data } = await axios.get('/api/upload');
    setUploads(data);
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await axios.post('/api/upload', formData);
      setMessage(data.message);
      setFile(null);
      fetchUploads();
    } catch (error) {
      setMessage(error.response?.data?.message || 'تعذّر رفع الملف');
    }
  };

  return (
    <div className="page dashboard">
      <header>
        <div>
          <h2>مرحبا {user?.name}</h2>
          <p>تخصصك: {user?.college}</p>
        </div>
        <div className="actions">
          <Link to="/chat">المحادثات</Link>
          <Link to="/admin">لوحة المشرف</Link>
          <button onClick={logout}>خروج</button>
        </div>
      </header>
      <section className="card">
        <h3>رفع ملفات</h3>
        <form onSubmit={handleUpload}>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          <button type="submit">رفع</button>
        </form>
        {message && <p>{message}</p>}
      </section>
      <section className="card">
        <h3>ملفاتي الأخيرة</h3>
        <ul>
          {uploads.map((item) => (
            <li key={item.id}>
              {item.file_type} - {new Date(item.uploaded_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
