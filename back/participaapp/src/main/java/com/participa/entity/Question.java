package com.participa.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "questions")
public class Question {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Question() {}

    public Question(String id, Room room, String questionText, Boolean isActive, LocalDateTime createdAt) {
        this.id = id;
        this.room = room;
        this.questionText = questionText;
        this.isActive = isActive != null ? isActive : true;
        this.createdAt = createdAt;
    }

    public static QuestionBuilder builder() {
        return new QuestionBuilder();
    }

    public static class QuestionBuilder {
        private String id;
        private Room room;
        private String questionText;
        private Boolean isActive = true;
        private LocalDateTime createdAt;

        public QuestionBuilder id(String id) { this.id = id; return this; }
        public QuestionBuilder room(Room room) { this.room = room; return this; }
        public QuestionBuilder questionText(String questionText) { this.questionText = questionText; return this; }
        public QuestionBuilder isActive(Boolean isActive) { this.isActive = isActive; return this; }
        public QuestionBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }

        public Question build() {
            return new Question(id, room, questionText, isActive, createdAt);
        }
    }

    @PrePersist
    public void prePersist() {
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.isActive == null) {
            this.isActive = true;
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Room getRoom() { return room; }
    public void setRoom(Room room) { this.room = room; }

    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
