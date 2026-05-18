package com.synacy.buhosly.recognitions;

import com.synacy.buhosly.auth.CurrentUser;
import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.config.AppProperties;
import com.synacy.buhosly.users.User;
import com.synacy.buhosly.users.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class RecognitionController {

    private final RecognitionService service;
    private final UserRepository users;
    private final AppProperties props;

    public RecognitionController(RecognitionService service, UserRepository users, AppProperties props) {
        this.service = service;
        this.users = users;
        this.props = props;
    }

    @PostMapping("/recognitions")
    public ResponseEntity<List<Map<String, Object>>> create(@Valid @RequestBody GiveRequest req) {
        var giverId = UUID.fromString(CurrentUser.requireId());
        List<UUID> recipientIds;
        try {
            recipientIds = req.recipientIds().stream().map(UUID::fromString).toList();
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("recipient ids must be valid UUIDs");
        }
        var created = service.give(giverId, recipientIds, req.amount(), req.message(), req.hashtags());

        var ids = new HashSet<UUID>();
        for (var r : created) {
            ids.add(r.giverId());
            ids.add(r.recipientId());
        }
        var byId = loadUsers(ids);
        var body = created.stream().map(r -> toFeedItem(r, byId)).toList();
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @GetMapping("/feed")
    public Map<String, Object> feed(
            @RequestParam(defaultValue = "0") int page, @RequestParam(required = false) Integer size) {
        if (page < 0) throw ApiException.badRequest("page must be >= 0");
        int defaultSize = props.feed().defaultPageSize();
        int maxSize = props.feed().maxPageSize();
        int pageSize = (size == null) ? defaultSize : Math.min(Math.max(size, 1), maxSize);

        var dbPage = service.page(page, pageSize);
        var items = dbPage.getContent();
        var ids = new HashSet<UUID>();
        for (var r : items) {
            ids.add(r.giverId());
            ids.add(r.recipientId());
        }
        var byId = loadUsers(ids);
        var view = items.stream().map(r -> toFeedItem(r, byId)).toList();
        return Map.of(
                "items", view,
                "page", page,
                "size", pageSize,
                "hasMore", dbPage.hasNext());
    }

    private Map<UUID, User> loadUsers(Set<UUID> ids) {
        var byId = new HashMap<UUID, User>();
        users.findAllById(ids).forEach(u -> byId.put(u.id(), u));
        return byId;
    }

    private static Map<String, Object> toFeedItem(Recognition r, Map<UUID, User> byId) {
        return Map.of(
                "giver", userBrief(r.giverId(), byId.get(r.giverId())),
                "recipient", userBrief(r.recipientId(), byId.get(r.recipientId())),
                "amount", r.amount(),
                "message", r.message(),
                "hashtags", r.hashtags(),
                "createdAt", r.createdAt().toString());
    }

    private static Map<String, Object> userBrief(UUID id, User user) {
        return Map.of("id", id.toString(), "name", user == null ? "(unknown)" : user.name());
    }

    public record GiveRequest(
            @NotEmpty List<String> recipientIds,
            @NotNull Integer amount,
            String message,
            @NotEmpty List<String> hashtags) {}
}
