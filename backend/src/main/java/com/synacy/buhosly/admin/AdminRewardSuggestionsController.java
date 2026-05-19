package com.synacy.buhosly.admin;

import com.synacy.buhosly.auth.CurrentUser;
import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.rewards.Reward;
import com.synacy.buhosly.rewards.RewardRepository;
import com.synacy.buhosly.rewardsuggestions.RewardSuggestion;
import com.synacy.buhosly.rewardsuggestions.RewardSuggestionRepository;
import com.synacy.buhosly.rewardsuggestions.RewardSuggestionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/suggestions")
public class AdminRewardSuggestionsController {

    private final RewardSuggestionRepository suggestions;
    private final RewardSuggestionService service;
    private final RewardRepository rewards;

    public AdminRewardSuggestionsController(
            RewardSuggestionRepository suggestions,
            RewardSuggestionService service,
            RewardRepository rewards) {
        this.suggestions = suggestions;
        this.service = service;
        this.rewards = rewards;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        var me = UUID.fromString(CurrentUser.requireId());
        return service.listAll(me);
    }

    @PostMapping("/{id}/promote")
    @Transactional
    public ResponseEntity<Map<String, Object>> promote(
            @PathVariable UUID id, @Valid @RequestBody PromoteRequest req) {
        if (req.costPoints() == null || req.costPoints() <= 0) {
            throw ApiException.badRequest("costPoints must be a positive integer");
        }
        var s = suggestions.findById(id)
                .orElseThrow(() -> ApiException.notFound("suggestion not found"));
        if (!RewardSuggestion.STATUS_OPEN.equals(s.status())) {
            throw new ApiException(
                    org.springframework.http.HttpStatus.CONFLICT, "suggestion is no longer open");
        }
        var imageUrl = RewardSuggestionService.normaliseImageUrl(req.imageUrl());
        if (imageUrl == null) imageUrl = s.imageUrl();
        var reward = new Reward(
                UUID.randomUUID(),
                s.name(),
                s.description(),
                req.costPoints(),
                imageUrl == null ? "" : imageUrl,
                true);
        rewards.save(reward);
        s.setStatus(RewardSuggestion.STATUS_PROMOTED);
        s.setPromotedRewardId(reward.id());
        suggestions.save(s);

        var body = new LinkedHashMap<String, Object>();
        body.put("id", reward.id().toString());
        body.put("name", reward.name());
        body.put("description", reward.description());
        body.put("costPoints", reward.costPoints());
        body.put("imageUrl", reward.imageUrl() == null ? "" : reward.imageUrl());
        body.put("active", reward.active());
        body.put("promotedFromSuggestionId", s.id().toString());
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @PostMapping("/{id}/dismiss")
    @Transactional
    public Map<String, Object> dismiss(@PathVariable UUID id) {
        var me = UUID.fromString(CurrentUser.requireId());
        var s = suggestions.findById(id)
                .orElseThrow(() -> ApiException.notFound("suggestion not found"));
        if (!RewardSuggestion.STATUS_OPEN.equals(s.status())) {
            throw new ApiException(
                    org.springframework.http.HttpStatus.CONFLICT, "suggestion is no longer open");
        }
        s.setStatus(RewardSuggestion.STATUS_DISMISSED);
        suggestions.save(s);
        // Reuse the service's view helper so the response shape matches list output.
        return service.listAll(me).stream()
                .filter(m -> id.toString().equals(m.get("id")))
                .findFirst()
                .orElseThrow();
    }

    public record PromoteRequest(@NotNull @Positive Integer costPoints, String imageUrl) {}
}
