package com.smartqueue.smartqueue.service;

import com.smartqueue.smartqueue.entity.User;
import com.smartqueue.smartqueue.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User saveUser(User user) {
        if (user.getRole() != null && user.getRole().equalsIgnoreCase("Admin") && 
            (user.getEmail() == null || !user.getEmail().equalsIgnoreCase("admin@smartqueue.com"))) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, 
                "Registration Denied: Admin role is locked to admin@smartqueue.com."
            );
        }
        return userRepository.save(user);
    }
}