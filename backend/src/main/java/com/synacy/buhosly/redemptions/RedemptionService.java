package com.synacy.buhosly.redemptions;

import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.rewards.Reward;
import com.synacy.buhosly.rewards.RewardRepository;
import com.synacy.buhosly.users.User;
import com.synacy.buhosly.users.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RedemptionService {

    private static final Logger log = LoggerFactory.getLogger(RedemptionService.class);

    private final UserRepository users;
    private final RewardRepository rewards;
    private final RedemptionRepository redemptions;

    public RedemptionService(
            UserRepository users, RewardRepository rewards, RedemptionRepository redemptions) {
        this.users = users;
        this.rewards = rewards;
        this.redemptions = redemptions;
    }

    @Transactional
    public Redemption redeem(UUID userId, UUID rewardId) {
        Reward reward = rewards.findById(rewardId)
                .filter(Reward::active)
                .orElseThrow(() -> ApiException.notFound("reward not available"));
        User user = users.findById(userId).orElseThrow(() -> ApiException.unauthorized("user not found"));
        if (user.earnedBalance() < reward.costPoints()) {
            throw ApiException.badRequest("insufficient earned balance");
        }
        var redemption = new Redemption(
                UUID.randomUUID(),
                user.id(),
                reward.id(),
                reward.costPoints(),
                Instant.now(),
                Redemption.STATUS_PENDING);
        try {
            redemptions.save(redemption);
            user.setEarnedBalance(user.earnedBalance() - reward.costPoints());
            users.save(user);
        } catch (RuntimeException e) {
            log.error(
                    "Redemption failed: userId={}, rewardId={}, redemptionId={}, cost={}",
                    userId, rewardId, redemption.id(), reward.costPoints(), e);
            throw e;
        }
        return redemption;
    }

    public List<Redemption> historyFor(UUID userId) {
        return redemptions.findAllByUserIdOrderByCreatedAtDesc(userId);
    }
}
