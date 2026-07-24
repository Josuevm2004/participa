package com.participa.dto;

public class StudentResponseDto {
    private String id;
    private String studentName;
    private String text;
    private Integer colorIndex;
    private Boolean isPinned;
    private Long createdAt;

    public StudentResponseDto() {}

    public StudentResponseDto(String id, String studentName, String text, Integer colorIndex, Boolean isPinned, Long createdAt) {
        this.id = id;
        this.studentName = studentName;
        this.text = text;
        this.colorIndex = colorIndex;
        this.isPinned = isPinned;
        this.createdAt = createdAt;
    }

    public static StudentResponseDtoBuilder builder() {
        return new StudentResponseDtoBuilder();
    }

    public static class StudentResponseDtoBuilder {
        private String id;
        private String studentName;
        private String text;
        private Integer colorIndex;
        private Boolean isPinned;
        private Long createdAt;

        public StudentResponseDtoBuilder id(String id) { this.id = id; return this; }
        public StudentResponseDtoBuilder studentName(String studentName) { this.studentName = studentName; return this; }
        public StudentResponseDtoBuilder text(String text) { this.text = text; return this; }
        public StudentResponseDtoBuilder colorIndex(Integer colorIndex) { this.colorIndex = colorIndex; return this; }
        public StudentResponseDtoBuilder isPinned(Boolean isPinned) { this.isPinned = isPinned; return this; }
        public StudentResponseDtoBuilder createdAt(Long createdAt) { this.createdAt = createdAt; return this; }

        public StudentResponseDto build() {
            return new StudentResponseDto(id, studentName, text, colorIndex, isPinned, createdAt);
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public Integer getColorIndex() { return colorIndex; }
    public void setColorIndex(Integer colorIndex) { this.colorIndex = colorIndex; }

    public Boolean getIsPinned() { return isPinned; }
    public void setIsPinned(Boolean isPinned) { this.isPinned = isPinned; }

    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
}
