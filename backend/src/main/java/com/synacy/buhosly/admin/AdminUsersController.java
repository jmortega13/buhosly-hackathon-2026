package com.synacy.buhosly.admin;

import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.users.AllowanceService;
import com.synacy.buhosly.users.User;
import com.synacy.buhosly.users.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminUsersController {

    private final UserRepository users;
    private final AllowanceService allowance;

    public AdminUsersController(UserRepository users, AllowanceService allowance) {
        this.users = users;
        this.allowance = allowance;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return users.findAll().stream()
                .sorted(Comparator.comparing(User::name, String.CASE_INSENSITIVE_ORDER))
                .map(AdminUsersController::toView)
                .toList();
    }

    @PostMapping("/{id}/top-up")
    @Transactional
    public Map<String, Object> topUp(@PathVariable UUID id, @Valid @RequestBody TopUpRequest req) {
        if (req.amount() <= 0) {
            throw ApiException.badRequest("amount must be a positive integer");
        }
        var user = users.findById(id).orElseThrow(() -> ApiException.notFound("user not found"));
        var refreshed = allowance.refreshIfNeeded(user);
        refreshed.setGivingBalance(refreshed.givingBalance() + req.amount());
        users.save(refreshed);
        return toView(refreshed);
    }

    @PutMapping("/{id}/monthly-allowance")
    @Transactional
    public Map<String, Object> setMonthlyAllowance(
            @PathVariable UUID id, @RequestBody MonthlyAllowanceRequest req) {
        if (req.monthlyAllowance() != null && req.monthlyAllowance() <= 0) {
            throw ApiException.badRequest("monthlyAllowance must be a positive integer or null");
        }
        var user = users.findById(id).orElseThrow(() -> ApiException.notFound("user not found"));
        user.setMonthlyAllowance(req.monthlyAllowance());
        users.save(user);
        return toView(user);
    }

    private static Map<String, Object> toView(User u) {
        var m = new LinkedHashMap<String, Object>();
        m.put("id", u.id().toString());
        m.put("email", u.email());
        m.put("name", u.name());
        m.put("givingBalance", u.givingBalance());
        m.put("givingMonth", u.givingMonth().toString());
        m.put("earnedBalance", u.earnedBalance());
        m.put("monthlyAllowance", u.monthlyAllowance());
        m.put("createdAt", u.createdAt().toString());
        return m;
    }

    public record TopUpRequest(@NotNull @Positive Integer amount) {}

    public record MonthlyAllowanceRequest(Integer monthlyAllowance) {}
}
