import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Chat.css';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useTranslation } from '../i18n/LanguageProvider.jsx';
import ChatSidebar from '../components/ChatSidebar.jsx';
import ProfileTab from '../components/ProfileTab.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function Chat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useTranslation();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(chatId || null);
  const [error, setError] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');

  const [chatList, setChatList] = useState([]);
  const [chatListLoading, setChatListLoading] = useState(false);
  const [chatListError, setChatListError] = useState('');

  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ name: '', college: '', notes: '' });
  const [scheduleEntries, setScheduleEntries] = useState([createEmptyScheduleRow()]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [scheduleMessage, setScheduleMessage] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const endRef = useRef(null);
  const streamingIndexRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'chat') {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const loadChatList = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      return;
    }
    try {
      setChatListLoading(true);
      setChatListError('');
      const response = await fetch(`${API_URL}/chat`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(t('chatListError'));
      }

      const data = await response.json();
      setChatList(Array.isArray(data.chats) ? data.chats : []);
    } catch (err) {
      setChatListError(err.message || t('chatListError'));
    } finally {
      setChatListLoading(false);
    }
  }, [handleUnauthorized, t]);

  const fetchProfile = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      return;
    }

    try {
      setProfileLoading(true);
      setProfileError('');
      const response = await fetch(`${API_URL}/user/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(t('dashboardProfileError'));
      }

      const data = await response.json();
      setProfile(data);
      setLanguage(data.preferredLanguage === 'en' ? 'en' : 'ar');
      updateUserStorage({
        id: data.id,
        name: data.name,
        college: data.college,
        schedule: data.schedule,
        personalInfo: data.personalInfo,
        preferredLanguage: data.preferredLanguage,
      });

      setProfileForm({
        name: data.name || '',
        college: data.college || '',
        notes: (data.personalInfo && data.personalInfo.notes) || '',
      });
      setProfileMessage('');
      setScheduleMessage('');

      const normalizedSchedule = normalizeSchedule(data.schedule);
      setScheduleEntries(normalizedSchedule.length ? normalizedSchedule : [createEmptyScheduleRow()]);
    } catch (err) {
      setProfileError(err.message || t('dashboardProfileError'));
    } finally {
      setProfileLoading(false);
    }
  }, [handleUnauthorized, setLanguage, t]);

  useEffect(() => {
    loadChatList();
    fetchProfile();
  }, [loadChatList, fetchProfile]);

  const loadChat = useCallback(
    async (id) => {
      try {
        setHistoryLoading(true);
        setError(null);
        const response = await fetch(`${API_URL}/chat/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || t('chatError'));
        }

        const data = await response.json();
        const filtered = Array.isArray(data.messages)
          ? data.messages.filter((msg) => msg.role !== 'system')
          : [];
        setMessages(filtered);
      } catch (err) {
        setError(err.message || t('chatError'));
      } finally {
        setHistoryLoading(false);
      }
    },
    [handleUnauthorized, t]
  );

  useEffect(() => {
    setCurrentChatId(chatId || null);
    setAttachments([]);
    setError(null);
    if (chatId) {
      setActiveTab('chat');
      loadChat(chatId);
    } else {
      setMessages([]);
    }
  }, [chatId, loadChat]);

  const clearProfileFeedback = useCallback(() => {
    setProfileMessage('');
    setScheduleMessage('');
    setProfileError('');
  }, []);

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

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

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
      const response = await fetch(`${API_URL}/uploads/${attachment.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.status === 401) {
        handleUnauthorized();
      }
    } catch (err) {
      // Ignore deletion errors to avoid interrupting the flow.
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || isUploading) return;

    setActiveTab('chat');
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

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

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
          const nextId = payload.chatId.toString();
          setCurrentChatId(nextId);
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
        loadChatList();
      }
    }
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    clearProfileFeedback();
    setSavingProfile(true);
    try {
      const existingInfo = (profile && profile.personalInfo) || {};
      const personalInfo = { ...existingInfo };
      const notes = profileForm.notes.trim();
      if (notes) {
        personalInfo.notes = notes;
      } else {
        delete personalInfo.notes;
      }

      const response = await fetch(`${API_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: profileForm.name,
          college: profileForm.college,
          personalInfo,
        }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || t('dashboardProfileSaveError'));
      }

      const updated = await response.json();
      setProfile(updated);
      updateUserStorage({
        name: updated.name,
        college: updated.college,
        personalInfo: updated.personalInfo,
      });
      setProfileForm({
        name: updated.name || '',
        college: updated.college || '',
        notes: (updated.personalInfo && updated.personalInfo.notes) || '',
      });
      setProfileMessage(t('dashboardProfileSaved'));
    } catch (err) {
      setProfileError(err.message || t('dashboardProfileSaveError'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleScheduleChange = (index, field, value) => {
    setScheduleEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addScheduleRow = () => {
    setScheduleEntries((prev) => [...prev, createEmptyScheduleRow()]);
  };

  const removeScheduleRow = (index) => {
    setScheduleEntries((prev) => {
      if (prev.length === 1) {
        return [createEmptyScheduleRow()];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleSaveSchedule = async () => {
    clearProfileFeedback();
    setSavingSchedule(true);
    try {
      const cleaned = scheduleEntries
        .map((entry) => ({
          day: entry.day.trim(),
          time: entry.time.trim(),
          course: entry.course.trim(),
        }))
        .filter((entry) => entry.day || entry.time || entry.course);

      const response = await fetch(`${API_URL}/user/schedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ schedule: cleaned }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || t('dashboardScheduleSaveError'));
      }

      const updated = await response.json();
      setProfile(updated);
      updateUserStorage({ schedule: updated.schedule });
      const normalized = normalizeSchedule(updated.schedule);
      setScheduleEntries(normalized.length ? normalized : [createEmptyScheduleRow()]);
      setScheduleMessage(t('dashboardScheduleSaved'));
    } catch (err) {
      setProfileError(err.message || t('dashboardScheduleSaveError'));
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleLanguageChange = async (nextLanguage) => {
    clearProfileFeedback();
    try {
      const response = await fetch(`${API_URL}/user/language`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ language: nextLanguage }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || t('chatLanguageUpdateError'));
      }

      const updated = await response.json();
      updateUserStorage({ preferredLanguage: updated.preferredLanguage });
      setProfile((prev) => (prev ? { ...prev, preferredLanguage: updated.preferredLanguage } : prev));
      setProfileMessage(t('languageUpdated'));
    } catch (err) {
      setProfileError(err.message || t('chatLanguageUpdateError'));
    }
  };

  const handleStartNewChat = useCallback(() => {
    setMessages([]);
    setAttachments([]);
    setCurrentChatId(null);
    setError(null);
    setHistoryLoading(false);
    setActiveTab('chat');
    navigate('/chat');
  }, [navigate]);

  const handleSelectChat = useCallback(
    (id) => {
      if (loading) {
        return;
      }
      setActiveTab('chat');
      if (String(currentChatId) !== String(id)) {
        navigate(`/chat/${id}`);
      }
    },
    [currentChatId, loading, navigate]
  );

  const handleDeleteChat = useCallback(
    async (id) => {
      if (!window.confirm(t('chatDeleteConfirm'))) {
        return;
      }

      try {
        setChatListError('');
        const response = await fetch(`${API_URL}/chat/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (response.status === 404) {
          await loadChatList();
          return;
        }

        if (!response.ok) {
          throw new Error(t('chatDeleteError'));
        }

        if (String(currentChatId) === String(id)) {
          setMessages([]);
          setCurrentChatId(null);
          setError(null);
          setHistoryLoading(false);
          setAttachments([]);
          setActiveTab('chat');
          navigate('/chat', { replace: true });
        }

        await loadChatList();
      } catch (err) {
        setChatListError(err.message || t('chatDeleteError'));
      }
    },
    [currentChatId, handleUnauthorized, loadChatList, navigate, t]
  );

  return (
    <div className="chat-layout" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <ChatSidebar
        chats={chatList}
        loading={chatListLoading}
        error={chatListError}
        onSelectChat={handleSelectChat}
        onNewChat={handleStartNewChat}
        onDeleteChat={handleDeleteChat}
        activeChatId={currentChatId}
        t={t}
        language={language}
      />
      <main className="chat-main">
        <div className="chat-header">
          <div className="chat-tabs">
            <button
              type="button"
              className={activeTab === 'chat' ? 'active' : ''}
              onClick={() => setActiveTab('chat')}
            >
              {t('chatTabChat')}
            </button>
            <button
              type="button"
              className={activeTab === 'profile' ? 'active' : ''}
              onClick={() => setActiveTab('profile')}
            >
              {t('chatTabProfile')}
            </button>
          </div>
          <LanguageToggle onLanguageChange={handleLanguageChange} />
        </div>
        {activeTab === 'chat' ? (
          <div className="chat-panel">
            <div className="messages">
              {historyLoading && <div className="loading-message">{t('chatHistoryLoading')}</div>}
              {!historyLoading && messages.length === 0 && (
                <div className="empty-message">{t('chatNoMessages')}</div>
              )}
              {messages.map((msg, index) => (
                <div key={index} className={`bubble ${msg.role}`}>
                  <span className="bubble-role">
                    {msg.role === 'assistant' ? t('chatRoleAssistant') : t('chatRoleUser')}
                  </span>
                  <div className="bubble-content">{msg.content}</div>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="bubble-attachments">
                      <strong>{t('chatMessageAttachments')}</strong>
                      <ul>
                        {msg.attachments.map((attachment, idx) => (
                          <li key={idx}>{attachment.fileName || attachment.fileType}</li>
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isUploading) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
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
        ) : (
          <ProfileTab
            t={t}
            profileForm={profileForm}
            onProfileChange={handleProfileChange}
            onProfileSave={handleSaveProfile}
            savingProfile={savingProfile}
            profileMessage={profileMessage}
            profileError={profileError}
            profileLoading={profileLoading}
            scheduleEntries={scheduleEntries}
            onScheduleChange={handleScheduleChange}
            onAddScheduleRow={addScheduleRow}
            onRemoveScheduleRow={removeScheduleRow}
            onSaveSchedule={handleSaveSchedule}
            savingSchedule={savingSchedule}
            scheduleMessage={scheduleMessage}
          />
        )}
      </main>
    </div>
  );
}

export default Chat;

function updateUserStorage(patch) {
  try {
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...stored, ...patch }));
  } catch (error) {
    // Ignore storage errors.
  }
}

function normalizeSchedule(schedule) {
  if (!Array.isArray(schedule)) {
    return [];
  }

  return schedule
    .map((entry) => ({
      day: typeof entry.day === 'string' ? entry.day : '',
      time: typeof entry.time === 'string' ? entry.time : '',
      course: typeof entry.course === 'string' ? entry.course : '',
    }))
    .filter((entry) => entry.day || entry.time || entry.course);
}

function createEmptyScheduleRow() {
  return { day: '', time: '', course: '' };
}
