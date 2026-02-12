import config from '../../config.yaml'

const classes = {
  gray: 'bg-gray-700 text-gray-300',
  green: 'bg-green-900 text-green-400',
  yellow: 'bg-yellow-900 text-yellow-400',
}

export default function MonitorStatusLabel({ kvMonitor }) {
  let color = 'gray'
  let text = 'No data'

  if (typeof kvMonitor !== 'undefined') {
    if (kvMonitor.lastCheck.operational) {
      color = 'green'
      text = config.settings.monitorLabelOperational
    } else {
      color = 'yellow'
      text = config.settings.monitorLabelNotOperational
    }
  }

  return <div className={`pill leading-5 ${classes[color]}`}>{text}</div>
}
