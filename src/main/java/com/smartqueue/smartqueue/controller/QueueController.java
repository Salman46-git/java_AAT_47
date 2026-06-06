package com.smartqueue.smartqueue.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smartqueue.smartqueue.entity.Queue;
import com.smartqueue.smartqueue.service.QueueService;

@RestController
@RequestMapping("/queues")
@CrossOrigin(origins = "*")
public class QueueController {

    @Autowired
    private QueueService queueService;

    @PostMapping
    public Queue createQueue(@RequestBody Queue queue) {
        return queueService.saveQueue(queue);
    }

    @GetMapping
    public List<Queue> getQueues() {
        return queueService.getAllQueues();
    }

    @GetMapping("/{id}")
    public Queue getQueueById(@PathVariable Integer id) {
        return queueService.getQueueById(id);
    }
}