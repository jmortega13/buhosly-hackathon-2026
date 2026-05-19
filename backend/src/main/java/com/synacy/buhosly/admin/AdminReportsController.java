package com.synacy.buhosly.admin;

import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.recognitions.Recognition;
import com.synacy.buhosly.recognitions.RecognitionRepository;
import com.synacy.buhosly.users.User;
import com.synacy.buhosly.users.UserRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/reports")
public class AdminReportsController {

    private static final ZoneId ZONE = ZoneId.of("Asia/Manila");
    private static final int HASHTAG_LIMIT = 20;
    private static final int LEADERBOARD_LIMIT = 10;

    private final RecognitionRepository recognitions;
    private final UserRepository users;

    public AdminReportsController(RecognitionRepository recognitions, UserRepository users) {
        this.recognitions = recognitions;
        this.users = users;
    }

    @GetMapping("/hashtags")
    public List<Map<String, Object>> hashtags(@RequestParam(name = "window", required = false) String window) {
        Instant cutoff = windowStart(window);
        var byTag = new HashMap<String, HashtagAgg>();
        for (var r : recognitions.findAll()) {
            if (cutoff != null && r.createdAt().isBefore(cutoff)) continue;
            var tags = r.hashtags();
            if (tags == null || tags.isEmpty()) continue;
            var seen = new HashSet<String>();
            for (var tag : tags) {
                if (tag == null || tag.isBlank()) continue;
                if (!seen.add(tag)) continue;
                byTag.computeIfAbsent(tag, HashtagAgg::new).add(r.amount(), r.createdAt());
            }
        }
        return byTag.values().stream()
                .sorted(Comparator.<HashtagAgg>comparingInt(a -> a.recognitionCount).reversed()
                        .thenComparing(Comparator.<HashtagAgg>comparingLong(a -> a.pointsTotal).reversed())
                        .thenComparing(Comparator.<HashtagAgg, Instant>comparing(a -> a.lastUsedAt).reversed()))
                .limit(HASHTAG_LIMIT)
                .map(HashtagAgg::toView)
                .toList();
    }

    @GetMapping("/leaderboard")
    public List<Map<String, Object>> leaderboard(@RequestParam(name = "window", required = false) String window) {
        Instant cutoff = windowStart(window);
        var byUser = new HashMap<UUID, LeaderAgg>();
        for (var r : recognitions.findAll()) {
            if (cutoff != null && r.createdAt().isBefore(cutoff)) continue;
            byUser.computeIfAbsent(r.recipientId(), LeaderAgg::new).add(r.amount());
        }
        if (byUser.isEmpty()) return List.of();

        var userById = new HashMap<UUID, User>();
        users.findAllById(byUser.keySet()).forEach(u -> userById.put(u.id(), u));

        return byUser.values().stream()
                .filter(a -> userById.containsKey(a.userId))
                .sorted(Comparator.<LeaderAgg>comparingLong(a -> a.pointsReceived).reversed()
                        .thenComparing(Comparator.<LeaderAgg>comparingInt(a -> a.recognitionCount).reversed())
                        .thenComparing((a, b) -> String.CASE_INSENSITIVE_ORDER.compare(
                                userById.get(a.userId).name(), userById.get(b.userId).name())))
                .limit(LEADERBOARD_LIMIT)
                .map(a -> a.toView(userById.get(a.userId)))
                .toList();
    }

    private static Instant windowStart(String window) {
        var value = window == null || window.isBlank() ? "month" : window.trim().toLowerCase();
        return switch (value) {
            case "month" -> LocalDate.now(ZONE).withDayOfMonth(1).atStartOfDay(ZONE).toInstant();
            case "all" -> null;
            default -> throw ApiException.badRequest("window must be 'month' or 'all'");
        };
    }

    private static final class HashtagAgg {
        final String tag;
        int recognitionCount;
        long pointsTotal;
        Instant lastUsedAt;

        HashtagAgg(String tag) {
            this.tag = tag;
        }

        void add(int amount, Instant createdAt) {
            recognitionCount++;
            pointsTotal += amount;
            if (lastUsedAt == null || createdAt.isAfter(lastUsedAt)) lastUsedAt = createdAt;
        }

        Map<String, Object> toView() {
            var m = new LinkedHashMap<String, Object>();
            m.put("tag", tag);
            m.put("recognitionCount", recognitionCount);
            m.put("pointsTotal", pointsTotal);
            m.put("lastUsedAt", lastUsedAt.toString());
            return m;
        }
    }

    private static final class LeaderAgg {
        final UUID userId;
        long pointsReceived;
        int recognitionCount;

        LeaderAgg(UUID userId) {
            this.userId = userId;
        }

        void add(int amount) {
            pointsReceived += amount;
            recognitionCount++;
        }

        Map<String, Object> toView(User u) {
            var m = new LinkedHashMap<String, Object>();
            m.put("user", Map.of(
                    "id", u.id().toString(),
                    "name", u.name(),
                    "email", u.email()));
            m.put("pointsReceived", pointsReceived);
            m.put("recognitionCount", recognitionCount);
            return m;
        }
    }
}
