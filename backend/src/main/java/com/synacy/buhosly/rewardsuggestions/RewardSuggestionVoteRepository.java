package com.synacy.buhosly.rewardsuggestions;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RewardSuggestionVoteRepository
        extends JpaRepository<RewardSuggestionVote, RewardSuggestionVote.Pk> {

    long countBySuggestionId(UUID suggestionId);

    boolean existsBySuggestionIdAndUserId(UUID suggestionId, UUID userId);

    List<RewardSuggestionVote> findAllBySuggestionIdIn(Collection<UUID> suggestionIds);
}
