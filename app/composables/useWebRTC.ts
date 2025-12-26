// composables/useWebRTC.ts
import { ref } from 'vue';

export function useWebRTC(roomId: string, username: string) {
    const localStream = ref<MediaStream | null>(null);
    const remoteStream = ref<MediaStream | null>(null);
    let pc: RTCPeerConnection;
    let ws: WebSocket;

    // 创建 PeerConnection
    function createPeerConnection() {
        pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        // 远程流事件：将远程轨道追加到 remoteStream
        pc.ontrack = (event) => {
            if (!remoteStream.value) {
                remoteStream.value = new MediaStream();
            }
            remoteStream.value.addTrack(event.track);
        };

        // 收到本地 ICE 候选时，通过 WebSocket 发送给对端
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                ws.send(JSON.stringify({
                    type: 'ice',
                    room: roomId,
                    candidate: event.candidate
                }));
            }
        };
    }

    // 初始化 WebRTC：获取本地媒体、建立 WebSocket 连接
    async function init() {
        // 获取本地视频/音频流 [oai_citation:10‡developer.mozilla.org](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#:~:text=The%20,the%20requested%20types%20of%20media)
        localStream.value = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        createPeerConnection();
        // 将本地轨道添加到对等连接
        localStream.value.getTracks().forEach(track => pc.addTrack(track, localStream.value as MediaStream));

        // 连接信令 WebSocket 服务器
        ws = new WebSocket('ws://localhost:3000/ws');
        ws.onopen = () => {
            // 通知服务器加入房间
            ws.send(JSON.stringify({ type: 'join', room: roomId, name: username }));
        };
        ws.onmessage = async (event) => {
            const msg = JSON.parse(event.data);
            switch (msg.type) {
                case 'join':
                    // 另一端用户加入房间时，如果自己是发起者，则发送 offer
                    // 这里简单以先到先发起方为例
                    if (msg.name !== username) {
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        ws.send(JSON.stringify({ type: 'offer', room: roomId, sdp: offer }));
                    }
                    break;
                case 'offer':
                    // 收到对方的 offer，设置远端描述并回复 answer
                    await pc.setRemoteDescription(msg.sdp);
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    ws.send(JSON.stringify({ type: 'answer', room: roomId, sdp: answer }));
                    break;
                case 'answer':
                    // 收到对方的 answer，设置远端描述
                    await pc.setRemoteDescription(msg.sdp);
                    break;
                case 'ice':
                    // 收到对方的 ICE 候选，添加到 RTCPeerConnection [oai_citation:11‡developer.mozilla.org](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate#:~:text=The%20,used%20to%20establish%20an%20RTCPeerConnection)
                    try {
                        await pc.addIceCandidate(msg.candidate);
                    } catch (e) {
                        console.warn('添加 ICE 候选失败：', e);
                    }
                    break;
            }
        };
    }

    init(); // 调用初始化逻辑

    return { localStream, remoteStream };
}