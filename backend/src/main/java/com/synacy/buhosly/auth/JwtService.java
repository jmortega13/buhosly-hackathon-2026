package com.synacy.buhosly.auth;

import com.synacy.buhosly.config.AppProperties;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final SecretKey key;
    private final Duration expires;

    public JwtService(AppProperties props) {
        var raw = props.jwt().secret();
        if (raw == null || raw.length() < 32) {
            throw new IllegalStateException(
                    "JWT secret must be at least 32 characters. Set JWT_SECRET env var.");
        }
        this.key = Keys.hmacShaKeyFor(raw.getBytes(StandardCharsets.UTF_8));
        this.expires = Duration.ofMinutes(props.jwt().expiresMinutes());
    }

    public String issue(String userId) {
        var now = Instant.now();
        return Jwts.builder()
                .subject(userId)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expires)))
                .signWith(key)
                .compact();
    }

    public String verifyAndGetUserId(String token) {
        try {
            return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject();
        } catch (JwtException | IllegalArgumentException e) {
            throw new com.synacy.buhosly.common.ApiException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "invalid token");
        }
    }
}
