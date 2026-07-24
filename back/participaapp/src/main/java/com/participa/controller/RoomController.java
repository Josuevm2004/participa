package com.participa.controller;

import com.participa.dto.CreateQuestionRequest;
import com.participa.dto.CreateRoomRequest;
import com.participa.dto.RoomResponse;
import com.participa.service.QuestionService;
import com.participa.service.RoomService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;
    private final QuestionService questionService;

    public RoomController(RoomService roomService, QuestionService questionService) {
        this.roomService = roomService;
        this.questionService = questionService;
    }

    @PostMapping
    public ResponseEntity<RoomResponse> createRoom(@Valid @RequestBody CreateRoomRequest request) {
        RoomResponse roomResponse = roomService.createRoom(request);
        return new ResponseEntity<>(roomResponse, HttpStatus.CREATED);
    }

    @GetMapping("/{code}")
    public ResponseEntity<RoomResponse> getRoomByCode(@PathVariable String code) {
        RoomResponse roomResponse = roomService.getRoomByCode(code);
        return ResponseEntity.ok(roomResponse);
    }

    @PutMapping("/{code}/question")
    public ResponseEntity<RoomResponse> updateRoomQuestion(
            @PathVariable String code,
            @Valid @RequestBody CreateQuestionRequest request) {
        RoomResponse roomResponse = questionService.updateQuestion(code, request);
        return ResponseEntity.ok(roomResponse);
    }

    @DeleteMapping("/{code}")
    public ResponseEntity<Void> closeRoom(@PathVariable String code) {
        roomService.closeRoom(code);
        return ResponseEntity.noContent().build();
    }
}
