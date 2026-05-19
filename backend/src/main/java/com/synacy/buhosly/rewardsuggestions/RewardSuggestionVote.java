package com.synacy.buhosly.rewardsuggestions;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "reward_suggestion_votes")
@IdClass(RewardSuggestionVote.Pk.class)
public class RewardSuggestionVote {

    @Id
    @Column(name = "suggestion_id")
    private UUID suggestionId;

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "voted_at", nullable = false)
    private Instant votedAt;

    protected RewardSuggestionVote() {}

    public RewardSuggestionVote(UUID suggestionId, UUID userId, Instant votedAt) {
        this.suggestionId = suggestionId;
        this.userId = userId;
        this.votedAt = votedAt;
    }

    public UUID suggestionId() { return suggestionId; }
    public UUID userId() { return userId; }
    public Instant votedAt() { return votedAt; }

    public static class Pk implements Serializable {
        private UUID suggestionId;
        private UUID userId;

        public Pk() {}

        public Pk(UUID suggestionId, UUID userId) {
            this.suggestionId = suggestionId;
            this.userId = userId;
        }

        public UUID getSuggestionId() { return suggestionId; }
        public void setSuggestionId(UUID suggestionId) { this.suggestionId = suggestionId; }
        public UUID getUserId() { return userId; }
        public void setUserId(UUID userId) { this.userId = userId; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Pk other)) return false;
            return Objects.equals(suggestionId, other.suggestionId)
                    && Objects.equals(userId, other.userId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(suggestionId, userId);
        }
    }
}
