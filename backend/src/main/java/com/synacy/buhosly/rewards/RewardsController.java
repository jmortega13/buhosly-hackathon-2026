package com.synacy.buhosly.rewards;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class RewardsController {

    private final RewardRepository rewards;

    public RewardsController(RewardRepository rewards) {
        this.rewards = rewards;
    }

    @GetMapping("/rewards")
    public List<Map<String, Object>> list() {
        return rewards.findAllByActiveTrue().stream()
                .map(r -> Map.<String, Object>of(
                        "id", r.id().toString(),
                        "name", r.name(),
                        "description", r.description(),
                        "costPoints", r.costPoints(),
                        "imageUrl", r.imageUrl() == null ? "" : r.imageUrl()))
                .toList();
    }
}
