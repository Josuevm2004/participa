package com.participa.websocket;

public class SocketMessage {
    private String type;
    private String roomCode;
    private Object payload;
    private Long timestamp;

    public SocketMessage() {}

    public SocketMessage(String type, String roomCode, Object payload, Long timestamp) {
        this.type = type;
        this.roomCode = roomCode;
        this.payload = payload;
        this.timestamp = timestamp;
    }

    public static SocketMessageBuilder builder() {
        return new SocketMessageBuilder();
    }

    public static class SocketMessageBuilder {
        private String type;
        private String roomCode;
        private Object payload;
        private Long timestamp;

        public SocketMessageBuilder type(String type) { this.type = type; return this; }
        public SocketMessageBuilder roomCode(String roomCode) { this.roomCode = roomCode; return this; }
        public SocketMessageBuilder payload(Object payload) { this.payload = payload; return this; }
        public SocketMessageBuilder timestamp(Long timestamp) { this.timestamp = timestamp; return this; }

        public SocketMessage build() {
            return new SocketMessage(type, roomCode, payload, timestamp);
        }
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getRoomCode() { return roomCode; }
    public void setRoomCode(String roomCode) { this.roomCode = roomCode; }

    public Object getPayload() { return payload; }
    public void setPayload(Object payload) { this.payload = payload; }

    public Long getTimestamp() { return timestamp; }
    public void setTimestamp(Long timestamp) { this.timestamp = timestamp; }
}
