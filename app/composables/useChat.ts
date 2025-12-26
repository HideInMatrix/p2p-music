import { ref } from 'vue'
import { useWsClient } from './useWsClient'

export function useChat(room: string, name: string) {
    const messages = ref<{ name: string; message: string }[]>([])
    const { send: sendSignal, onMessage } = useWsClient()

    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    let channel: RTCDataChannel | null = null
    let started = false

    /* ===== 接收 DataChannel ===== */
    pc.ondatachannel = (event) => {
        channel = event.channel
        bindChannel()
    }

    /* ===== ICE ===== */
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignal({
                type: 'signal',
                room,
                data: { ice: event.candidate }
            })
        }
    }

    /* ===== 信令 ===== */
    onMessage(async (msg) => {
        if (msg.type !== 'signal') return

        const data = msg.data

        // 被动收到 offer（非房主）
        if (data.offer && !started) {
            started = true

            await pc.setRemoteDescription(data.offer)

            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            sendSignal({
                type: 'signal',
                room,
                data: { answer }
            })
        }

        // 主动方收到 answer
        if (data.answer) {
            await pc.setRemoteDescription(data.answer)
        }

        if (data.ice) {
            await pc.addIceCandidate(data.ice)
        }
    })

    function bindChannel() {
        if (!channel) return
        channel.onmessage = (e) => {
            messages.value.push(JSON.parse(e.data))
        }
    }

    /* ===== 主动发起（由外部控制） ===== */
    async function start() {
        if (started) return
        started = true

        channel = pc.createDataChannel('chat')
        bindChannel()

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        sendSignal({
            type: 'signal',
            room,
            data: { offer }
        })
    }

    function sendMessage(text: string) {
        if (!channel || channel.readyState !== 'open') return

        const payload = { name, message: text }
        channel.send(JSON.stringify(payload))
        messages.value.push(payload)
    }

    return {
        messages,
        start,
        sendMessage
    }
}