package com.participa.service.impl;

import com.participa.dto.CreateRoomRequest;
import com.participa.dto.RoomResponse;
import com.participa.dto.StudentResponseDto;
import com.participa.entity.Question;
import com.participa.entity.Room;
import com.participa.entity.StudentResponse;
import com.participa.exception.ResourceNotFoundException;
import com.participa.repository.QuestionRepository;
import com.participa.repository.RoomRepository;
import com.participa.repository.StudentResponseRepository;
import com.participa.service.RoomService;
import com.participa.websocket.SocketMessage;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@SuppressWarnings("null")
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final QuestionRepository questionRepository;
    private final StudentResponseRepository studentResponseRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public RoomServiceImpl(RoomRepository roomRepository,
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
    public RoomResponse createRoom(CreateRoomRequest request) {
        String code = (request.getCode() != null && !request.getCode().isBlank())
                ? request.getCode().trim().toUpperCase()
                : generateUniqueRoomCode();

        if (roomRepository.existsByCode(code)) {
            code = generateUniqueRoomCode();
        }

        Room room = Room.builder()
                .code(code)
                .teacherName(request.getTeacherName().trim())
                .title(request.getTitle().trim())
                .isActive(true)
                .build();

        Room savedRoom = roomRepository.save(room);

        Question initialQuestion = Question.builder()
                .room(savedRoom)
                .questionText(request.getQuestion().trim())
                .isActive(true)
                .build();

        questionRepository.save(initialQuestion);

        RoomResponse response = mapToRoomResponse(savedRoom, initialQuestion.getQuestionText(), new ArrayList<>());

        notifyRoomChange(code, "CREATE_ROOM", response);

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public RoomResponse getRoomByCode(String code) {
        String cleanCode = code.trim().toUpperCase();
        Room room = roomRepository.findByCodeAndIsActiveTrue(cleanCode)
                .orElseThrow(() -> new ResourceNotFoundException("Sala no encontrada con el código: " + cleanCode));

        String currentQuestionText = questionRepository
                .findFirstByRoomIdAndIsActiveTrueOrderByCreatedAtDesc(room.getId())
                .map(Question::getQuestionText)
                .orElse("Sin pregunta activa");

        List<StudentResponse> responses = studentResponseRepository
                .findByRoomIdAndDeletedAtIsNullOrderByIsPinnedDescCreatedAtDesc(room.getId());

        List<StudentResponseDto> responseDtos = responses.stream()
                .map(this::mapToStudentResponseDto)
                .collect(Collectors.toList());

        return mapToRoomResponse(room, currentQuestionText, responseDtos);
    }

    @Override
    @Transactional
    public void closeRoom(String code) {
        String cleanCode = code.trim().toUpperCase();
        Room room = roomRepository.findByCode(cleanCode)
                .orElseThrow(() -> new ResourceNotFoundException("Sala no encontrada: " + cleanCode));

        room.setIsActive(false);
        room.setClosedAt(LocalDateTime.now());
        roomRepository.save(room);

        notifyRoomChange(cleanCode, "CLOSE_ROOM", null);
    }

    private String generateUniqueRoomCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        String nums = "23456789";
        Random random = new Random();
        String code;
        do {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 3; i++) {
                sb.append(chars.charAt(random.nextInt(chars.length())));
            }
            sb.append("-");
            for (int i = 0; i < 3; i++) {
                sb.append(nums.charAt(random.nextInt(nums.length())));
            }
            code = sb.toString();
        } while (roomRepository.existsByCode(code));
        return code;
    }

    private RoomResponse mapToRoomResponse(Room room, String questionText, List<StudentResponseDto> responses) {
        long createdMillis = room.getCreatedAt() != null
                ? room.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                : System.currentTimeMillis();

        return RoomResponse.builder()
                .id(room.getId())
                .code(room.getCode())
                .teacherName(room.getTeacherName())
                .title(room.getTitle())
                .question(questionText)
                .isActive(room.getIsActive())
                .createdAt(createdMillis)
                .responses(responses)
                .build();
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

    private void notifyRoomChange(String roomCode, String action, Object payload) {
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
