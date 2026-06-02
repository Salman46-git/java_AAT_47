package com.smartqueue.smartqueue.service;

import com.smartqueue.smartqueue.entity.Token;
import com.smartqueue.smartqueue.repository.TokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TokenService {

    @Autowired
    private TokenRepository tokenRepository;

    public Token saveToken(Token token) {
        return tokenRepository.save(token);
    }

    public List<Token> getAllTokens() {
        return tokenRepository.findAll();
    }

    public Token getTokenById(Long id) {
        return tokenRepository.findById(id).orElse(null);
    }

    public Token updateStatus(Long id, String status) {

        Token token = tokenRepository.findById(id).orElse(null);

        if(token != null){
            token.setStatus(status);
            return tokenRepository.save(token);
        }

        return null;
    }
    public void deleteToken(Long id){
        tokenRepository.deleteById(id);
    }
    public Token callNextToken(Long queueId) {

        List<Token> waitingTokens =
                tokenRepository.findByQueueQueueIdAndStatusOrderByTokenNumberAsc(
                        queueId,
                        "WAITING"
                );

        if(waitingTokens.isEmpty()) {
            return null;
        }

        Token nextToken = waitingTokens.get(0);

        nextToken.setStatus("SERVING");

        return tokenRepository.save(nextToken);
    }
    public Token completeToken(Long tokenId) {

        Token token = tokenRepository.findById(tokenId).orElse(null);

        if(token == null){
            return null;
        }

        token.setStatus("COMPLETED");

        return tokenRepository.save(token);
    }
    public List<Token> getTokensByQueue(Long queueId) {
        return tokenRepository.findByQueueQueueId(queueId);
    }
    public List<Token> getTokensByStatus(String status) {
        return tokenRepository.findByStatus(status);
    }
}