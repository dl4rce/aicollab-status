# Cloudflare Worker - Status Page

Monitor your websites, showcase status including daily history, and get Slack notification whenever your website status changes. Using **Cloudflare Workers**, **CRON Triggers,** and **KV storage**. Check [my status page](https://status-page.eidam.dev) out! 🚀

![Status Page](.gitbook/assets/status_page_screenshot.png)

![Slack notifications](.gitbook/assets/slack_screenshot.png)

## Pre-requisites

You'll need a [Cloudflare Workers account](https://dash.cloudflare.com/sign-up/workers) with

- A workers domain set up
- The Workers Bundled subscription \($5/mo\)
  - [It works with Workers Free!](https://blog.cloudflare.com/workers-kv-free-tier/) Check [more info](#workers-kv-free-tier) on how to run on Workers Free.
- Some websites/APIs to watch 🙂

Also, prepare the following secrets

- Cloudflare API token with `Edit Cloudflare Workers` permissions
- Slack incoming webhook \(optional\)
- Discord incoming webhook \(optional\)

## Getting started

### Maintained security build tooling (Node 20 / 22)

The project-local MIT `vendor/flareact` package preserves Flareact 0.10.1's
page, routing, SSR, props, asset and Worker APIs. Upstream source/license and
maintenance rationale are recorded in `vendor/flareact/PROVENANCE.json`.
Its obsolete build dependency graph was replaced, not hidden: Webpack 5,
CLI 6, MiniCssExtract 2, CSS minimizer 7, Terser 5, copy plugin 12, modern
loaders, dev-server 5.2.6 and middleware 7.4.6 are declared at the root.
Webpack 4's node-libs-browser/crypto-browserify/elliptic ancestry is absent.
SockJS's UUID resolution uses the supported CommonJS v4 export from patched
uuid 11.1.1; actual dev-server/API tests cover it. React/page components are
unchanged. The remaining legacy laco-react peer warning is not a security fix.

Use Node >=22.23.4 <23 and Yarn 1.22.22. CI reads the exact patched version
from `.node-version` (22.23.4), also a supported Cloudflare Pages build selector.
This supersedes the historical Node 20 compatibility notes below: Node 20 is
EOL and must not be used. The [official October 2026 Node security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
fixes CVE-2026-111497 in Node 22.23.4. This selects the Node build/development
runtime, not Cloudflare's managed Worker runtime; it does not establish a
production deployment or change remote settings.

Run the clean build and isolated regressions:

```bash
yarn install --frozen-lockfile --non-interactive
yarn build
node scripts/test-security-patches.cjs
node scripts/test-css-security.cjs
node scripts/test-modern-build.cjs
node scripts/test-dev-security.cjs
```

CI now builds the actual client and Worker with `config.example.yaml` and runs
all regressions with external networking blocked (loopback fixtures permitted).
Tests exercise existing HTTP/parser behavior, SVG/CSS minification, route assets,
actual Worker SSR and props, default minifier/filesystem cache corruption recovery,
and real patched dev-server traversal/CSRF/malformed Host protection.
`yarn dev` serves client assets on loopback port 8080 and proxies application
requests to an independently started local Worker on 8787; it does not start or
deploy a Worker. HMR reload is retained without the obsolete React-refresh plugin.

Future tooling updates must keep the root dependency graph and vendored config
APIs coordinated. Run a clean frozen install and all tests; do not restore old
Webpack4 pins or force crypto stubs. No deployment or database operation is part
of the build/security workflow.

### Configure this checkout

This repository **does not commit** real `config.yaml` or `wrangler.toml` (template / public-safe). After clone:

```bash
cp config.example.yaml config.yaml
cp wrangler.example.toml wrangler.toml
# Edit both files: set your URLs, Worker name, and KV namespace id.
```

Then `yarn install`, `yarn build`, `npx wrangler deploy` with Wrangler logged in.  
The bundled `config.example.yaml` uses neutral placeholders (`example.com`, fake maintenance window).

---

You can either deploy with **Cloudflare Deploy Button** using GitHub Actions or deploy on your own.

### Deploy with Cloudflare Deploy Button

[![Deploy to Cloudflare Workers](https://camo.githubusercontent.com/1f3d0b4d44a2c3f12c78bd02bae907169430e04d728006db9f97a4befa64c886/68747470733a2f2f6465706c6f792e776f726b6572732e636c6f7564666c6172652e636f6d2f627574746f6e3f706169643d74727565)](https://deploy.workers.cloudflare.com/?url=https://github.com/eidam/cf-workers-status-page)

1. Click the button and follow the instructions, you should end up with a clone of this repository
2. Navigate to your new **GitHub repository &gt; Settings &gt; Secrets** and add the following secrets:

   ```yaml
   - Name: CF_API_TOKEN (should be added automatically)

   - Name: CF_ACCOUNT_ID (should be added automatically)

   - Name: SECRET_SLACK_WEBHOOK_URL (optional)
   - Value: your-slack-webhook-url

   - Name: SECRET_DISCORD_WEBHOOK_URL (optional)
   - Value: your-discord-webhook-url
   ```

3. Navigate to the **Actions** settings in your repository and enable them
4. Edit [config.yaml](./config.yaml) to adjust configuration and list all of your websites/APIs you want to monitor

   ```yaml
   settings:
     title: 'Status Page'
     url: 'https://status-page.eidam.dev' # used for Slack & Discord messages
     logo: logo-192x192.png # image in ./public/ folder
     daysInHistogram: 90 # number of days you want to display in histogram
     collectResponseTimes: false # experimental feature, enable only for <5 monitors or on paid plans

     # configurable texts across the status page
     allmonitorsOperational: 'All Systems Operational'
     notAllmonitorsOperational: 'Not All Systems Operational'
     monitorLabelOperational: 'Operational'
     monitorLabelNotOperational: 'Not Operational'
     monitorLabelNoData: 'No data'
     dayInHistogramNoData: 'No data'
     dayInHistogramOperational: 'All good'
     dayInHistogramNotOperational: 'Some checks failed'

   # list of monitors
   monitors:
     - id: workers-cloudflare-com # unique identifier
       name: workers.cloudflare.com
       description: 'You write code. They handle the rest.' # default=empty
       url: 'https://workers.cloudflare.com/' # URL to fetch
       method: GET # default=GET
       expectStatus: 200 # operational status, default=200
       followRedirect: false # should fetch follow redirects, default=false
       linkable: false # should the titles be links to the service, default=true
   ```

5. Push to `main` branch to trigger the deployment
6. 🎉
7. _\(optional\)_ Go to [Cloudflare Workers settings](https://dash.cloudflare.com/?to=/workers) and assign custom domain/route
   - e.g. `status-page.eidam.dev/*` _\(make sure you include `/*` as the Worker also serve static files\)_
8. _\(optional\)_ Edit [wrangler.toml](./wrangler.toml) to adjust Worker settings or CRON Trigger schedule, especially if you are on [Workers Free plan](#workers-kv-free-tier)

### Telegram notifications

To enable telegram notifications, you'll need to take a few additional steps.

1. [Create a new Bot](https://core.telegram.org/bots#creating-a-new-bot)
2. Set the api token you received when creating the bot as content of the `SECRET_TELEGRAM_API_TOKEN` secret in your github repository.
3. Send a message to the bot from the telegram account which should receive the alerts (Something more than `/start`)
4. Get the chat id with `curl https://api.telegram.org/bot<YOUR TELEGRAM API TOKEN>/getUpdates | jq '.result[0] .message .chat .id'`
5. Set the retrieved chat id in the `SECRET_TELEGRAM_CHAT_ID` secret variable
6. Redeploy the status page using the github action

### Deploy on your own

You can clone the repository yourself and use Wrangler CLI to develop/deploy, extra list of things you need to take care of:

- create KV namespace and add the `KV_STATUS_PAGE` binding to [wrangler.toml](./wrangler.toml)
- create Worker secrets _\(optional\)_
  - `SECRET_SLACK_WEBHOOK_URL`
  - `SECRET_DISCORD_WEBHOOK_URL`

## Workers KV free tier

The Workers Free plan includes limited KV usage, but the quota is sufficient for 2-minute checks only

- Change the CRON trigger to 2 minutes interval (`crons = ["*/2 * * * *"]`) in [wrangler.toml](./wrangler.toml)

## Known issues

- **Max 25 monitors to watch in case you are using Slack notifications**, due to the limit of subrequests Cloudflare Worker can make \(50\).

  The plan is to support up to 49 by sending only one Slack notification per scheduled run.

- **KV replication lag** - You might get Slack notification instantly, however it may take couple of more seconds to see the change on your status page as [Cron Triggers are usually running on underutilized quiet hours machines](https://blog.cloudflare.com/introducing-cron-triggers-for-cloudflare-workers/#how-are-you-able-to-offer-this-feature-at-no-additional-cost).

- **Initial delay (no data)** - It takes couple of minutes to schedule and run CRON Triggers for the first time

## Future plans

WIP - Support for Durable Objects - Cloudflare's product for low-latency coordination and consistent storage for the Workers platform. There is a working prototype, however, we are waiting for at least open beta.

There is also a managed version of this project, currently in beta. Feel free to check it out https://statusflare.com (https://twitter.com/statusflare_com).

## Running project locally
**Requirements**
- Linux or WSL
- Yarn Classic 1.22.22 (pinned in `package.json`)
- Node 20 (compatibility validation uses 20.20.2)

### Dependency compatibility and security containment

Install with `yarn install --frozen-lockfile --non-interactive`. The legacy
Webpack 4 worker defaults to `terser-webpack-plugin` 1, whose synchronous
minifier API cannot consume the retained Terser 5 security resolution. The
scoped `**/webpack/terser-webpack-plugin` resolution selects version 4.2.3,
which supports Webpack 4 and awaits Terser 5; client and worker builds therefore
use the compatible minifier without disabling production optimization.

The scoped `**/cacache/tar` resolution selects tar 7.5.22. Yarn intentionally
warns that it is outside cacache's declared `^6.0.2` range. This is bounded
containment validated with actual cache reuse, corruption recovery and archive
fixtures, not a claim of general tar 6/7 API compatibility or upstream support.
It does not eliminate all remaining legacy dependency advisories.

Before release, validate `yarn css`, `yarn flareact build`, and
`yarn build:worker` in that order with a local `config.yaml`. These are build
checks, not a deployment or live monitoring integration test. Hosted CI currently
checks installation and CSS only; it does not establish worker build coverage.

Run `node scripts/test-security-patches.cjs` for deterministic in-memory HTTP
body parsing/compression, query parsing, YAML/URI/schema/source-map handling,
PBKDF2 parity, serialization, editor-command rejection, and the actual default
Webpack production minimizer. No live service or editor process is invoked.
Compatible patch floors refresh stale lock entries; they do not remove the
remaining SVGO 1, selector-parser, Webpack middleware, or crypto dependency
constraints. Existing out-of-range legacy resolutions still require full build
and cache regression validation; a successful build is not proof of production
runtime reachability or a zero-advisory dependency tree.

### Steps to get server up and running
**Install wrangler**
```
npm i -g wrangler
```

**Login With Wrangler to Cloudflare**
```
wrangler login
```

**Create your KV namespace in cloudflare**
```
On the workers page navigate to KV, and create a namespace
```

**Update your wrangler.toml with**
```
kv-namespaces = [{binding="KV_STATUS_PAGE", id="<KV_ID>", preview_id="<KV_ID>"}]
```
_Note: you may need to change `kv-namespaces` to `kv_namespaces`_

**Install packages**
```
yarn install
```

**Create CSS**
```
yarn run css
```

**Run**
```
yarn run dev
```
_Note: If the styles do not come through try using `localhost:8787` instead of `localhost:8080`_
