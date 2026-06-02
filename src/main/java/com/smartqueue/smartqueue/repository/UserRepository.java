package com.smartqueue.smartqueue.repository;

import com.smartqueue.smartqueue.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Integer> {
}