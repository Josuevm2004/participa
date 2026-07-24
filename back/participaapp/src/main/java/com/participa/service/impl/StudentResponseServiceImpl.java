package com.participa.service.impl;

import com.participa.dto.CreateResponseRequest;
import com.participa.dto.StudentResponseDto;
import com.participa.entity.Question;
import com.participa.entity.Room;
import com.participa.entity.StudentResponse;
import com.participa.exception.ResourceNotFoundException;
import com.participa.repository.QuestionRepository;
import com.participa.repository.RoomRepository;
import com.participa.repository.StudentResponseRepository;
import com.participa.service.StudentResponseService;
import com.participa.websocket.SocketMessage;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
@SuppressWarnings("null")
public class StudentResponseServiceImpl implements StudentResponseService {

    private final RoomRepository roomRepository;
    private final QuestionRepository questionRepository;
    private final StudentResponseRepository studentResponseRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public StudentResponseServiceImpl(RoomRepository roomRepository,
                                      QuestionRepository questionRepository,
                                      StudentResponseRepository studentResponseRepository,
                                      SimpMessagingTemplate messagingTemplate) {
        this.roomRepository = roomRepository;
        this.questionRepository = questionRepository;
        this.studentResponseRepository = studentResponseRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    @Transactional
    public StudentResponseDto addResponse(String roomCode, CreateResponseRequest request) {
        String cleanCode = roomCode.trim().toUpperCase();
        Room room = roomRepository.findByCodeAndIsActiveTrue(cleanCode)
                .orElseThrow(() -> new ResourceNotFoundException("Sala no encontrada o inactiva: " + cleanCode));

        Question activeQuestion = questionRepository
                .findFirstByRoomIdAndIsActiveTrueOrderByCreatedAtDesc(room.getId())
                .orElse(null);

        List<StudentResponse> existingResponses = studentResponseRepository
                .findByRoomIdAndDeletedAtIsNullOrderByIsPinnedDescCreatedAtDesc(room.getId());

        int colorIndex = existingResponses.size() % 5;

        StudentResponse response = StudentResponse.builder()
                .room(room)
                .question(activeQuestion)
                .studentName(request.getStudentName().trim())
                .responseText(request.getText().trim())
                .colorIndex(colorIndex)
                .isPinned(false)
                .build();

        StudentResponse savedResponse = studentResponseRepository.save(response);
        StudentResponseDto dto = mapToStudentResponseDto(savedResponse);

        notifyRoomSocket(cleanCode, "ADD_RESPONSE", dto);

        return dto;
    }

    @Override
    @Transactional
    public StudentResponseDto togglePinResponse(String responseId) {
        StudentResponse response = studentResponseRepository.findById(responseId)
                .orElseThrow(() -> new ResourceNotFoundException("Respuesta no encontrada con ID: " + responseId));

        response.setIsPinned(!Boolean.TRUE.equals(response.getIsPinned()));
        StudentResponse updated = studentResponseRepository.save(response);

        StudentResponseDto dto = mapToStudentResponseDto(updated);
        notifyRoomSocket(response.getRoom().getCode(), "PIN_RESPONSE", dto);

        return dto;
    }

    @Override
    @Transactional
    public void deleteResponse(String responseId) {
        StudentResponse response = studentResponseRepository.findById(responseId)
                .orElseThrow(() -> new ResourceNotFoundException("Respuesta no encontrada con ID: " + responseId));

        response.setDeletedAt(LocalDateTime.now());
        studentResponseRepository.save(response);

        notifyRoomSocket(response.getRoom().getCode(), "DELETE_RESPONSE", responseId);
    }

    @Override
    @Transactional
    public void clearAllResponses(String roomCode) {
        String cleanCode = roomCode.trim().toUpperCase();
        Room room = roomRepository.findByCodeAndIsActiveTrue(cleanCode)
                .orElseThrow(() -> new ResourceNotFoundException("Sala no encontrada: " + cleanCode));

        studentResponseRepository.softDeleteAllByRoomId(room.getId());

        notifyRoomSocket(cleanCode, "CLEAR_RESPONSES", null);
    }

    private StudentResponseDto mapToStudentResponseDto(StudentResponse resp) {
        long createdMillis = resp.getCreatedAt() != null
                ? resp.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                : System.currentTimeMillis();

        return StudentResponseDto.builder()
                .id(resp.getId())
                .studentName(resp.getStudentName())
                .text(resp.getResponseText())
                .colorIndex(resp.getColorIndex())
                .isPinned(resp.getIsPinned())
                .createdAt(createdMillis)
                .build();
    }

    private void notifyRoomSocket(String roomCode, String action, Object payload) {
        try {
            SocketMessage message = SocketMessage.builder()
                    .type(action)
                    .roomCode(roomCode)
                    .payload(payload)
                    .timestamp(System.currentTimeMillis())
                    .build();
            messagingTemplate.convertAndSend("/topic/room/" + roomCode, message);
        } catch (Exception ignored) {
        }
    }
}
