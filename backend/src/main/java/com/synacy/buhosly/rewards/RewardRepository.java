package com.synacy.buhosly.rewards;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RewardRepository extends JpaRepository<Reward, UUID> {

    List<Reward> findAllByActiveTrue();
}
