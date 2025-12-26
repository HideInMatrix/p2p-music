export default defineWebSocketHandler({
    open(peer) {
    },

    message(peer, message) {
        if (message.text().includes("ping")) {
            peer.send("pong");
        }
    },

    close(peer, event) {
    },

    error(peer, error) {
    },
});

