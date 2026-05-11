package com.aqua.util;

import jakarta.mail.*;
import jakarta.mail.internet.*;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Properties;

/**
 * Gmail SMTP email service for sending bills with PDF attachments.
 * Config is stored in email.properties next to the database file.
 */
public class EmailService {

    private static final String DB_DIR = System.getProperty("user.home") + File.separator + ".aqua_management";
    private static final String CONFIG_FILE = DB_DIR + File.separator + "email.properties";

    private String senderEmail;
    private String senderPassword; // Gmail App Password
    private String senderName;
    private String upiId;

    public EmailService() {
        loadConfig();
    }

    /**
     * Check if email is configured (has sender email and password).
     */
    public boolean isConfigured() {
        return senderEmail != null && !senderEmail.isEmpty()
                && senderPassword != null && !senderPassword.isEmpty();
    }

    /**
     * Send an email with a PDF attachment.
     */
    public void sendEmail(String toEmail, String subject, String bodyText, File pdfAttachment) throws MessagingException {
        if (!isConfigured()) {
            throw new MessagingException("Email not configured. Go to settings or configure email.properties.");
        }

        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.host", "smtp.gmail.com");
        props.put("mail.smtp.port", "465");
        props.put("mail.smtp.ssl.enable", "true");
        props.put("mail.smtp.ssl.trust", "smtp.gmail.com");
        props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
        props.put("mail.smtp.socketFactory.port", "465");

        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(senderEmail, senderPassword);
            }
        });

        Message message = new MimeMessage(session);
        try {
            message.setFrom(new InternetAddress(senderEmail, senderName != null ? senderName : "Bhairavnath Cool Aqua"));
        } catch (java.io.UnsupportedEncodingException ue) {
            message.setFrom(new InternetAddress(senderEmail));
        }
        message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(toEmail));
        message.setSubject(subject);

        // Body part
        MimeBodyPart textPart = new MimeBodyPart();
        textPart.setContent(bodyText, "text/html; charset=UTF-8");

        // Attachment part
        Multipart multipart = new MimeMultipart();
        multipart.addBodyPart(textPart);

        if (pdfAttachment != null && pdfAttachment.exists()) {
            MimeBodyPart attachPart = new MimeBodyPart();
            try {
                attachPart.attachFile(pdfAttachment);
                attachPart.setFileName(pdfAttachment.getName());
                multipart.addBodyPart(attachPart);
            } catch (IOException e) {
                System.err.println("Failed to attach PDF: " + e.getMessage());
            }
        }

        message.setContent(multipart);
        Transport.send(message);
    }

    /**
     * Save email configuration.
     */
    public void saveConfig(String email, String password, String name, String upiId) {
        Properties props = new Properties();
        props.setProperty("sender.email", email);
        props.setProperty("sender.password", password);
        props.setProperty("sender.name", name != null ? name : "Bhairavnath Cool Aqua");
        props.setProperty("upi.id", upiId != null ? upiId : "");

        try (FileOutputStream fos = new FileOutputStream(CONFIG_FILE)) {
            props.store(fos, "Aqua Management System - Email Configuration");
        } catch (IOException e) {
            System.err.println("Failed to save email config: " + e.getMessage());
        }

        this.senderEmail = email;
        this.senderPassword = password;
        this.senderName = name;
        this.upiId = upiId;
    }

    private void loadConfig() {
        File configFile = new File(CONFIG_FILE);
        if (!configFile.exists()) {
            System.out.println("Email config not found. Email sending disabled.");
            return;
        }

        Properties props = new Properties();
        try (FileInputStream fis = new FileInputStream(configFile)) {
            props.load(fis);
            senderEmail = props.getProperty("sender.email", "");
            senderPassword = props.getProperty("sender.password", "");
            senderName = props.getProperty("sender.name", "Bhairavnath Cool Aqua");
            upiId = props.getProperty("upi.id", "");
            if (!senderEmail.isEmpty()) {
                System.out.println("Email configured: " + senderEmail);
            }
        } catch (IOException e) {
            System.err.println("Failed to load email config: " + e.getMessage());
        }
    }

    public String getSenderEmail() { return senderEmail; }
    public String getSenderName() { return senderName; }
    public String getUpiId() { return upiId; }

    /**
     * Automatically send a backup of the database to the configured email.
     */
    public void sendBackupEmail(File dbFile) {
        if (!isConfigured() || !dbFile.exists()) return;
        try {
            String subject = "💾 Auto Backup: Aqua Management Database";
            String body = "<h3>Database Backup</h3><p>Please find your automated database backup attached.</p><p>Time: " + new java.util.Date() + "</p>";
            // Send the email to themselves (senderEmail)
            sendEmail(senderEmail, subject, body, dbFile);
            System.out.println("Auto backup email sent successfully to " + senderEmail);
        } catch (Exception e) {
            System.err.println("Auto backup email failed: " + e.getMessage());
        }
    }
}
