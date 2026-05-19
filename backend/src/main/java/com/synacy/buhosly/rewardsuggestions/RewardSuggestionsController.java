package com.synacy.buhosly.rewardsuggestions;

import com.synacy.buhosly.auth.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/suggestions")
public class RewardSuggestionsController {

    private final RewardSuggestionService service;

    public RewardSuggestionsController(RewardSuggestionService service) {
        this.service = service;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        var me = UUID.fromString(CurrentUser.requireId());
        return service.listOpen(me);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody CreateRequest req) {
        var me = UUID.fromString(CurrentUser.requireId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(me, req.name(), req.description(), req.imageUrl()));
    }

    @PostMapping("/{id}/vote")
    public Map<String, Object> vote(@PathVariable UUID id) {
        var me = UUID.fromString(CurrentUser.requireId());
        return service.toggleVote(id, me);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        var me = UUID.fromString(CurrentUser.requireId());
        service.delete(id, me);
        return ResponseEntity.noContent().build();
    }

    public record CreateRequest(
            @NotBlank @Size(max = 100) String name,
            String description,
            String imageUrl) {}
}
