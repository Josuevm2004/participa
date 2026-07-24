-- Azure SQL Database / Microsoft SQL Server Script for Participa App

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'participa_db')
BEGIN
    CREATE DATABASE participa_db;
END;
GO

USE participa_db;
GO

IF OBJECT_ID('dbo.responses', 'U') IS NOT NULL DROP TABLE dbo.responses;
IF OBJECT_ID('dbo.questions', 'U') IS NOT NULL DROP TABLE dbo.questions;
IF OBJECT_ID('dbo.rooms', 'U') IS NOT NULL DROP TABLE dbo.rooms;
GO

CREATE TABLE rooms (
  id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
  code VARCHAR(20) NOT NULL UNIQUE,
  teacher_name VARCHAR(120) NOT NULL,
  title VARCHAR(200) NOT NULL,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  closed_at DATETIME2 NULL
);

CREATE TABLE questions (
  id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
  room_id VARCHAR(36) NOT NULL,
  question_text NVARCHAR(MAX) NOT NULL,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

  CONSTRAINT fk_questions_rooms
    FOREIGN KEY (room_id)
    REFERENCES rooms(id)
    ON DELETE CASCADE
);

CREATE TABLE responses (
  id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
  room_id VARCHAR(36) NOT NULL,
  question_id VARCHAR(36) NULL,
  student_name VARCHAR(120) NOT NULL,
  response_text NVARCHAR(MAX) NOT NULL,
  color_index INT NOT NULL DEFAULT 0,
  is_pinned BIT NOT NULL DEFAULT 0,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  deleted_at DATETIME2 NULL,

  CONSTRAINT fk_responses_rooms
    FOREIGN KEY (room_id)
    REFERENCES rooms(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_responses_questions
    FOREIGN KEY (question_id)
    REFERENCES questions(id)
    ON DELETE NO ACTION
);
GO
