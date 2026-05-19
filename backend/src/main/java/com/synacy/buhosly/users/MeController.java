package com.synacy.buhosly.users;

import com.synacy.buhosly.auth.CurrentUser;
import com.synacy.buhosly.birthdays.BirthdayService;
import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.config.AppProperties;
import jakarta.validation.Valid;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class MeController {

    private final UserRepository users;
    private final AllowanceService allowance;
    private final BirthdayService birthdays;
    private final AppProperties props;

    public MeController(
            UserRepository users,
            AllowanceService allowance,
            BirthdayService birthdays,
            AppProperties props) {
        this.users = users;
        this.allowance = allowance;
        this.birthdays = birthdays;
        this.props = props;
    }

    @GetMapping("/me")
    @Transactional
    public Map<String, Object> me() {
        var id = UUID.fromString(CurrentUser.requireId());
        var user = users.findById(id).orElseThrow(() -> ApiException.unauthorized("user not found"));
        var refreshed = allowance.refreshIfNeeded(user);
        birthdays.applyTopupIfNeeded(refreshed);
        var view = toView(refreshed);
        view.put("isAdmin", isAdminEmail(refreshed.email()));
        view.put("birthdayTopupAppliedToday", birthdays.isBirthdayTodayWithTopup(refreshed));
        view.put("birthdayTopUpAmount", props.allowance().birthdayTopUp());
        return view;
    }

    @PutMapping("/me/birthday")
    @Transactional
    public Map<String, Object> setBirthday(@Valid @RequestBody BirthdayRequest req) {
        var id = UUID.fromString(CurrentUser.requireId());
        var user = users.findById(id).orElseThrow(() -> ApiException.unauthorized("user not found"));
        var normalised = birthdays.validateAndNormalise(req.birthday());
        user.setBirthday(normalised);
        users.save(user);
        var view = toView(user);
        view.put("isAdmin", isAdminEmail(user.email()));
        view.put("birthdayTopupAppliedToday", birthdays.isBirthdayTodayWithTopup(user));
        view.put("birthdayTopUpAmount", props.allowance().birthdayTopUp());
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
        map.put("birthday", user.birthday());
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

    public record BirthdayRequest(String birthday) {}
}
