package com.llmplatform.repository;

import com.llmplatform.entity.InferenceLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface InferenceLogRepository extends JpaRepository<InferenceLog, String> {

    List<InferenceLog> findTop50ByOrderByCreatedAtDesc();

    List<InferenceLog> findByProviderAndCreatedAtAfterOrderByCreatedAtDesc(
            String provider, LocalDateTime after);

    List<InferenceLog> findByCreatedAtAfterOrderByCreatedAtDesc(LocalDateTime after);

    @Query("SELECT COUNT(l) FROM InferenceLog l WHERE l.createdAt > :after")
    Long countByCreatedAtAfter(@Param("after") LocalDateTime after);

    @Query("SELECT AVG(l.latencyMs) FROM InferenceLog l WHERE l.createdAt > :after AND l.status = 'success'")
    Double avgLatencyAfter(@Param("after") LocalDateTime after);

    @Query("SELECT SUM(l.totalTokens) FROM InferenceLog l WHERE l.createdAt > :after")
    Long sumTokensAfter(@Param("after") LocalDateTime after);

    @Query("SELECT COUNT(l) FROM InferenceLog l WHERE l.status = 'error' AND l.createdAt > :after")
    Long countErrorsAfter(@Param("after") LocalDateTime after);

    @Query("SELECT l.provider, COUNT(l) FROM InferenceLog l WHERE l.createdAt > :after GROUP BY l.provider")
    List<Object[]> countByProviderAfter(@Param("after") LocalDateTime after);

    @Query(value =
            "SELECT HOUR(created_at) as hour, " +
            "       AVG(latency_ms)  as avg_lat, " +
            "       MAX(latency_ms)  as p95_lat " +
            "FROM inference_logs " +
            "WHERE created_at > :after " +
            "GROUP BY HOUR(created_at) ORDER BY hour",
            nativeQuery = true)
    List<Object[]> hourlyLatencyAfter(@Param("after") LocalDateTime after);

    @Query(value =
            "SELECT DATE(created_at) as day, " +
            "       SUM(input_tokens)  as input_tok, " +
            "       SUM(output_tokens) as output_tok " +
            "FROM inference_logs " +
            "WHERE created_at > :after " +
            "GROUP BY DATE(created_at) ORDER BY day",
            nativeQuery = true)
    List<Object[]> dailyTokensAfter(@Param("after") LocalDateTime after);

    @Query(value =
            "SELECT HOUR(created_at) as hour, COUNT(*) as total " +
            "FROM inference_logs " +
            "WHERE created_at > :after " +
            "GROUP BY HOUR(created_at) ORDER BY hour",
            nativeQuery = true)
    List<Object[]> hourlyThroughputAfter(@Param("after") LocalDateTime after);

    @Query(value =
            "SELECT HOUR(created_at) as hour, " +
            "       COUNT(*) as total, " +
            "       SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors " +
            "FROM inference_logs " +
            "WHERE created_at > :after " +
            "GROUP BY HOUR(created_at) ORDER BY hour",
            nativeQuery = true)
    List<Object[]> hourlyErrorRateAfter(@Param("after") LocalDateTime after);
}