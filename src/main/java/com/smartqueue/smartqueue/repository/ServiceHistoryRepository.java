package com.smartqueue.smartqueue.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smartqueue.smartqueue.entity.ServiceHistory;

public interface ServiceHistoryRepository
        extends JpaRepository<ServiceHistory,Integer> {
}