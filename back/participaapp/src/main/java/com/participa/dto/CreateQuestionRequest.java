package com.participa.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateQuestionRequest {

    @NotBlank(message = "El texto de la pregunta es obligatorio")
    private String question;

    public CreateQuestionRequest() {}

    public CreateQuestionRequest(String question) {
        this.question = question;
    }

    public static CreateQuestionRequestBuilder builder() {
        return new CreateQuestionRequestBuilder();
    }

    public static class CreateQuestionRequestBuilder {
        private String question;

        public CreateQuestionRequestBuilder question(String question) { this.question = question; return this; }

        public CreateQuestionRequest build() {
            return new CreateQuestionRequest(question);
        }
    }

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }
}
