import { render } from 'preact'
import './index.css';
import '@douyinfe/semi-ui/dist/css/semi.min.css';
import { App } from './App'
import type { UpdatePayload } from 'vite'

const MODULE_PATH = '/@vite/client'
console.log('not in dev mode')
import(/* @vite-ignore */ MODULE_PATH)
    .then((c) => {
        const hmr = c.createHotContext('/')
        hmr.on('vite:beforeUpdate', (update: UpdatePayload) => {
            update.updates.forEach((u) => {
                console.log(u)
            })
        })
        hmr.on('hono_di:update', (update: UpdatePayload) => {
            // console.log(update)
            window.dispatchEvent(new CustomEvent('hono_di:update', { detail: update }))
        })
    })
    .catch((e) => {
        console.error('failed to connect to client vite server, you might need to do manual refresh to see the updates')
        console.error(e)
    })

render(<App />, document.getElementById('app')!)
