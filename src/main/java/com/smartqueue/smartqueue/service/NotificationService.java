package com.smartqueue.smartqueue.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.smartqueue.smartqueue.entity.Notification;
import com.smartqueue.smartqueue.repository.NotificationRepository;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    public Notification saveNotification(Notification notification){
        return notificationRepository.save(notification);
    }

    public List<Notification> getAllNotifications(){
        return notificationRepository.findAll();
    }
}