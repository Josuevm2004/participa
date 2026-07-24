package com.participa.repository;

import com.participa.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuestionRepository extends JpaRepository<Question, String> {
    List<Question> findByRoomIdOrderByCreatedAtDesc(String roomId);
    Optional<Question> findFirstByRoomIdAndIsActiveTrueOrderByCreatedAtDesc(String roomId);
    Optional<Question> findFirstByRoomCodeAndIsActiveTrueOrderByCreatedAtDesc(String roomCode);
}
