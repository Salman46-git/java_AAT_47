package com.smartqueue.smartqueue.controller;

import com.smartqueue.smartqueue.entity.Queue;
import com.smartqueue.smartqueue.service.QueueService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/queues")
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