import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Chat.css';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function Chat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(chatId || null);
  const [error, setError] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const endRef = useRef(null);
  const streamingIndexRef = useRef(null);
  const fileInputRef = useRef(null);
  const { t, language } = useTranslation();


  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    setCurrentChatId(chatId || null);
    setAttachments([]);
    if (chatId) {
      loadChat(chatId);
    } else {
      setMessages([]);
    }
  }, [chatId]);

  useEffect(() => {

    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading || isUploading) return;

    const messageToSend = input.trim();
    const attachmentsToSend = attachments.map((attachment) => ({ ...attachment }));
    setInput('');
    setLoading(true);
    setError(null);

    setMessages((prev) => {
      const updated = [
        ...prev,
        { role: 'user', content: messageToSend, attachments: attachmentsToSend },
        { role: 'assistant', content: '' },
      ];
      streamingIndexRef.current = updated.length - 1;
      return updated;
    });

    const url = currentChatId ? `${API_URL}/chat/${currentChatId}` : `${API_URL}/chat`;

    let sendSucceeded = false;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          message: messageToSend,
          attachments: attachmentsToSend.map((attachment) => ({
            id: attachment.id,
            fileName: attachment.fileName,
            fileType: attachment.fileType,
            path: attachment.path,
            extractedText: attachment.extractedText,
          })),
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.message || t('chatError'));
      }

      if (!response.body) {
        throw new Error(t('chatError'));
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

        const payloadText = dataLines.join('\n').trim();

        if (payloadText === '[DONE]') {
          streamingIndexRef.current = null;
          setLoading(false);
          return;
        }

        let payload;
        try {
          if (!payloadText || !/^[\[{]/.test(payloadText)) {
            console.warn('Ignoring non-JSON SSE payload:', payloadText);
            return;
          }

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
          sendSucceeded = true;
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
      setError(err.message || t('chatError'));
      setMessages((prev) => {
        const updated = [...prev];
        const idx = updated.length - 1;
        if (idx >= 0 && updated[idx].role === 'assistant') {
          updated[idx] = {
            ...updated[idx],
            content: err.message || t('chatError'),
          };
        }
        return updated;
      });
    } finally {
      if (sendSucceeded) {
        setAttachments([]);
      }
    }
  };

  const loadChat = async (id) => {
    try {
      setHistoryLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/chat/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || t('chatError'));
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.message || t('chatError'));
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAttachmentClick = () => {
    if (attachments.length >= 5 || loading || isUploading) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (attachments.length >= 5) {
      setError(t('chatAttachmentLimit'));
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_URL}/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || t('chatAttachmentUploadError'));
      }

      const data = await response.json();
      setAttachments((prev) => [
        ...prev,
        {
          id: data.id,
          fileName: data.fileName,
          fileType: data.fileType,
          path: data.path,
          extractedText: data.extractedText,
        },
      ]);
    } catch (err) {
      setError(err.message || t('chatAttachmentUploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = async (index) => {
    const [attachment] = attachments.slice(index, index + 1);
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
    if (!attachment?.id) {
      return;
    }
    try {
      await fetch(`${API_URL}/uploads/${attachment.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
    } catch (error) {
      // Ignore deletion errors to avoid interrupting the flow.
    }
  };

  const handleLanguageChange = async (nextLanguage) => {
    setError(null);
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
        throw new Error(payload.message || t('chatLanguageUpdateError'));
      }

      const updated = await response.json();
      syncUserPreference({ preferredLanguage: updated.preferredLanguage });
    } catch (err) {
      setError(err.message || t('chatLanguageUpdateError'));
    }
  };

  return (
    <div className="chat-page" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header>
        <button onClick={() => navigate('/dashboard')} className="secondary-btn">
          {t('back')}
        </button>
        <h2>{t('chatHeading')}</h2>
        <LanguageToggle onLanguageChange={handleLanguageChange} />
      </header>
      <div className="messages">
        {historyLoading && <div className="loading-message">{t('chatHistoryLoading')}</div>}
        {!historyLoading && messages.length === 0 && (
          <div className="empty-message">{t('chatNoMessages')}</div>
        )}
        {messages.map((msg, index) => (
          <div key={index} className={`bubble ${msg.role}`}>
            <div>{msg.content}</div>
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="bubble-attachments">
                <strong>{t('chatMessageAttachments')}</strong>
                <ul>
                  {msg.attachments.map((attachment, idx) => (
                    <li key={idx}>
                      {attachment.fileName || attachment.fileType}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="composer">
        <div className="attachment-controls">
          <button
            type="button"
            className="secondary-btn"
            onClick={handleAttachmentClick}
            disabled={loading || isUploading || attachments.length >= 5}
          >
            {isUploading ? t('chatUploading') : t('chatAddAttachment')}
          </button>
          <span className="attachment-hint">{t('chatAttachmentLimit')}</span>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden-input"
            onChange={handleFileChange}
            accept=".pdf,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
          />
        </div>
        {attachments.length > 0 && (
          <div className="attachment-preview">
            <h4>{t('chatAttachmentsTitle')}</h4>
            <ul>
              {attachments.map((attachment, index) => (
                <li key={`${attachment.id}-${index}`}>
                  <span>{attachment.fileName || attachment.fileType}</span>
                  <button type="button" onClick={() => removeAttachment(index)}>
                    {t('chatRemoveAttachment')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="composer-inputs">
          <input
            placeholder={t('chatPlaceholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isUploading && sendMessage()}
            disabled={loading || isUploading}
          />
          <button onClick={sendMessage} disabled={loading || isUploading}>
            {t('send')}
          </button>
        </div>
      </div>
      {loading && <div className="typing-indicator">{t('chatTyping')}</div>}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default Chat;

function syncUserPreference(patch) {
  try {
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...stored, ...patch }));
  } catch (error) {
    // Ignore storage errors.
  }
}
