package com.participa.controller;

import com.participa.dto.CreateResponseRequest;
import com.participa.dto.StudentResponseDto;
import com.participa.service.StudentResponseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class ResponseController {

    private final StudentResponseService studentResponseService;

    public ResponseController(StudentResponseService studentResponseService) {
        this.studentResponseService = studentResponseService;
    }

    @PostMapping("/api/rooms/{roomCode}/responses")
    public ResponseEntity<StudentResponseDto> addResponse(
            @PathVariable String roomCode,
            @Valid @RequestBody CreateResponseRequest request) {
        StudentResponseDto responseDto = studentResponseService.addResponse(roomCode, request);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @PutMapping("/api/responses/{id}/pin")
    public ResponseEntity<StudentResponseDto> togglePinResponse(@PathVariable String id) {
        StudentResponseDto responseDto = studentResponseService.togglePinResponse(id);
        return ResponseEntity.ok(responseDto);
    }

    @DeleteMapping("/api/responses/{id}")
    public ResponseEntity<Void> deleteResponse(@PathVariable String id) {
        studentResponseService.deleteResponse(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/api/rooms/{roomCode}/responses")
    public ResponseEntity<Void> clearAllResponses(@PathVariable String roomCode) {
        studentResponseService.clearAllResponses(roomCode);
        return ResponseEntity.noContent().build();
    }
}
