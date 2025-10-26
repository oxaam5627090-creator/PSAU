function ProfileTab({
  t,
  profileForm,
  onProfileChange,
  onProfileSave,
  savingProfile,
  profileMessage,
  profileError,
  profileLoading,
  scheduleEntries,
  onScheduleChange,
  onAddScheduleRow,
  onRemoveScheduleRow,
  onSaveSchedule,
  savingSchedule,
  scheduleMessage,
}) {
  return (
    <div className="profile-tab">
      {profileLoading ? (
        <div className="profile-state">{t('chatProfileLoading')}</div>
      ) : (
        <>
          {profileError && <div className="profile-alert error">{profileError}</div>}
          {profileMessage && <div className="profile-alert success">{profileMessage}</div>}
          {scheduleMessage && <div className="profile-alert success">{scheduleMessage}</div>}

          <section className="profile-card">
            <h3>{t('dashboardProfileTitle')}</h3>
            <div className="profile-fields">
              <label className="profile-field">
                <span>{t('dashboardProfileName')}</span>
                <input
                  name="name"
                  value={profileForm.name}
                  onChange={onProfileChange}
                  placeholder={t('dashboardProfileName')}
                />
              </label>
              <label className="profile-field">
                <span>{t('dashboardProfileCollege')}</span>
                <input
                  name="college"
                  value={profileForm.college}
                  onChange={onProfileChange}
                  placeholder={t('dashboardProfileCollege')}
                />
              </label>
              <label className="profile-field">
                <span>{t('dashboardProfileNotes')}</span>
                <textarea
                  name="notes"
                  value={profileForm.notes}
                  onChange={onProfileChange}
                  placeholder={t('dashboardProfileNotes')}
                  rows={4}
                />
              </label>
            </div>
            <div className="profile-actions">
              <button type="button" className="chat-primary-btn" onClick={onProfileSave} disabled={savingProfile}>
                {savingProfile ? t('saving') : t('dashboardProfileSave')}
              </button>
            </div>
          </section>

          <section className="profile-card">
            <h3>{t('dashboardScheduleTitle')}</h3>
            <div className="schedule-rows">
              {scheduleEntries.map((entry, index) => (
                <div key={`${index}-${entry.day}-${entry.time}`} className="schedule-row">
                  <input
                    value={entry.day}
                    onChange={(event) => onScheduleChange(index, 'day', event.target.value)}
                    placeholder={t('scheduleDayPlaceholder')}
                  />
                  <input
                    value={entry.time}
                    onChange={(event) => onScheduleChange(index, 'time', event.target.value)}
                    placeholder={t('scheduleTimePlaceholder')}
                  />
                  <input
                    value={entry.course}
                    onChange={(event) => onScheduleChange(index, 'course', event.target.value)}
                    placeholder={t('scheduleCoursePlaceholder')}
                  />
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => onRemoveScheduleRow(index)}
                    disabled={scheduleEntries.length === 1}
                  >
                    {t('dashboardScheduleRemoveRow')}
                  </button>
                </div>
              ))}
            </div>
            <div className="profile-actions">
              <button type="button" className="secondary-btn" onClick={onAddScheduleRow}>
                {t('dashboardScheduleAddRow')}
              </button>
              <button type="button" className="chat-primary-btn" onClick={onSaveSchedule} disabled={savingSchedule}>
                {savingSchedule ? t('saving') : t('dashboardScheduleSave')}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default ProfileTab;
