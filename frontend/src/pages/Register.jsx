import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Register.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function Register() {
  const navigate = useNavigate();
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
      setError('كلمتا المرور غير متطابقتين');
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
        throw new Error(data.message || 'تعذر إنشاء الحساب');
      }

      setSuccess('تم إنشاء الحساب بنجاح! سيتم تحويلك إلى صفحة تسجيل الدخول.');
      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="register-page">
      <form className="register-card" onSubmit={handleSubmit}>
        <h1>إنشاء حساب جديد</h1>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        <label>
          الرقم الجامعي
          <input
            type="text"
            name="universityId"
            value={form.universityId}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          الاسم الكامل
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          الكلية
          <input
            type="text"
            name="college"
            value={form.college}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          كلمة المرور
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          تأكيد كلمة المرور (اختياري)
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
          />
        </label>
        <button type="submit">تسجيل</button>
        <p className="secondary-action">
          لديك حساب بالفعل؟ <Link to="/login">توجه إلى تسجيل الدخول</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;
