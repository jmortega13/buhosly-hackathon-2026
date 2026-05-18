package com.synacy.buhosly.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Cors cors, Jwt jwt, Auth auth, Allowance allowance, Feed feed, Giphy giphy) {

    public record Cors(List<String> allowedOrigins) {}

    public record Jwt(String secret, long expiresMinutes) {}

    public record Auth(List<String> allowedDomains, List<String> adminEmails, Google google) {
        public record Google(String clientId) {}
    }

    public record Allowance(int defaultPoints, String zone) {}

    public record Feed(int defaultPageSize, int maxPageSize) {}

    public record Giphy(String apiKey) {}
}
