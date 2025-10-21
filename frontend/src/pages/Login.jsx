import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function Login() {
  const navigate = useNavigate();
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
        throw new Error(data.message || 'فشل تسجيل الدخول');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>دخول الطلاب</h1>
        {error && <p className="error">{error}</p>}
        <label>
          رقمك الجامعي
          <input
            type="text"
            name="universityId"
            value={form.universityId}
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
        <button type="submit">دخول</button>
      </form>
    </div>
  );
}

export default Login;
