package com.bakeconnect.notification.service;

public interface EmailService {

    void sendEmail(String recipientEmail, String subject, String content);
}
