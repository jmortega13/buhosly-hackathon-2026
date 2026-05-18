package com.synacy.buhosly.recognitions;

import com.synacy.buhosly.auth.CurrentUser;
import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.config.AppProperties;
import com.synacy.buhosly.users.User;
import com.synacy.buhosly.users.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
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
        var created = service.give(
                giverId, recipientIds, req.amount(), req.message(), req.hashtags(), req.gifUrl());

        var ids = new HashSet<UUID>();
        for (var r : created) {
            ids.add(r.giverId());
            ids.add(r.recipientId());
        }
        var byId = loadUsers(ids);
        return ResponseEntity.status(HttpStatus.CREATED).body(groupAndMap(created, byId));
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
        var view = groupAndMap(items, byId);
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

    /**
     * Group adjacent recognition rows that share the same `(giverId, createdAt)` —
     * i.e. all rows produced by one logical multi-recipient give — into a single
     * feed item with a `recipients` array. The DB query is ordered by
     * `created_at DESC, giver_id ASC` so a group's rows are guaranteed to be
     * contiguous in the result list.
     */
    private static List<Map<String, Object>> groupAndMap(List<Recognition> rows, Map<UUID, User> byId) {
        var groups = new LinkedHashMap<String, List<Recognition>>();
        for (var r : rows) {
            var key = r.giverId() + "|" + r.createdAt().toString();
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(r);
        }
        var out = new ArrayList<Map<String, Object>>(groups.size());
        for (var group : groups.values()) {
            out.add(toFeedItem(group, byId));
        }
        return out;
    }

    private static Map<String, Object> toFeedItem(List<Recognition> group, Map<UUID, User> byId) {
        var first = group.get(0);
        var recipients = group.stream()
                .map(r -> userBrief(r.recipientId(), byId.get(r.recipientId())))
                .toList();
        var item = new LinkedHashMap<String, Object>();
        item.put("giver", userBrief(first.giverId(), byId.get(first.giverId())));
        item.put("recipients", recipients);
        item.put("amount", first.amount());
        item.put("totalAmount", first.amount() * group.size());
        item.put("message", first.message());
        item.put("hashtags", first.hashtags());
        item.put("createdAt", first.createdAt().toString());
        item.put("gifUrl", first.gifUrl());
        return item;
    }

    private static Map<String, Object> userBrief(UUID id, User user) {
        return Map.of("id", id.toString(), "name", user == null ? "(unknown)" : user.name());
    }

    public record GiveRequest(
            @NotEmpty List<String> recipientIds,
            @NotNull Integer amount,
            String message,
            @NotEmpty List<String> hashtags,
            String gifUrl) {}
}
