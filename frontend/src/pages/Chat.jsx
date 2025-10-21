import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Chat.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function Chat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);

    const url = chatId ? `${API_URL}/chat/${chatId}` : `${API_URL}/chat`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ message: input }),
    });

    const data = await response.json();
    if (response.ok) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: input },
        { role: 'assistant', content: data.message },
      ]);
      if (!chatId) {
        navigate(`/chat/${data.chatId}`);
      }
    }

    setInput('');
    setLoading(false);
  };

  return (
    <div className="chat-page">
      <header>
        <button onClick={() => navigate('/dashboard')} className="secondary-btn">
          رجوع
        </button>
        <h2>دليلك الجامعي</h2>
      </header>
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`bubble ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="composer">
        <input
          placeholder="اسأل عن جدولك أو لوائح الجامعة..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? 'جارٍ الرد...' : 'إرسال'}
        </button>
      </div>
    </div>
  );
}

export default Chat;
