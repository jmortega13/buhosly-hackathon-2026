package com.synacy.buhosly.rewardsuggestions;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RewardSuggestionRepository extends JpaRepository<RewardSuggestion, UUID> {

    List<RewardSuggestion> findAllByStatusOrderByCreatedAtDesc(String status);

    List<RewardSuggestion> findAllByOrderByCreatedAtDesc();
}
