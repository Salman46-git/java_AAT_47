package com.smartqueue.smartqueue.repository;

import com.smartqueue.smartqueue.entity.Token;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TokenRepository extends JpaRepository<Token, Long> {

    List<Token> findByQueueQueueIdAndStatusOrderByTokenNumberAsc(
            Long queueId,
            String status
    );
    List<Token> findByQueueQueueId(Long queueId);
    List<Token> findByStatus(String status);

}