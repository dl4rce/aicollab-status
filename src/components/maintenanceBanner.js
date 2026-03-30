import config from '../../config.yaml'

function formatLocal(isoString, timeZone) {
  const d = new Date(isoString)
  return d.toLocaleString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timeZone || 'Europe/Berlin',
    timeZoneName: 'short',
  })
}

/** Show banner from N days before start until end has passed. */
function shouldShowBanner(now, startMs, endMs, announceDaysBefore) {
  const windowMs = announceDaysBefore * 24 * 60 * 60 * 1000
  return now < endMs && now > startMs - windowMs
}

export default function MaintenanceBanner() {
  const m = config.maintenance
  if (!m || !m.enabled) return null

  const tz = m.displayTimeZone || 'Europe/Berlin'
  const announceDays = m.announceDaysBefore ?? 21

  const now = Date.now()
  const startMs = new Date(m.start).getTime()
  const endMs = new Date(m.end).getTime()

  if (!shouldShowBanner(now, startMs, endMs, announceDays)) return null

  const active = now >= startMs && now < endMs
  const mode = active ? 'ACTIVE' : 'PLANNED'

  return (
    <section
      className="mb-5 rounded-xl border-2 px-5 py-4"
      style={{
        borderColor: active ? '#ea580c' : '#ca8a04',
        backgroundColor: active ? 'rgba(154,52,18,0.22)' : 'rgba(113,63,18,0.20)',
      }}
      aria-label="Maintenance notice"
    >
      {/* Top row: section label + state */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span
          className="text-xs font-bold tracking-[0.2em] uppercase text-amber-100/90"
        >
          Maintenance
        </span>
        <span
          className="text-xs font-extrabold px-2.5 py-1 rounded-md tracking-wide"
          style={{
            backgroundColor: active ? '#c2410c' : '#a16207',
            color: '#fffbeb',
            boxShadow: active ? '0 0 0 1px rgba(253,186,116,0.35)' : 'none',
          }}
        >
          {mode}
        </span>
      </div>

      <h2
        className="text-base font-semibold mb-1.5"
        style={{ color: '#fef3c7' }}
      >
        {m.title || 'Scheduled maintenance'}
      </h2>

      {m.description && (
        <p className="text-sm mb-3 leading-relaxed" style={{ color: '#fde68a' }}>
          {m.description}
        </p>
      )}

      <div className="text-sm space-y-1" style={{ color: '#fcd34d' }}>
        <div>
          <span className="opacity-75">Start: </span>
          <span className="font-semibold">{formatLocal(m.start, tz)}</span>
        </div>
        <div>
          <span className="opacity-75">End: </span>
          <span className="font-semibold">{formatLocal(m.end, tz)}</span>
        </div>
        <p className="text-xs opacity-60 pt-1" style={{ color: '#fcd34d' }}>
          Local times ({tz}; Apr = MESZ / CEST, UTC+2)
        </p>
      </div>

      {m.affectedServices && m.affectedServices.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 items-center">
          <span className="text-xs opacity-70" style={{ color: '#fcd34d' }}>
            Affected:
          </span>
          {m.affectedServices.map((svc, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: 'rgba(146,64,14,0.55)',
                color: '#fef3c7',
              }}
            >
              {svc}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
