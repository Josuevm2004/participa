package com.participa.websocket;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class RoomSocketController {

    @MessageMapping("/room/{code}/send")
    @SendTo("/topic/room/{code}")
    public SocketMessage handleRoomMessage(@DestinationVariable String code, SocketMessage message) {
        if (message.getTimestamp() == null) {
            message.setTimestamp(System.currentTimeMillis());
        }
        message.setRoomCode(code);
        return message;
    }
}
