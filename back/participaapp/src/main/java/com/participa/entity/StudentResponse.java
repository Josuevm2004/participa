package com.participa.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "responses")
public class StudentResponse {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private Question question;

    @Column(name = "student_name", nullable = false, length = 120)
    private String studentName;

    @Column(name = "response_text", nullable = false, columnDefinition = "TEXT")
    private String responseText;

    @Column(name = "color_index", nullable = false)
    private Integer colorIndex = 0;

    @Column(name = "is_pinned", nullable = false)
    private Boolean isPinned = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public StudentResponse() {}

    public StudentResponse(String id, Room room, Question question, String studentName, String responseText, Integer colorIndex, Boolean isPinned, LocalDateTime createdAt, LocalDateTime deletedAt) {
        this.id = id;
        this.room = room;
        this.question = question;
        this.studentName = studentName;
        this.responseText = responseText;
        this.colorIndex = colorIndex != null ? colorIndex : 0;
        this.isPinned = isPinned != null ? isPinned : false;
        this.createdAt = createdAt;
        this.deletedAt = deletedAt;
    }

    public static StudentResponseBuilder builder() {
        return new StudentResponseBuilder();
    }

    public static class StudentResponseBuilder {
        private String id;
        private Room room;
        private Question question;
        private String studentName;
        private String responseText;
        private Integer colorIndex = 0;
        private Boolean isPinned = false;
        private LocalDateTime createdAt;
        private LocalDateTime deletedAt;

        public StudentResponseBuilder id(String id) { this.id = id; return this; }
        public StudentResponseBuilder room(Room room) { this.room = room; return this; }
        public StudentResponseBuilder question(Question question) { this.question = question; return this; }
        public StudentResponseBuilder studentName(String studentName) { this.studentName = studentName; return this; }
        public StudentResponseBuilder responseText(String responseText) { this.responseText = responseText; return this; }
        public StudentResponseBuilder colorIndex(Integer colorIndex) { this.colorIndex = colorIndex; return this; }
        public StudentResponseBuilder isPinned(Boolean isPinned) { this.isPinned = isPinned; return this; }
        public StudentResponseBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public StudentResponseBuilder deletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; return this; }

        public StudentResponse build() {
            return new StudentResponse(id, room, question, studentName, responseText, colorIndex, isPinned, createdAt, deletedAt);
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
        if (this.colorIndex == null) {
            this.colorIndex = 0;
        }
        if (this.isPinned == null) {
            this.isPinned = false;
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Room getRoom() { return room; }
    public void setRoom(Room room) { this.room = room; }

    public Question getQuestion() { return question; }
    public void setQuestion(Question question) { this.question = question; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getResponseText() { return responseText; }
    public void setResponseText(String responseText) { this.responseText = responseText; }

    public Integer getColorIndex() { return colorIndex; }
    public void setColorIndex(Integer colorIndex) { this.colorIndex = colorIndex; }

    public Boolean getIsPinned() { return isPinned; }
    public void setIsPinned(Boolean isPinned) { this.isPinned = isPinned; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }
}
