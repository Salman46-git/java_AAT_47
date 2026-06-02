package com.smartqueue.smartqueue.service;

import com.smartqueue.smartqueue.entity.Queue;
import com.smartqueue.smartqueue.repository.QueueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class QueueService {

    @Autowired
    private QueueRepository queueRepository;

    public Queue saveQueue(Queue queue) {
        return queueRepository.save(queue);
    }

    public List<Queue> getAllQueues() {
        return queueRepository.findAll();
    }

    public Queue getQueueById(Integer id) {
        return queueRepository.findById(id).orElse(null);
    }
}
