package com.synacy.buhosly.rewardsuggestions;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reward_suggestions")
public class RewardSuggestion {

    public static final String STATUS_OPEN = "open";
    public static final String STATUS_PROMOTED = "promoted";
    public static final String STATUS_DISMISSED = "dismissed";

    @Id
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "image_url", length = 2048)
    private String imageUrl;

    @Column(name = "suggested_by_user_id", nullable = false)
    private UUID suggestedByUserId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "promoted_reward_id")
    private UUID promotedRewardId;

    protected RewardSuggestion() {}

    public RewardSuggestion(
            UUID id,
            String name,
            String description,
            String imageUrl,
            UUID suggestedByUserId,
            Instant createdAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.imageUrl = imageUrl;
        this.suggestedByUserId = suggestedByUserId;
        this.createdAt = createdAt;
        this.status = STATUS_OPEN;
    }

    public UUID id() { return id; }
    public String name() { return name; }
    public String description() { return description; }
    public String imageUrl() { return imageUrl; }
    public UUID suggestedByUserId() { return suggestedByUserId; }
    public Instant createdAt() { return createdAt; }
    public String status() { return status; }
    public UUID promotedRewardId() { return promotedRewardId; }

    public void setStatus(String status) { this.status = status; }
    public void setPromotedRewardId(UUID id) { this.promotedRewardId = id; }
}
