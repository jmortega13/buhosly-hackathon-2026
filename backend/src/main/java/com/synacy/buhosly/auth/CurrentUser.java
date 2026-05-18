package com.synacy.buhosly.auth;

import com.synacy.buhosly.common.ApiException;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUser {

    private CurrentUser() {}

    public static String requireId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            throw ApiException.unauthorized("not authenticated");
        }
        return auth.getPrincipal().toString();
    }
}
