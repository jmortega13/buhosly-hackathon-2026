package com.synacy.buhosly.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.synacy.buhosly.common.ApiException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String BEARER = "Bearer ";

    private final JwtService jwt;
    private final ObjectMapper mapper = new ObjectMapper();

    public JwtAuthFilter(JwtService jwt) {
        this.jwt = jwt;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        var path = request.getRequestURI();
        return path.startsWith("/api/v1/auth/") || path.equals("/error");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith(BEARER)) {
            writeUnauthorized(response, "missing or invalid Authorization header");
            return;
        }
        var token = header.substring(BEARER.length());
        try {
            var claims = jwt.verify(token);
            List<GrantedAuthority> authorities = new ArrayList<>();
            if (claims.isAdmin()) {
                authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
            }
            var auth = new UsernamePasswordAuthenticationToken(claims.userId(), null, authorities);
            SecurityContextHolder.getContext().setAuthentication(auth);
            chain.doFilter(request, response);
        } catch (ApiException e) {
            writeUnauthorized(response, e.getMessage());
        }
    }

    private void writeUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(response.getWriter(), Map.of("message", message));
    }
}
