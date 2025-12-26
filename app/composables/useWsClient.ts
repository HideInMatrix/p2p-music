let wsInstance: WebSocket | null = null
const listeners = new Set<(data: any) => void>()

export function useWsClient() {
    if (process.server) {
        return { send: () => { }, onMessage: () => () => { } }
    }

    function connect() {
        if (wsInstance) return wsInstance

        const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
        wsInstance = new WebSocket(`${protocol}://${location.host}/ws`)

        wsInstance.onmessage = (e) => {
            const data = JSON.parse(e.data)
            listeners.forEach((cb) => cb(data))
        }

        wsInstance.onclose = () => {
            wsInstance = null
        }

        return wsInstance
    }

    function send(data: any) {
        const ws = connect()
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data))
        } else {
            ws.addEventListener(
                'open',
                () => ws.send(JSON.stringify(data)),
                { once: true }
            )
        }
    }

    function onMessage(cb: (data: any) => void) {
        listeners.add(cb)
        return () => listeners.delete(cb)
    }

    return { send, onMessage }
}