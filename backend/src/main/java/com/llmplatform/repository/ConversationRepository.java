package com.llmplatform.repository;


import com.llmplatform.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, String> {
    List<Conversation> findAllByOrderByUpdatedAtDesc();

    @Query("SELECT c FROM Conversation c WHERE c.sessionId = :sessionId ORDER BY c.updatedAt DESC")
    List<Conversation> findBySessionIdOrderByUpdatedAtDesc(@Param("sessionId") String sessionId);
}