export default function GroupSelector({
  languageLabel,
  groups,
  isGroupUnlocked,
  getGroupLockReason,
  getUnlockRequirementsProgress,
  onBack,
  onPickGroup,
  onRequestPurchase,
}) {
  return (
    <section className="selector-card">
      <h2>{languageLabel} 課程選擇</h2>

      <div className="group-list">
        {groups.map((group) => {
          const unlocked = isGroupUnlocked(group);
          const lockReason = unlocked
            ? ""
            : getGroupLockReason(group);

          const reqProgress = !unlocked
            ? getUnlockRequirementsProgress(group)
            : [];

          return (
            <div
              key={group.id}
              className={`group-item ${
                !unlocked ? "locked" : ""
              }`}
            >
              <button
                type="button"
                className="group-main-button"
                onClick={() => {
                  if (unlocked) {
                    onPickGroup(group.id);
                  }
                }}
                title={unlocked ? group.title : lockReason}
              >
                <strong>
                  {group.title} {!unlocked && "🔒"}
                </strong>

                <span>{group.description}</span>

                <em>
                  建議模式：
                  {group.recommendedMode === "doodle"
                    ? "塗鴉"
                    : "寫字"}
                </em>

                <em>共 {group.items.length} 關</em>
              </button>

              {!unlocked && (
                <div className="group-lock-panel">
                  <small>{lockReason}</small>

                  {reqProgress.length > 0 && (
                    <div className="unlock-progress-wrap">
                      {reqProgress.map((progress) => (
                        <div
                          key={progress.id}
                          className="unlock-progress-item"
                        >
                          <div className="unlock-progress-head">
                            <span>{progress.title}</span>
                            <span>
                              {progress.done}/{progress.total}
                              （{progress.percent}%）
                            </span>
                          </div>

                          <div className="unlock-progress-bar">
                            <div
                              className="unlock-progress-fill"
                              style={{
                                width: `${progress.percent}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="group-purchase-actions">
                    <button
                      type="button"
                      className="accent"
                      onClick={() =>
                        onRequestPurchase?.(
                          `copybook_course_${group.id}`
                        )
                      }
                    >
                      💳 付費解鎖本課程
                    </button>

                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="selector-actions">
        <button
          type="button"
          className="secondary"
          onClick={onBack}
        >
          ⬅️ 主目錄
        </button>
      </div>
    </section>
  );
}