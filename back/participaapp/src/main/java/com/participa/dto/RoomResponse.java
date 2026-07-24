package com.participa.dto;

import java.util.ArrayList;
import java.util.List;

public class RoomResponse {
    private String id;
    private String code;
    private String teacherName;
    private String title;
    private String question;
    private Boolean isActive;
    private Long createdAt;
    private List<StudentResponseDto> responses = new ArrayList<>();

    public RoomResponse() {}

    public RoomResponse(String id, String code, String teacherName, String title, String question, Boolean isActive, Long createdAt, List<StudentResponseDto> responses) {
        this.id = id;
        this.code = code;
        this.teacherName = teacherName;
        this.title = title;
        this.question = question;
        this.isActive = isActive;
        this.createdAt = createdAt;
        this.responses = responses != null ? responses : new ArrayList<>();
    }

    public static RoomResponseBuilder builder() {
        return new RoomResponseBuilder();
    }

    public static class RoomResponseBuilder {
        private String id;
        private String code;
        private String teacherName;
        private String title;
        private String question;
        private Boolean isActive;
        private Long createdAt;
        private List<StudentResponseDto> responses = new ArrayList<>();

        public RoomResponseBuilder id(String id) { this.id = id; return this; }
        public RoomResponseBuilder code(String code) { this.code = code; return this; }
        public RoomResponseBuilder teacherName(String teacherName) { this.teacherName = teacherName; return this; }
        public RoomResponseBuilder title(String title) { this.title = title; return this; }
        public RoomResponseBuilder question(String question) { this.question = question; return this; }
        public RoomResponseBuilder isActive(Boolean isActive) { this.isActive = isActive; return this; }
        public RoomResponseBuilder createdAt(Long createdAt) { this.createdAt = createdAt; return this; }
        public RoomResponseBuilder responses(List<StudentResponseDto> responses) { this.responses = responses; return this; }

        public RoomResponse build() {
            return new RoomResponse(id, code, teacherName, title, question, isActive, createdAt, responses);
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getTeacherName() { return teacherName; }
    public void setTeacherName(String teacherName) { this.teacherName = teacherName; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }

    public List<StudentResponseDto> getResponses() { return responses; }
    public void setResponses(List<StudentResponseDto> responses) { this.responses = responses; }
}
