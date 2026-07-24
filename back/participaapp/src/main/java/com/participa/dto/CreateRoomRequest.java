package com.participa.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateRoomRequest {

    private String code;

    @NotBlank(message = "El nombre del docente es obligatorio")
    private String teacherName;

    @NotBlank(message = "El título de la sala es obligatorio")
    private String title;

    @NotBlank(message = "La pregunta inicial es obligatoria")
    private String question;

    public CreateRoomRequest() {}

    public CreateRoomRequest(String code, String teacherName, String title, String question) {
        this.code = code;
        this.teacherName = teacherName;
        this.title = title;
        this.question = question;
    }

    public static CreateRoomRequestBuilder builder() {
        return new CreateRoomRequestBuilder();
    }

    public static class CreateRoomRequestBuilder {
        private String code;
        private String teacherName;
        private String title;
        private String question;

        public CreateRoomRequestBuilder code(String code) { this.code = code; return this; }
        public CreateRoomRequestBuilder teacherName(String teacherName) { this.teacherName = teacherName; return this; }
        public CreateRoomRequestBuilder title(String title) { this.title = title; return this; }
        public CreateRoomRequestBuilder question(String question) { this.question = question; return this; }

        public CreateRoomRequest build() {
            return new CreateRoomRequest(code, teacherName, title, question);
        }
    }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getTeacherName() { return teacherName; }
    public void setTeacherName(String teacherName) { this.teacherName = teacherName; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }
}
