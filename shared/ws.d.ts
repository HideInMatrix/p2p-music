type ClientRoomInfo = { room: string; count: number; owner: string; users?: { name: string }[] }
interface PeerContext {
    room?: string
    name?: string
}
type WSMessageType = "rooms" | 'signal' | 'system' | 'list' | 'create-room' | 'join-room'
type ClientMessage =
    | { type: 'list' }
    | { type: 'create-room'; room: string; owner: string }
    | { type: 'join-room'; room: string; name: string }
    | { type: 'signal'; room: string; data: any }

type ServerMessage =
    | {
        type: WSMessageType
        rooms: ClientRoomInfo[]
    }
    | { type: 'signal'; data: any }
    | { type: 'system'; message: string }