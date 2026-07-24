package com.participa.repository;

import com.participa.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, String> {
    Optional<Room> findByCode(String code);
    Optional<Room> findByCodeAndIsActiveTrue(String code);
    boolean existsByCode(String code);
}
