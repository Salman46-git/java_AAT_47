package com.smartqueue.smartqueue.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smartqueue.smartqueue.entity.Token;
import com.smartqueue.smartqueue.service.TokenService;

@RestController
@RequestMapping("/tokens")
@CrossOrigin(origins = "*")
public class TokenController {

    @Autowired
    private TokenService tokenService;

    @PostMapping
    public Token createToken(@RequestBody Token token) {
        return tokenService.saveToken(token);
    }

    @GetMapping
    public List<Token> getAllTokens() {
        return tokenService.getAllTokens();
    }
    @GetMapping("/{id}")
    public Token getTokenById(@PathVariable Long id) {
        return tokenService.getTokenById(id);
    }
    @PutMapping("/{id}/status")
    public Token updateStatus(@PathVariable Long id,
                              @RequestParam String status) {

        return tokenService.updateStatus(id, status);
    }
    @DeleteMapping("/{id}")
    public void deleteToken(@PathVariable Long id){
        tokenService.deleteToken(id);
    }
    @PutMapping("/next/{queueId}")
    public Token callNextToken(@PathVariable Long queueId) {

        return tokenService.callNextToken(queueId);
    }
    @PutMapping("/complete/{tokenId}")
    public Token completeToken(@PathVariable Long tokenId) {
        return tokenService.completeToken(tokenId);
    }
    @GetMapping("/queue/{queueId}")
    public List<Token> getTokensByQueue(@PathVariable Long queueId) {
        return tokenService.getTokensByQueue(queueId);
    }
    @GetMapping("/status/{status}")
    public List<Token> getTokensByStatus(@PathVariable String status) {
        return tokenService.getTokensByStatus(status);
    }
    @GetMapping("/user/{userId}")
    public List<Token> getTokensByUser(@PathVariable Integer userId) {
        return tokenService.getTokensByUser(userId);
    }
}