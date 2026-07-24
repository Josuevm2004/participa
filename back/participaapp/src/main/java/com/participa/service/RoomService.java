package com.participa.service;

import com.participa.dto.CreateRoomRequest;
import com.participa.dto.RoomResponse;

public interface RoomService {
    RoomResponse createRoom(CreateRoomRequest request);
    RoomResponse getRoomByCode(String code);
    void closeRoom(String code);
}
