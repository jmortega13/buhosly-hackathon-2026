package com.synacy.buhosly.redemptions;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "redemptions")
public class Redemption {

    public static final String STATUS_PENDING = "pending";

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "reward_id", nullable = false)
    private UUID rewardId;

    @Column(name = "cost_points", nullable = false)
    private int costPoints;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(nullable = false, length = 20)
    private String status;

    protected Redemption() {}

    public Redemption(
            UUID id, UUID userId, UUID rewardId, int costPoints, Instant createdAt, String status) {
        this.id = id;
        this.userId = userId;
        this.rewardId = rewardId;
        this.costPoints = costPoints;
        this.createdAt = createdAt;
        this.status = status;
    }

    public UUID id() {
        return id;
    }

    public UUID userId() {
        return userId;
    }

    public UUID rewardId() {
        return rewardId;
    }

    public int costPoints() {
        return costPoints;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public String status() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public static final String STATUS_FULFILLED = "fulfilled";
    public static final String STATUS_CANCELLED = "cancelled";
}
