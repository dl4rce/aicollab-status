import config from '../../config.yaml'

function formatDate(isoString) {
  const d = new Date(isoString)
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  })
}

function isActive(start, end) {
  const now = Date.now()
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  // Show banner if maintenance is upcoming (within 7 days) or currently in progress
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  return now < endMs && startMs - now < sevenDays
}

export default function MaintenanceBanner() {
  const m = config.maintenance
  if (!m || !m.enabled) return null

  if (!isActive(m.start, m.end)) return null

  const now = Date.now()
  const startMs = new Date(m.start).getTime()
  const endMs = new Date(m.end).getTime()
  const inProgress = now >= startMs && now < endMs

  return (
    <div
      className="mb-4 rounded-xl border px-5 py-4"
      style={{
        borderColor: inProgress ? '#b45309' : '#92400e',
        backgroundColor: inProgress ? 'rgba(120,53,15,0.25)' : 'rgba(78,35,10,0.20)',
      }}
    >
      {/* Title row */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-sm font-bold tracking-wide uppercase"
          style={{ color: inProgress ? '#fbbf24' : '#fcd34d' }}
        >
          {inProgress ? '⚙ Maintenance In Progress' : '🗓 ' + (m.title || 'Planned Maintenance')}
        </span>
        {inProgress && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#92400e', color: '#fef3c7' }}
          >
            ONGOING
          </span>
        )}
      </div>

      {/* Description */}
      {m.description && (
        <p className="text-sm mb-3" style={{ color: '#fde68a' }}>
          {m.description}
        </p>
      )}

      {/* Time window */}
      <div className="text-xs space-y-0.5" style={{ color: '#fcd34d' }}>
        <div>
          <span className="opacity-70">From: </span>
          <span className="font-medium">{formatDate(m.start)}</span>
        </div>
        <div>
          <span className="opacity-70">Until: </span>
          <span className="font-medium">{formatDate(m.end)}</span>
        </div>
      </div>

      {/* Affected services */}
      {m.affectedServices && m.affectedServices.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="text-xs opacity-60" style={{ color: '#fcd34d' }}>
            Affected:
          </span>
          {m.affectedServices.map((svc, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(146,64,14,0.5)', color: '#fef3c7' }}
            >
              {svc}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
