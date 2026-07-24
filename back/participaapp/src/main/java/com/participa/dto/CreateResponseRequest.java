package com.participa.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateResponseRequest {

    @NotBlank(message = "El nombre del estudiante es obligatorio")
    private String studentName;

    @NotBlank(message = "La respuesta es obligatoria")
    private String text;

    public CreateResponseRequest() {}

    public CreateResponseRequest(String studentName, String text) {
        this.studentName = studentName;
        this.text = text;
    }

    public static CreateResponseRequestBuilder builder() {
        return new CreateResponseRequestBuilder();
    }

    public static class CreateResponseRequestBuilder {
        private String studentName;
        private String text;

        public CreateResponseRequestBuilder studentName(String studentName) { this.studentName = studentName; return this; }
        public CreateResponseRequestBuilder text(String text) { this.text = text; return this; }

        public CreateResponseRequest build() {
            return new CreateResponseRequest(studentName, text);
        }
    }

    public String getStudentName() { return studentName; }
    public void setTeacherName(String studentName) { this.studentName = studentName; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
}
