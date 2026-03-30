import React from 'react'
import config from '../../config.yaml'
import MonitorDayAverage from './monitorDayAverage'

/** YYYY-MM-DD in UTC — must match cronTrigger.getDate() (Worker uses toISOString). */
function utcDayString(d) {
  return d.toISOString().split('T')[0]
}

/**
 * Same window as the original: (todayUTC − daysCount) exclusive lower bound after +1 per step,
 * ending at today UTC — daysCount bars from (today − 89d) through today when daysCount === 90.
 */
function getHistogramUtcDayStrings(daysCount) {
  const out = []
  const now = new Date()
  const y = now.getUTCFullYear()
  const mo = now.getUTCMonth()
  const day = now.getUTCDate()
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(Date.UTC(y, mo, day - daysCount + i + 1))
    out.push(utcDayString(d))
  }
  return out
}

export default function MonitorHistogram({ monitorId, kvMonitor }) {
  const daysCount = config.settings.daysInHistogram
  const dayStrings = getHistogramUtcDayStrings(daysCount)
  const checks = kvMonitor && kvMonitor.checks ? kvMonitor.checks : {}

  const content = dayStrings.map((dayInHistogram, idx) => {
    let bg = ''
    let dayInHistogramLabel = config.settings.dayInHistogramNoData

    if (kvMonitor && kvMonitor.firstCheck <= dayInHistogram) {
      if (
        Object.prototype.hasOwnProperty.call(checks, dayInHistogram) &&
        checks[dayInHistogram].fails > 0
      ) {
        bg = 'yellow'
        dayInHistogramLabel = `${checks[dayInHistogram].fails} ${config.settings.dayInHistogramNotOperational}`
      } else {
        bg = 'green'
        dayInHistogramLabel = config.settings.dayInHistogramOperational
      }
    }

    const dayRes =
      checks[dayInHistogram] && checks[dayInHistogram].res
        ? checks[dayInHistogram].res
        : {}

    return (
      <div key={idx} className="hitbox tooltip">
        <div className={`${bg} bar`} />
        <div className="content text-center py-1 px-2 text-xs">
          {dayInHistogram}
          <br />
          <span className="font-semibold text-sm">{dayInHistogramLabel}</span>
          {Object.keys(dayRes).map((locKey) => (
            <MonitorDayAverage
              key={locKey}
              location={locKey}
              avg={dayRes[locKey].a}
            />
          ))}
        </div>
      </div>
    )
  })

  return (
    <div
      key={`${monitorId}-histogram`}
      className="flex flex-row items-center histogram"
    >
      {content}
    </div>
  )
}
