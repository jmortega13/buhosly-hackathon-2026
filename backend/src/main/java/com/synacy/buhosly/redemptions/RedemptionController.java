package com.synacy.buhosly.redemptions;

import com.synacy.buhosly.auth.CurrentUser;
import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.rewards.Reward;
import com.synacy.buhosly.rewards.RewardRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class RedemptionController {

    private final RedemptionService service;
    private final RewardRepository rewards;

    public RedemptionController(RedemptionService service, RewardRepository rewards) {
        this.service = service;
        this.rewards = rewards;
    }

    @PostMapping("/redemptions")
    public ResponseEntity<Map<String, Object>> redeem(@Valid @RequestBody RedeemRequest req) {
        var userId = UUID.fromString(CurrentUser.requireId());
        UUID rewardId;
        try {
            rewardId = UUID.fromString(req.rewardId());
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("rewardId must be a valid UUID");
        }
        var redemption = service.redeem(userId, rewardId);
        return ResponseEntity.status(HttpStatus.CREATED).body(toView(redemption));
    }

    @GetMapping("/redemptions/me")
    public List<Map<String, Object>> history() {
        var userId = UUID.fromString(CurrentUser.requireId());
        return service.historyFor(userId).stream().map(this::toView).toList();
    }

    private Map<String, Object> toView(Redemption r) {
        var rewardName = rewards.findById(r.rewardId()).map(Reward::name).orElse("(unknown)");
        return Map.of(
                "id", r.id().toString(),
                "rewardId", r.rewardId().toString(),
                "rewardName", rewardName,
                "costPoints", r.costPoints(),
                "createdAt", r.createdAt().toString(),
                "status", r.status());
    }

    public record RedeemRequest(@NotBlank String rewardId) {}
}
