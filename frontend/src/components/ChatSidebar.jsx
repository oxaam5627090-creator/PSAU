function ChatSidebar({
  chats,
  loading,
  error,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  activeChatId,
  t,
  language,
}) {
  return (
    <aside className="chat-sidebar">
      <div className="sidebar-header">
        <h1>{t('chatHeading')}</h1>
        <button type="button" className="chat-primary-btn" onClick={onNewChat}>
          {t('chatNewChat')}
        </button>
      </div>
      <div className="sidebar-body">
        {loading ? (
          <div className="sidebar-state">{t('chatListLoading')}</div>
        ) : error ? (
          <div className="sidebar-error">{error}</div>
        ) : chats.length === 0 ? (
          <div className="sidebar-state">{t('chatListEmpty')}</div>
        ) : (
          <ul className="chat-list">
            {chats.map((chat) => {
              const isActive = String(activeChatId || '') === String(chat.id);
              const handleSelect = () => onSelectChat?.(chat.id);
              const handleDelete = (event) => {
                event.stopPropagation();
                onDeleteChat?.(chat.id);
              };
              return (
                <li key={chat.id} className={`chat-list-item${isActive ? ' active' : ''}`}>
                  <button type="button" className="chat-list-button" onClick={handleSelect}>
                    <span className="chat-list-title">{chat.title || t('chatUntitled')}</span>
                    {chat.preview && <span className="chat-list-preview">{chat.preview}</span>}
                    {chat.createdAt && (
                      <span className="chat-list-meta">{formatListDate(chat.createdAt, language)}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="chat-list-delete"
                    onClick={handleDelete}
                    aria-label={t('chatDeleteChat')}
                    title={t('chatDeleteChat')}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

export default ChatSidebar;

function formatListDate(value, language) {
  if (!value) {
    return '';
  }
  try {
    const locale = language === 'en' ? 'en-US' : 'ar-SA';
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (error) {
    return '';
  }
}
