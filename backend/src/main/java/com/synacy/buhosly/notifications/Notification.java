package com.synacy.buhosly.notifications;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "notifications")
public class Notification {

    public static final String TYPE_RECOGNITION_RECEIVED = "recognition_received";
    public static final String TYPE_GIVEABLE_REFRESHED = "giveable_refreshed";
    public static final String TYPE_GIVEABLE_EXPIRING = "giveable_expiring";

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 40)
    private String type;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String body;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String payload;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "read_at")
    private Instant readAt;

    protected Notification() {}

    public Notification(
            UUID id,
            UUID userId,
            String type,
            String title,
            String body,
            String payload,
            Instant createdAt) {
        this.id = id;
        this.userId = userId;
        this.type = type;
        this.title = title;
        this.body = body;
        this.payload = payload;
        this.createdAt = createdAt;
    }

    public UUID id() { return id; }
    public UUID userId() { return userId; }
    public String type() { return type; }
    public String title() { return title; }
    public String body() { return body; }
    public String payload() { return payload; }
    public Instant createdAt() { return createdAt; }
    public Instant readAt() { return readAt; }

    public void setReadAt(Instant readAt) { this.readAt = readAt; }
}
