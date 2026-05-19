package com.synacy.buhosly.notifications;

import com.synacy.buhosly.config.AppProperties;
import com.synacy.buhosly.users.User;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final AppProperties props;
    private final String smtpHost;

    public EmailService(
            JavaMailSender mailSender,
            AppProperties props,
            @Value("${spring.mail.host:}") String smtpHost) {
        this.mailSender = mailSender;
        this.props = props;
        this.smtpHost = smtpHost;
    }

    @PostConstruct
    void init() {
        if (smtpHost == null || smtpHost.isBlank()) {
            log.warn(
                    "SMTP_HOST not configured. Notification emails will be silently skipped — "
                            + "in-app notifications still fire normally.");
        } else {
            log.info("Email notifications enabled via SMTP host {}", smtpHost);
        }
    }

    /**
     * Send a notification email asynchronously so the API call that triggered
     * the underlying notification doesn't block on SMTP latency. Silently
     * no-ops when SMTP isn't configured. Failures (network, bad credentials,
     * rejected by relay) are logged at WARN but never propagate — the in-app
     * notification stays in place regardless.
     */
    @Async
    public void send(Notification notification, User recipient) {
        if (smtpHost == null || smtpHost.isBlank()) return;
        if (recipient == null || recipient.email() == null || recipient.email().isBlank()) return;
        try {
            var msg = new SimpleMailMessage();
            msg.setFrom(props.mail().from());
            msg.setTo(recipient.email());
            msg.setSubject("[buhosly] " + notification.title());
            msg.setText(buildBody(notification));
            mailSender.send(msg);
        } catch (MailException e) {
            log.warn(
                    "Failed to send notification email to {} (notification {}): {}",
                    recipient.email(),
                    notification.id(),
                    e.getMessage());
        }
    }

    private String buildBody(Notification n) {
        var base = props.mail().webBaseUrl();
        var deepLink = switch (n.type()) {
            case Notification.TYPE_RECOGNITION_RECEIVED -> base + "/feed";
            case Notification.TYPE_GIVEABLE_REFRESHED, Notification.TYPE_GIVEABLE_EXPIRING -> base + "/feed";
            default -> base;
        };
        return n.body()
                + "\n\nOpen buhosly: " + deepLink
                + "\n\n— buhosly · automated message, no need to reply";
    }
}
