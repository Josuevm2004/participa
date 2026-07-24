package com.participa.service;

import com.participa.dto.CreateResponseRequest;
import com.participa.dto.StudentResponseDto;

public interface StudentResponseService {
    StudentResponseDto addResponse(String roomCode, CreateResponseRequest request);
    StudentResponseDto togglePinResponse(String responseId);
    void deleteResponse(String responseId);
    void clearAllResponses(String roomCode);
}
