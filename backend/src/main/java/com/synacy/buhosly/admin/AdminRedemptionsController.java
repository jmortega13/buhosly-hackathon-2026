package com.synacy.buhosly.admin;

import com.synacy.buhosly.redemptions.Redemption;
import com.synacy.buhosly.redemptions.RedemptionRepository;
import com.synacy.buhosly.rewards.Reward;
import com.synacy.buhosly.rewards.RewardRepository;
import com.synacy.buhosly.users.User;
import com.synacy.buhosly.users.UserRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/redemptions")
public class AdminRedemptionsController {

    private final RedemptionRepository redemptions;
    private final UserRepository users;
    private final RewardRepository rewards;

    public AdminRedemptionsController(
            RedemptionRepository redemptions, UserRepository users, RewardRepository rewards) {
        this.redemptions = redemptions;
        this.users = users;
        this.rewards = rewards;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        var all = sortedRedemptions();
        var userById = usersById();
        var rewardById = rewardsById();
        return all.stream().map(r -> toView(r, userById, rewardById)).toList();
    }

    @GetMapping(value = ".csv", produces = "text/csv; charset=utf-8")
    public ResponseEntity<String> csv() {
        var all = sortedRedemptions();
        var userById = usersById();
        var rewardById = rewardsById();
        var sb = new StringBuilder();
        sb.append("id,createdAt,userEmail,userName,rewardName,costPoints,status\n");
        for (var r : all) {
            var u = userById.get(r.userId());
            var w = rewardById.get(r.rewardId());
            sb.append(csv(r.id().toString())).append(",");
            sb.append(csv(r.createdAt().toString())).append(",");
            sb.append(csv(u == null ? "" : u.email())).append(",");
            sb.append(csv(u == null ? "" : u.name())).append(",");
            sb.append(csv(w == null ? "" : w.name())).append(",");
            sb.append(r.costPoints()).append(",");
            sb.append(csv(r.status())).append("\n");
        }
        var today = LocalDate.now(ZoneId.systemDefault()).format(DateTimeFormatter.ISO_LOCAL_DATE);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv; charset=utf-8"))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"redemptions-" + today + ".csv\"")
                .body(sb.toString());
    }

    private List<Redemption> sortedRedemptions() {
        var all = new java.util.ArrayList<>(redemptions.findAll());
        all.sort(Comparator.comparing(Redemption::createdAt).reversed());
        return all;
    }

    private Map<UUID, User> usersById() {
        var m = new HashMap<UUID, User>();
        users.findAll().forEach(u -> m.put(u.id(), u));
        return m;
    }

    private Map<UUID, Reward> rewardsById() {
        var m = new HashMap<UUID, Reward>();
        rewards.findAll().forEach(r -> m.put(r.id(), r));
        return m;
    }

    private static Map<String, Object> toView(Redemption r, Map<UUID, User> userById, Map<UUID, Reward> rewardById) {
        var u = userById.get(r.userId());
        var w = rewardById.get(r.rewardId());
        var m = new LinkedHashMap<String, Object>();
        m.put("id", r.id().toString());
        m.put("createdAt", r.createdAt().toString());
        m.put("user", Map.of(
                "id", r.userId().toString(),
                "name", u == null ? "(unknown)" : u.name(),
                "email", u == null ? "" : u.email()));
        m.put("reward", Map.of(
                "id", r.rewardId().toString(),
                "name", w == null ? "(deleted)" : w.name()));
        m.put("costPoints", r.costPoints());
        m.put("status", r.status());
        return m;
    }

    /**
     * RFC 4180 CSV cell quoting: wrap in double quotes if the field contains a
     * comma, double quote, or newline; double up any embedded double quotes.
     */
    private static String csv(String raw) {
        if (raw == null) return "";
        var needsQuoting = raw.indexOf(',') >= 0 || raw.indexOf('"') >= 0 || raw.indexOf('\n') >= 0 || raw.indexOf('\r') >= 0;
        if (!needsQuoting) return raw;
        return "\"" + raw.replace("\"", "\"\"") + "\"";
    }
}
