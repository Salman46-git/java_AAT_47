package com.smartqueue.smartqueue.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smartqueue.smartqueue.entity.Notification;

public interface NotificationRepository
        extends JpaRepository<Notification,Integer> {
}