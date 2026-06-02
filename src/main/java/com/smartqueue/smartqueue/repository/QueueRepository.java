package com.smartqueue.smartqueue.repository;

import com.smartqueue.smartqueue.entity.Queue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QueueRepository extends JpaRepository<Queue, Integer> {

}
