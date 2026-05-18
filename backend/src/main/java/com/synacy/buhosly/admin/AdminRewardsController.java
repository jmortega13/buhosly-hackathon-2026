package com.synacy.buhosly.admin;

import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.rewards.Reward;
import com.synacy.buhosly.rewards.RewardRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/rewards")
public class AdminRewardsController {

    private final RewardRepository rewards;

    public AdminRewardsController(RewardRepository rewards) {
        this.rewards = rewards;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return rewards.findAll().stream()
                .sorted(Comparator.comparing(Reward::name, String.CASE_INSENSITIVE_ORDER))
                .map(AdminRewardsController::toView)
                .toList();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody RewardRequest req) {
        validateImageUrl(req.imageUrl());
        var r = new Reward(
                UUID.randomUUID(),
                req.name().trim(),
                req.description() == null ? "" : req.description(),
                req.costPoints(),
                req.imageUrl() == null ? "" : req.imageUrl().trim(),
                true);
        rewards.save(r);
        return ResponseEntity.status(HttpStatus.CREATED).body(toView(r));
    }

    @PutMapping("/{id}")
    @Transactional
    public Map<String, Object> update(@PathVariable UUID id, @Valid @RequestBody UpdateRewardRequest req) {
        var existing = rewards.findById(id).orElseThrow(() -> ApiException.notFound("reward not found"));
        validateImageUrl(req.imageUrl());
        var updated = new Reward(
                existing.id(),
                req.name().trim(),
                req.description() == null ? "" : req.description(),
                req.costPoints(),
                req.imageUrl() == null ? "" : req.imageUrl().trim(),
                req.active() == null ? existing.active() : req.active());
        rewards.save(updated);
        return toView(updated);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        var existing = rewards.findById(id).orElseThrow(() -> ApiException.notFound("reward not found"));
        if (existing.active()) {
            var deactivated = new Reward(
                    existing.id(),
                    existing.name(),
                    existing.description(),
                    existing.costPoints(),
                    existing.imageUrl(),
                    false);
            rewards.save(deactivated);
        }
        return ResponseEntity.noContent().build();
    }

    private static void validateImageUrl(String url) {
        if (url == null || url.isBlank()) return;
        if (url.length() > 2048 || !url.startsWith("https://")) {
            throw ApiException.badRequest("imageUrl must be a valid https URL");
        }
    }

    private static Map<String, Object> toView(Reward r) {
        var m = new LinkedHashMap<String, Object>();
        m.put("id", r.id().toString());
        m.put("name", r.name());
        m.put("description", r.description());
        m.put("costPoints", r.costPoints());
        m.put("imageUrl", r.imageUrl() == null ? "" : r.imageUrl());
        m.put("active", r.active());
        return m;
    }

    public record RewardRequest(
            @NotBlank String name,
            String description,
            @NotNull @Positive Integer costPoints,
            String imageUrl) {}

    public record UpdateRewardRequest(
            @NotBlank String name,
            String description,
            @NotNull @Positive Integer costPoints,
            String imageUrl,
            Boolean active) {}
}
