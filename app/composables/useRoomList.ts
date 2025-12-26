import { ref, onMounted } from 'vue'
import { useWsClient } from './useWsClient'

export function useRoomList() {
    const rooms = ref<
        { room: string; count: number; owner: string }[]
    >([])

    const { send, onMessage } = useWsClient()

    onMounted(() => {
        onMessage((data) => {
            if (data.type === 'rooms') {
                rooms.value = data.rooms
            }
        })

        send({ type: 'list' })
    })

    function createRoom(room: string, owner: string) {
        send({
            type: 'create-room',
            room,
            owner
        })
    }

    return {
        rooms,
        createRoom
    }
}