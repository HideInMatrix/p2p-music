const peers = new Set<any>()

const rooms = new Map<
    string,
    {
        owner: string
        peers: Set<any>
    }
>()

/**
 * 向单个 peer 发送裁剪后的房间列表
 */
function sendRoomsToPeer(peer: any, type: WSMessageType = "rooms") {
    const ctx = peer.context as PeerContext

    const payload: ServerMessage = {
        type: type,
        rooms: Array.from(rooms.entries()).map(([roomName, room]) => {
            const base: ClientRoomInfo = {
                room: roomName,
                owner: room.owner,
                count: room.peers.size
            }

            // 只有加入了该房间，才能看到用户列表
            if (ctx.room === roomName) {
                base.users = Array.from(room.peers).map((p: any) => ({
                    name: (p.context as PeerContext)?.name || 'unknown'
                }))
            }

            return base
        })
    }

    peer.send(JSON.stringify(payload))
}

/**
 * 向所有 peer 广播（每人一份裁剪数据）
 */
function broadcastRooms() {
    for (const peer of peers) {
        sendRoomsToPeer(peer)
    }
}

export default defineWebSocketHandler({
    open(peer) {
        peers.add(peer)
        // 新连接立即下发房间列表
        sendRoomsToPeer(peer)
    },

    message(peer, message) {
        const data = JSON.parse(message.text()) as ClientMessage
        const ctx = peer.context as PeerContext

        /* ===== 请求房间列表 ===== */
        if (data.type === 'list') {
            sendRoomsToPeer(peer)
            return
        }

        /* ===== 创建房间 ===== */
        if (data.type === 'create-room') {
            if (rooms.has(data.room)) {
                peer.send(
                    JSON.stringify({
                        type: 'system',
                        message: '房间已存在'
                    })
                )
                return
            }

            rooms.set(data.room, {
                owner: data.owner,
                peers: new Set()
            })

            broadcastRooms()
            return
        }

        /* ===== 加入房间 ===== */
        if (data.type === 'join-room') {
            const room = rooms.get(data.room)
            if (!room) return

            // 如果之前在其他房间，先移除
            if (ctx.room) {
                const oldRoom = rooms.get(ctx.room)
                oldRoom?.peers.delete(peer)
            }

            ctx.room = data.room
            ctx.name = data.name
            room.peers.add(peer)

            broadcastRooms()
            return
        }

        /* ===== WebRTC 信令 ===== */
        if (data.type === 'signal') {
            const room = rooms.get(data.room)
            if (!room) return

            for (const p of room.peers) {
                if (p !== peer) {
                    p.send(
                        JSON.stringify({
                            type: 'signal',
                            data: data.data
                        })
                    )
                }
            }
        }
    },

    close(peer) {
        peers.delete(peer)

        const ctx = peer.context as PeerContext

        if (ctx.room) {
            const room = rooms.get(ctx.room)
            room?.peers.delete(peer)

            // 如果房间空了，可以选择删除（可选）
            if (room && room.peers.size === 0) {
                rooms.delete(ctx.room)
            }
        }

        broadcastRooms()
    }
})