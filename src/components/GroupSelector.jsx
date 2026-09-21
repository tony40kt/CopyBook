export default function GroupSelector({
  languageLabel,
  groups,
  isGroupUnlocked,
  getGroupLockReason,
  getUnlockRequirementsProgress,
  onBack,
  onPickGroup,
}) {
  return (
    <section className="selector-card">
      <h2>{languageLabel} 課程選擇</h2>

      <div className="group-list">
        {groups.map((g) => {
          const unlocked = isGroupUnlocked(g);
          const lockReason = unlocked ? "" : getGroupLockReason(g);
          const reqProgress = !unlocked ? getUnlockRequirementsProgress(g) : [];

          return (
            <button
              key={g.id}
              className={`group-item ${!unlocked ? "locked" : ""}`}
              onClick={() => unlocked && onPickGroup(g.id)}
              disabled={!unlocked}
              title={unlocked ? g.title : lockReason}
            >
              <strong>
                {g.title} {!unlocked && "🔒"}
              </strong>
              <span>{g.description}</span>
              <em>共 {g.items.length} 關</em>

              {!unlocked && <small>{lockReason}</small>}

              {!unlocked && reqProgress?.length > 0 && (
                <div className="unlock-progress-wrap">
                  {reqProgress.map((p) => (
                    <div key={p.id} className="unlock-progress-item">
                      <div className="unlock-progress-head">
                        <span>{p.title}</span>
                        <span>{p.done}/{p.total}（{p.percent}%）</span>
                      </div>
                      <div className="unlock-progress-bar">
                        <div
                          className="unlock-progress-fill"
                          style={{ width: `${p.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="selector-actions">
        <button className="secondary" onClick={onBack}>⬅️ 主目錄</button>
      </div>
    </section>
  );
}