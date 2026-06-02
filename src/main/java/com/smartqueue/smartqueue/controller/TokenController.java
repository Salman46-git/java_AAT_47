package com.smartqueue.smartqueue.controller;

import com.smartqueue.smartqueue.entity.Token;
import com.smartqueue.smartqueue.service.TokenService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tokens")
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
}