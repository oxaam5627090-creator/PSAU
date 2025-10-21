import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function AdminPanel() {
  const [overview, setOverview] = useState(null);
  const [trainingFiles, setTrainingFiles] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const [overviewRes, filesRes] = await Promise.all([
        axios.get('/api/admin/overview'),
        axios.get('/api/admin/training-files')
      ]);
      setOverview(overviewRes.data);
      setTrainingFiles(filesRes.data);
    };
    fetchData();
  }, []);

  return (
    <div className="page admin">
      <header>
        <h2>لوحة المشرف</h2>
        <Link to="/">الرجوع للوحة الطالب</Link>
      </header>
      <section className="card">
        <h3>نظرة عامة</h3>
        {overview ? (
          <ul>
            <li>عدد المستخدمين: {overview.users}</li>
            <li>عدد الملفات: {overview.uploads}</li>
            <li>عدد المحادثات: {overview.chats}</li>
          </ul>
        ) : (
          <p>جاري التحميل...</p>
        )}
      </section>
      <section className="card">
        <h3>مصادر التدريب الأخيرة</h3>
        <ul>
          {trainingFiles.map((file, index) => (
            <li key={index}>{file.file_path}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
