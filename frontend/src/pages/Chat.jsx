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

  const [currentChatId, setCurrentChatId] = useState(chatId);
  const [error, setError] = useState(null);
  const endRef = useRef(null);
  const streamingIndexRef = useRef(null);


  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {

    setCurrentChatId(chatId);
  }, [chatId]);

  useEffect(() => {

    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {

    if (!input.trim() || loading) return;

    const messageToSend = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    setMessages((prev) => {
      const updated = [
        ...prev,
        { role: 'user', content: messageToSend },
        { role: 'assistant', content: '' },
      ];
      streamingIndexRef.current = updated.length - 1;
      return updated;
    });

    const url = currentChatId
      ? `${API_URL}/chat/${currentChatId}`
      : `${API_URL}/chat`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ message: messageToSend }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.message || 'تعذر الحصول على رد من المساعد');
      }

      if (!response.body) {
        throw new Error('لم يتم استقبال أي بيانات من الخادم');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const processEvent = (eventBlock) => {
        const lines = eventBlock.split('\n');
        const dataLines = [];

        for (const rawLine of lines) {
          const line = rawLine.trimEnd();

          if (!line || line.startsWith(':')) {
            continue;
          }

          if (line.startsWith('data:')) {
            let value = line.slice(5);
            if (value.startsWith(' ')) {
              value = value.slice(1);
            }
            dataLines.push(value);
          }
        }

        if (!dataLines.length) {
          return;
        }

        const payloadText = dataLines.join('\n');

        if (payloadText === '[DONE]') {
          streamingIndexRef.current = null;
          setLoading(false);
          return;
        }

        let payload;
        try {
          payload = JSON.parse(payloadText);
        } catch (parseError) {
          console.warn('Ignoring malformed SSE payload:', payloadText, parseError);
          return;
        }

        if (payload.token) {
          setMessages((prev) => {
            const updated = [...prev];
            const idx = streamingIndexRef.current;
            if (idx !== null && updated[idx]) {
              updated[idx] = {
                ...updated[idx],
                content: (updated[idx].content || '') + payload.token,
              };
            }
            return updated;
          });
        }

        if (payload.chatId && !currentChatId) {
          setCurrentChatId(payload.chatId.toString());
          navigate(`/chat/${payload.chatId}`, { replace: true });
        }

        if (payload.error) {
          throw new Error(payload.error);
        }

        if (payload.done) {
          if (payload.message) {
            setMessages((prev) => {
              const updated = [...prev];
              const idx = streamingIndexRef.current;
              if (idx !== null && updated[idx]) {
                updated[idx] = { ...updated[idx], content: payload.message };
              }
              return updated;
            });
          }
          streamingIndexRef.current = null;
          setLoading(false);
        }
      };

      const flushBuffer = (final = false) => {
        if (!buffer) {
          return;
        }

        const normalized = buffer
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n');
        const parts = normalized.split(/\n{2,}/);

        const remainder = final ? '' : parts.pop() ?? '';

        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed) {
            processEvent(trimmed);
          }
        }

        buffer = final ? '' : remainder;
      };

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        flushBuffer(done);

        if (done) {
          break;
        }
      }

      streamingIndexRef.current = null;
      setLoading(false);
    } catch (err) {
      console.error(err);
      streamingIndexRef.current = null;
      setLoading(false);
      setError(err.message || 'حدث خطأ غير متوقع');
      setMessages((prev) => {
        const updated = [...prev];
        const idx = updated.length - 1;
        if (idx >= 0 && updated[idx].role === 'assistant') {
          updated[idx] = {
            ...updated[idx],
            content: err.message || 'حدث خطأ أثناء توليد الرد',
          };
        }
        return updated;
      });
    }

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

          إرسال
        </button>
      </div>
      {loading && <div className="typing-indicator">المساعد يكتب…</div>}
      {error && <div className="error-message">{error}</div>}

    </div>
  );
}

export default Chat;
