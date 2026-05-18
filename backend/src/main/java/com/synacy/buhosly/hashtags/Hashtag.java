package com.synacy.buhosly.hashtags;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "hashtags")
public class Hashtag {

    @Id
    private String tag;

    @Column(name = "usage_count", nullable = false)
    private int usageCount;

    @Column(name = "last_used_at", nullable = false)
    private Instant lastUsedAt;

    protected Hashtag() {}

    public Hashtag(String tag, int usageCount, Instant lastUsedAt) {
        this.tag = tag;
        this.usageCount = usageCount;
        this.lastUsedAt = lastUsedAt;
    }

    public String tag() {
        return tag;
    }

    public int usageCount() {
        return usageCount;
    }

    public Instant lastUsedAt() {
        return lastUsedAt;
    }
}
