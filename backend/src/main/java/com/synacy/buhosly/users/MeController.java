package com.synacy.buhosly.users;

import com.synacy.buhosly.auth.CurrentUser;
import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.config.AppProperties;
import java.util.LinkedHashMap;
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
    private final AppProperties props;

    public MeController(UserRepository users, AllowanceService allowance, AppProperties props) {
        this.users = users;
        this.allowance = allowance;
        this.props = props;
    }

    @GetMapping("/me")
    @Transactional
    public Map<String, Object> me() {
        var id = UUID.fromString(CurrentUser.requireId());
        var user = users.findById(id).orElseThrow(() -> ApiException.unauthorized("user not found"));
        var refreshed = allowance.refreshIfNeeded(user);
        var view = toView(refreshed);
        view.put("isAdmin", isAdminEmail(refreshed.email()));
        return view;
    }

    @GetMapping("/users")
    public List<Map<String, Object>> listUsers() {
        var self = UUID.fromString(CurrentUser.requireId());
        return users.findAll().stream()
                .filter(u -> !u.id().equals(self))
                .map(u -> Map.<String, Object>of("id", u.id().toString(), "name", u.name(), "email", u.email()))
                .toList();
    }

    static LinkedHashMap<String, Object> toView(User user) {
        var map = new LinkedHashMap<String, Object>();
        map.put("id", user.id().toString());
        map.put("email", user.email());
        map.put("name", user.name());
        map.put("givingBalance", user.givingBalance());
        map.put("givingMonth", user.givingMonth().toString());
        map.put("earnedBalance", user.earnedBalance());
        map.put("monthlyAllowance", user.monthlyAllowance());
        return map;
    }

    private boolean isAdminEmail(String email) {
        var adminList = props.auth().adminEmails();
        if (adminList == null) return false;
        for (var a : adminList) {
            if (a != null && a.equalsIgnoreCase(email)) return true;
        }
        return false;
    }
}
