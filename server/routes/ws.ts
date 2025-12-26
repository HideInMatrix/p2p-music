// server/routes/ws.ts

type ClientMessage =
    | { type: 'list' }
    | { type: 'create-room'; room: string; owner: string }
    | { type: 'join-room'; room: string; name: string }
    | { type: 'signal'; room: string; data: any }

type ServerMessage =
    | {
        type: 'rooms'
        rooms: { room: string; count: number; owner: string }[]
    }
    | { type: 'signal'; data: any }
    | { type: 'system'; message: string }

interface PeerContext {
    room?: string
    name?: string
}

const rooms = new Map<
    string,
    {
        owner: string
        peers: Set<any>
    }
>()

const peers = new Set<any>()

function broadcastRooms() {
    const payload: ServerMessage = {
        type: 'rooms',
        rooms: Array.from(rooms.entries()).map(([room, r]) => ({
            room,
            owner: r.owner,
            count: r.peers.size
        }))
    }

    for (const p of peers) {
        p.send(JSON.stringify(payload))
    }
}

export default defineWebSocketHandler({
    open(peer) {
        peers.add(peer)
    },

    message(peer, message) {
        const data = JSON.parse(message.text()) as ClientMessage
        const ctx = peer.context as PeerContext

        if (data.type === 'list') {
            broadcastRooms()
            return
        }

        if (data.type === 'create-room') {
            if (!rooms.has(data.room)) {
                rooms.set(data.room, {
                    owner: data.owner,
                    peers: new Set()
                })
                broadcastRooms()
            }
            return
        }

        if (data.type === 'join-room') {
            const room = rooms.get(data.room)
            if (!room) return

            ctx.room = data.room
            ctx.name = data.name
            room.peers.add(peer)

            broadcastRooms()
            return
        }

        // WebRTC 信令转发
        if (data.type === 'signal') {
            const room = rooms.get(data.room)
            if (!room) return

            for (const p of room.peers) {
                if (p !== peer) {
                    p.send(JSON.stringify({ type: 'signal', data: data.data }))
                }
            }
        }
    },

    close(peer) {
        peers.delete(peer)

        for (const [_, room] of rooms) {
            room.peers.delete(peer)
        }

        broadcastRooms()
    }
})