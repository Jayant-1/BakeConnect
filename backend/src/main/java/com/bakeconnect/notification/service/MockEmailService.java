package com.bakeconnect.notification.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class MockEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(MockEmailService.class);

    @Override
    public void sendEmail(String recipientEmail, String subject, String content) {
        log.info("[MOCK EMAIL DISPATCH] To: {} | Subject: '{}' | Content: {}",
                recipientEmail, subject, content);
    }
}
