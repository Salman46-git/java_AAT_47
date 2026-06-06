package com.smartqueue.smartqueue.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.smartqueue.smartqueue.entity.ServiceHistory;
import com.smartqueue.smartqueue.repository.ServiceHistoryRepository;

@Service
public class ServiceHistoryService {

    @Autowired
    private ServiceHistoryRepository repository;

    public ServiceHistory save(ServiceHistory serviceHistory){
        return repository.save(serviceHistory);
    }

    public List<ServiceHistory> getAll(){
        return repository.findAll();
    }
}