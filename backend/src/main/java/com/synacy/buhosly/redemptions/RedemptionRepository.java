package com.synacy.buhosly.redemptions;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RedemptionRepository extends JpaRepository<Redemption, UUID> {

    List<Redemption> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
}
