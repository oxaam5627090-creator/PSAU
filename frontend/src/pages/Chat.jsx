import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../components/AuthContext';

export default function Chat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chats, setChats] = useState([]);

  useEffect(() => {
    const loadChats = async () => {
      const { data } = await axios.get('/api/chat');
      setChats(data);
    };
    loadChats();
  }, []);

  useEffect(() => {
    const loadChat = async () => {
      if (!chatId) {
        setHistory([]);
        return;
      }
      const { data } = await axios.get(`/api/chat/${chatId}`);
      setHistory(data.messages || []);
    };
    loadChat();
  }, [chatId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    try {
      const payload = {
        chatId,
        message: input,
        history
      };
      const { data } = await axios.post('/api/chat', payload);
      const newHistory = [
        ...history,
        { role: 'user', content: input },
        { role: 'assistant', content: data.answer }
      ];
      setHistory(newHistory);
      setInput('');
      if (!chatId) {
        const newChat = {
          id: data.chatId,
          summary: data.answer.slice(0, 60),
          created_at: new Date().toISOString()
        };
        setChats((prev) => [newChat, ...prev]);
        navigate(`/chat/${data.chatId}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page chat">
      <aside>
        <h3>محادثاتي</h3>
        <button className="new-chat" onClick={() => navigate('/chat')}>
          محادثة جديدة
        </button>
        <ul>
          {chats.map((chat) => (
            <li key={chat.id} className={String(chat.id) === chatId ? 'active' : ''}>
              <Link to={`/chat/${chat.id}`}>{chat.summary || `محادثة ${chat.id}`}</Link>
            </li>
          ))}
        </ul>
      </aside>
      <main>
        <header>
          <h2>دليلك الجامعي</h2>
          <p>خدمة الطلاب - {user?.college}</p>
        </header>
        <div className="messages">
          {history.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <span>{msg.role === 'user' ? 'أنا' : 'المساعد'}</span>
              <p>{msg.content}</p>
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} className="chat-input">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="اسأل عن أمورك الجامعية" />
          <button type="submit" disabled={loading}>
            {loading ? 'يرد...' : 'إرسال'}
          </button>
        </form>
      </main>
    </div>
  );
}
