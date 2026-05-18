package com.synacy.buhosly.recognitions;

import com.synacy.buhosly.common.StringListConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "recognitions")
public class Recognition {

    @Id
    private UUID id;

    @Column(name = "giver_id", nullable = false)
    private UUID giverId;

    @Column(name = "recipient_id", nullable = false)
    private UUID recipientId;

    @Column(nullable = false)
    private int amount;

    @Column(nullable = false, columnDefinition = "text")
    private String message;

    @Convert(converter = StringListConverter.class)
    @Column(nullable = false, length = 512)
    private List<String> hashtags;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "gif_url", length = 2048)
    private String gifUrl;

    protected Recognition() {}

    public Recognition(
            UUID id,
            UUID giverId,
            UUID recipientId,
            int amount,
            String message,
            List<String> hashtags,
            Instant createdAt,
            String gifUrl) {
        this.id = id;
        this.giverId = giverId;
        this.recipientId = recipientId;
        this.amount = amount;
        this.message = message;
        this.hashtags = hashtags;
        this.createdAt = createdAt;
        this.gifUrl = gifUrl;
    }

    public UUID id() {
        return id;
    }

    public UUID giverId() {
        return giverId;
    }

    public UUID recipientId() {
        return recipientId;
    }

    public int amount() {
        return amount;
    }

    public String message() {
        return message;
    }

    public List<String> hashtags() {
        return hashtags;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public String gifUrl() {
        return gifUrl;
    }
}
