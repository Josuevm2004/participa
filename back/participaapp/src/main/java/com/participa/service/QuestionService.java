package com.participa.service;

import com.participa.dto.CreateQuestionRequest;
import com.participa.dto.RoomResponse;

public interface QuestionService {
    RoomResponse updateQuestion(String roomCode, CreateQuestionRequest request);
}
