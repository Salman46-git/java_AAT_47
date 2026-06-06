package com.smartqueue.smartqueue.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smartqueue.smartqueue.entity.Notification;
import com.smartqueue.smartqueue.service.NotificationService;

@RestController
@RequestMapping("/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @PostMapping
    public Notification createNotification(
            @RequestBody Notification notification){

        return notificationService.saveNotification(notification);
    }

    @GetMapping
    public List<Notification> getNotifications(){
        return notificationService.getAllNotifications();
    }
}