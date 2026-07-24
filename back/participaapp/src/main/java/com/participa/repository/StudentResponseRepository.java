package com.participa.repository;

import com.participa.entity.StudentResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentResponseRepository extends JpaRepository<StudentResponse, String> {
    List<StudentResponse> findByRoomIdAndDeletedAtIsNullOrderByIsPinnedDescCreatedAtDesc(String roomId);
    List<StudentResponse> findByRoomCodeAndDeletedAtIsNullOrderByIsPinnedDescCreatedAtDesc(String roomCode);

    @Modifying
    @Query("UPDATE StudentResponse r SET r.deletedAt = CURRENT_TIMESTAMP WHERE r.room.id = :roomId AND r.deletedAt IS NULL")
    void softDeleteAllByRoomId(@Param("roomId") String roomId);
}
