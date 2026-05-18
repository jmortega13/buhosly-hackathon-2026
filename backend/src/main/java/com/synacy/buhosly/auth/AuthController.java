package com.synacy.buhosly.auth;

import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.config.AppProperties;
import com.synacy.buhosly.users.User;
import com.synacy.buhosly.users.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserRepository users;
    private final JwtService jwt;
    private final GoogleTokenVerifierService google;
    private final AppProperties props;
    private final Clock clock;

    public AuthController(
            UserRepository users,
            JwtService jwt,
            GoogleTokenVerifierService google,
            AppProperties props,
            Clock clock) {
        this.users = users;
        this.jwt = jwt;
        this.google = google;
        this.props = props;
        this.clock = clock;
    }

    @PostMapping("/google")
    @Transactional
    public ResponseEntity<LoginResponse> google(@Valid @RequestBody GoogleSignInRequest req) {
        var verified = google.verify(req.idToken());
        if (!domainAllowed(verified.email())) {
            throw ApiException.forbidden("domain not allowed");
        }
        User user = users.findByEmailIgnoreCase(verified.email()).orElseGet(() -> jitCreate(verified));
        boolean isAdmin = isAdminEmail(user.email());
        var token = jwt.issue(user.id().toString(), isAdmin);
        var profile = new LinkedHashMap<String, Object>();
        profile.put("id", user.id().toString());
        profile.put("email", user.email());
        profile.put("name", user.name());
        profile.put("isAdmin", isAdmin);
        return ResponseEntity.ok(new LoginResponse(token, profile));
    }

    private boolean domainAllowed(String email) {
        int at = email.lastIndexOf('@');
        if (at < 0 || at == email.length() - 1) return false;
        var domain = email.substring(at + 1).toLowerCase();
        Set<String> allowed = new HashSet<>();
        for (var d : props.auth().allowedDomains()) {
            allowed.add(d.toLowerCase());
        }
        return allowed.contains(domain);
    }

    private boolean isAdminEmail(String email) {
        var adminList = props.auth().adminEmails();
        if (adminList == null) return false;
        var lower = email.toLowerCase();
        for (var a : adminList) {
            if (a != null && a.equalsIgnoreCase(lower)) return true;
        }
        return false;
    }

    private User jitCreate(GoogleTokenVerifierService.Verified v) {
        var user = new User(
                UUID.randomUUID(),
                v.email(),
                v.name(),
                props.allowance().defaultPoints(),
                YearMonth.now(clock),
                0,
                Instant.now());
        return users.save(user);
    }

    public record GoogleSignInRequest(@NotBlank String idToken) {}

    public record LoginResponse(String token, Map<String, Object> user) {}
}
