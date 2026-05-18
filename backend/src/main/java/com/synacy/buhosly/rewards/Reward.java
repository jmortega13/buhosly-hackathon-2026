package com.synacy.buhosly.rewards;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "rewards")
public class Reward {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "cost_points", nullable = false)
    private int costPoints;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(nullable = false)
    private boolean active;

    protected Reward() {}

    public Reward(UUID id, String name, String description, int costPoints, String imageUrl, boolean active) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.costPoints = costPoints;
        this.imageUrl = imageUrl;
        this.active = active;
    }

    public UUID id() {
        return id;
    }

    public String name() {
        return name;
    }

    public String description() {
        return description;
    }

    public int costPoints() {
        return costPoints;
    }

    public String imageUrl() {
        return imageUrl;
    }

    public boolean active() {
        return active;
    }
}
