package com.smartqueue.smartqueue.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smartqueue.smartqueue.entity.ServiceHistory;
import com.smartqueue.smartqueue.service.ServiceHistoryService;

@RestController
@RequestMapping("/service-history")
@CrossOrigin(origins = "*")
public class ServiceHistoryController {

    @Autowired
    private ServiceHistoryService serviceHistoryService;

    @PostMapping
    public ServiceHistory create(
            @RequestBody ServiceHistory serviceHistory){

        return serviceHistoryService.save(serviceHistory);
    }

    @GetMapping
    public List<ServiceHistory> getAll(){
        return serviceHistoryService.getAll();
    }
}