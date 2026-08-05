package com.vinhung.nookaapi.platform.security;

import com.vinhung.nookaapi.user.spi.TokenVerificationException;
import com.vinhung.nookaapi.user.spi.TokenVerifier;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "nooka.security.enabled", havingValue = "true", matchIfMissing = true)
class BearerTokenAuthenticationFilter extends OncePerRequestFilter {

    private static final String PREFIX = "Bearer ";

    private final TokenVerifier tokenVerifier;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization != null && authorization.startsWith(PREFIX)) {
            try {
                String firebaseUid = tokenVerifier.verify(authorization.substring(PREFIX.length()));
                var authentication = UsernamePasswordAuthenticationToken.authenticated(
                        firebaseUid, null, List.of());
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (TokenVerificationException exception) {
                SecurityContextHolder.clearContext();
                response.sendError(HttpStatus.UNAUTHORIZED.value());
                return;
            }
        }
        filterChain.doFilter(request, response);
    }
}