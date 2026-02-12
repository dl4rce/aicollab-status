import config from '../../config.yaml'
import { locations } from '../functions/locations'

const classes = {
  green: 'status-operational',
  yellow: 'status-degraded',
}

export default function MonitorStatusHeader({ kvMonitorsLastUpdate }) {
  let color = 'green'
  let text = config.settings.allmonitorsOperational

  if (!kvMonitorsLastUpdate.allOperational) {
    color = 'yellow'
    text = config.settings.notAllmonitorsOperational
  }

  return (
    <div className={`card mb-4 font-semibold rounded-xl ${classes[color]}`}>
      <div className="flex flex-row justify-between items-center">
        <div>{text}</div>
        {kvMonitorsLastUpdate.time && typeof window !== 'undefined' && (
          <div className="text-xs font-light opacity-70">
            checked{' '}
            {Math.round((Date.now() - kvMonitorsLastUpdate.time) / 1000)} sec
            ago (from{' '}
            {locations[kvMonitorsLastUpdate.loc] || kvMonitorsLastUpdate.loc})
          </div>
        )}
      </div>
    </div>
  )
}
