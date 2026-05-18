package com.synacy.buhosly.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.config.AppProperties;
import jakarta.annotation.PostConstruct;
import java.security.GeneralSecurityException;
import java.util.Collections;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class GoogleTokenVerifierService {

    private static final Logger log = LoggerFactory.getLogger(GoogleTokenVerifierService.class);

    private final AppProperties props;
    private GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifierService(AppProperties props) {
        this.props = props;
    }

    @PostConstruct
    void init() {
        var clientId = props.auth().google().clientId();
        if (clientId == null || clientId.isBlank()) {
            log.warn(
                    "GOOGLE_CLIENT_ID not configured. Google Sign-In will fail until it is set in env.");
            return;
        }
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(clientId))
                .build();
    }

    public Verified verify(String idTokenString) {
        if (verifier == null) {
            throw ApiException.unauthorized("google sign-in is not configured on the server");
        }
        if (idTokenString == null || idTokenString.isBlank()) {
            throw ApiException.unauthorized("idToken is required");
        }
        GoogleIdToken token;
        try {
            token = verifier.verify(idTokenString);
        } catch (GeneralSecurityException | java.io.IOException e) {
            throw ApiException.unauthorized("invalid sign-in");
        }
        if (token == null) {
            throw ApiException.unauthorized("invalid sign-in");
        }
        var payload = token.getPayload();
        Boolean verified = payload.getEmailVerified();
        if (verified == null || !verified) {
            throw ApiException.unauthorized("invalid sign-in");
        }
        var email = payload.getEmail();
        var name = (String) payload.get("name");
        if (email == null || email.isBlank() || name == null || name.isBlank()) {
            throw ApiException.unauthorized("invalid sign-in");
        }
        return new Verified(email.toLowerCase(), name);
    }

    public record Verified(String email, String name) {}
}
