package com.synacy.buhosly.users;

import com.synacy.buhosly.auth.CurrentUser;
import com.synacy.buhosly.common.ApiException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class MeController {

    private final UserRepository users;
    private final AllowanceService allowance;

    public MeController(UserRepository users, AllowanceService allowance) {
        this.users = users;
        this.allowance = allowance;
    }

    @GetMapping("/me")
    @Transactional
    public Map<String, Object> me() {
        var id = UUID.fromString(CurrentUser.requireId());
        var user = users.findById(id).orElseThrow(() -> ApiException.unauthorized("user not found"));
        var refreshed = allowance.refreshIfNeeded(user);
        return toView(refreshed);
    }

    @GetMapping("/users")
    public List<Map<String, Object>> listUsers() {
        var self = UUID.fromString(CurrentUser.requireId());
        return users.findAll().stream()
                .filter(u -> !u.id().equals(self))
                .map(u -> Map.<String, Object>of("id", u.id().toString(), "name", u.name(), "email", u.email()))
                .toList();
    }

    static Map<String, Object> toView(User user) {
        return Map.of(
                "id", user.id().toString(),
                "email", user.email(),
                "name", user.name(),
                "givingBalance", user.givingBalance(),
                "givingMonth", user.givingMonth().toString(),
                "earnedBalance", user.earnedBalance());
    }
}
