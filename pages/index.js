import { Store } from 'laco'
import { useStore } from 'laco-react'
import Head from 'flareact/head'

import { getKVMonitors, useKeyPress } from '../src/functions/helpers'
import config from '../config.yaml'
import MonitorCard from '../src/components/monitorCard'
import MonitorFilter from '../src/components/monitorFilter'
import MonitorStatusHeader from '../src/components/monitorStatusHeader'

const MonitorStore = new Store({
  monitors: config.monitors,
  visible: config.monitors,
  activeFilter: false,
})

const filterByTerm = (term) =>
  MonitorStore.set((state) => ({
    visible: state.monitors.filter((monitor) =>
      monitor.name.toLowerCase().includes(term),
    ),
  }))

export async function getEdgeProps() {
  const kvMonitors = await getKVMonitors()

  return {
    props: {
      config,
      kvMonitors: kvMonitors ? kvMonitors.monitors : {},
      kvMonitorsLastUpdate: kvMonitors ? kvMonitors.lastUpdate : {},
    },
    revalidate: 5,
  }
}

export default function Index({ config, kvMonitors, kvMonitorsLastUpdate }) {
  const state = useStore(MonitorStore)
  const slash = useKeyPress('/')

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>{config.settings.title}</title>
        <link rel="stylesheet" href="./style.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script>
          {`document.documentElement.classList.add("dark")`}
        </script>
      </Head>
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex flex-row justify-between items-center py-6 px-2">
          <a href="https://aicollab.app" className="flex flex-row items-center no-underline hover:opacity-80 transition-opacity">
            <img className="h-8 w-auto" src={config.settings.logo} />
            <h1 className="ml-3 text-2xl font-bold">
              <span style={{
                background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>AI·Collab</span>
              <span className="text-gray-300 font-medium ml-2">Status</span>
            </h1>
          </a>
          <div className="flex flex-row items-center">
            <MonitorFilter active={slash} callback={filterByTerm} />
          </div>
        </div>

        {/* Status Header */}
        <MonitorStatusHeader kvMonitorsLastUpdate={kvMonitorsLastUpdate} />

        {/* Monitor Cards */}
        {state.visible.map((monitor, key) => {
          return (
            <MonitorCard
              key={key}
              monitor={monitor}
              data={kvMonitors[monitor.id]}
            />
          )
        })}

        {/* External Services */}
        <div className="mt-6 p-4 rounded-xl border border-gray-700 bg-gray-800 bg-opacity-50">
          <div className="text-sm font-semibold mb-2 text-gray-300">External Service Status</div>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-gray-500">Payments (Freemius): </span>
              <a href="https://status.freemius.com/" target="_blank" rel="noopener" className="text-purple-400 hover:text-purple-300 hover:underline">
                status.freemius.com
              </a>
            </div>
            <div>
              <span className="text-gray-500">Payments (Stripe): </span>
              <a href="https://status.stripe.com/" target="_blank" rel="noopener" className="text-purple-400 hover:text-purple-300 hover:underline">
                status.stripe.com
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-row justify-between mt-6 mb-8 text-xs text-gray-500">
          <div>
            Powered by{' '}
            <a href="https://workers.cloudflare.com/" target="_blank" className="text-gray-400 hover:text-purple-400">
              Cloudflare Workers
            </a>
          </div>
          <div>
            <a href="https://aicollab.app" target="_blank" className="text-gray-400 hover:text-purple-400">
              aicollab.app
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
