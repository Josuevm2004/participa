package com.participa.controller;

import com.participa.dto.CreateQuestionRequest;
import com.participa.dto.RoomResponse;
import com.participa.service.QuestionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/questions")
public class QuestionController {

    private final QuestionService questionService;

    public QuestionController(QuestionService questionService) {
        this.questionService = questionService;
    }

    @PostMapping("/{roomCode}")
    public ResponseEntity<RoomResponse> createQuestion(
            @PathVariable String roomCode,
            @Valid @RequestBody CreateQuestionRequest request) {
        RoomResponse roomResponse = questionService.updateQuestion(roomCode, request);
        return ResponseEntity.ok(roomResponse);
    }
}
