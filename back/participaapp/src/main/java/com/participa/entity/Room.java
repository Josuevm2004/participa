package com.participa.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "rooms")
public class Room {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "teacher_name", nullable = false, length = 120)
    private String teacherName;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Question> questions = new ArrayList<>();

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StudentResponse> responses = new ArrayList<>();

    public Room() {}

    public Room(String id, String code, String teacherName, String title, Boolean isActive, LocalDateTime createdAt, LocalDateTime updatedAt, LocalDateTime closedAt) {
        this.id = id;
        this.code = code;
        this.teacherName = teacherName;
        this.title = title;
        this.isActive = isActive != null ? isActive : true;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.closedAt = closedAt;
    }

    public static RoomBuilder builder() {
        return new RoomBuilder();
    }

    public static class RoomBuilder {
        private String id;
        private String code;
        private String teacherName;
        private String title;
        private Boolean isActive = true;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LocalDateTime closedAt;

        public RoomBuilder id(String id) { this.id = id; return this; }
        public RoomBuilder code(String code) { this.code = code; return this; }
        public RoomBuilder teacherName(String teacherName) { this.teacherName = teacherName; return this; }
        public RoomBuilder title(String title) { this.title = title; return this; }
        public RoomBuilder isActive(Boolean isActive) { this.isActive = isActive; return this; }
        public RoomBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public RoomBuilder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }
        public RoomBuilder closedAt(LocalDateTime closedAt) { this.closedAt = closedAt; return this; }

        public Room build() {
            return new Room(id, code, teacherName, title, isActive, createdAt, updatedAt, closedAt);
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
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
        if (this.isActive == null) {
            this.isActive = true;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getTeacherName() { return teacherName; }
    public void setTeacherName(String teacherName) { this.teacherName = teacherName; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public LocalDateTime getClosedAt() { return closedAt; }
    public void setClosedAt(LocalDateTime closedAt) { this.closedAt = closedAt; }

    public List<Question> getQuestions() { return questions; }
    public void setQuestions(List<Question> questions) { this.questions = questions; }

    public List<StudentResponse> getResponses() { return responses; }
    public void setResponses(List<StudentResponse> responses) { this.responses = responses; }
}
