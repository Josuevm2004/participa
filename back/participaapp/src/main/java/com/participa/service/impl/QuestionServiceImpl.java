package com.participa.service.impl;

import com.participa.dto.CreateQuestionRequest;
import com.participa.dto.RoomResponse;
import com.participa.entity.Question;
import com.participa.entity.Room;
import com.participa.exception.ResourceNotFoundException;
import com.participa.repository.QuestionRepository;
import com.participa.repository.RoomRepository;
import com.participa.service.QuestionService;
import com.participa.service.RoomService;
import com.participa.websocket.SocketMessage;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@SuppressWarnings("null")
public class QuestionServiceImpl implements QuestionService {

    private final RoomRepository roomRepository;
    private final QuestionRepository questionRepository;
    private final RoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;

    public QuestionServiceImpl(RoomRepository roomRepository,
                               QuestionRepository questionRepository,
                               RoomService roomService,
                               SimpMessagingTemplate messagingTemplate) {
        this.roomRepository = roomRepository;
        this.questionRepository = questionRepository;
        this.roomService = roomService;
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    @Transactional
    public RoomResponse updateQuestion(String roomCode, CreateQuestionRequest request) {
        String cleanCode = roomCode.trim().toUpperCase();
        Room room = roomRepository.findByCodeAndIsActiveTrue(cleanCode)
                .orElseThrow(() -> new ResourceNotFoundException("Sala no encontrada o inactiva: " + cleanCode));

        List<Question> activeQuestions = questionRepository.findByRoomIdOrderByCreatedAtDesc(room.getId());
        for (Question q : activeQuestions) {
            if (Boolean.TRUE.equals(q.getIsActive())) {
                q.setIsActive(false);
                questionRepository.save(q);
            }
        }

        Question newQuestion = Question.builder()
                .room(room)
                .questionText(request.getQuestion().trim())
                .isActive(true)
                .build();

        questionRepository.save(newQuestion);

        RoomResponse roomResponse = roomService.getRoomByCode(cleanCode);

        try {
            SocketMessage message = SocketMessage.builder()
                    .type("UPDATE_QUESTION")
                    .roomCode(cleanCode)
                    .payload(roomResponse)
                    .timestamp(System.currentTimeMillis())
                    .build();
            messagingTemplate.convertAndSend("/topic/room/" + cleanCode, message);
        } catch (Exception ignored) {
        }

        return roomResponse;
    }
}
