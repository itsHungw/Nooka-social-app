package com.vinhung.nookaapi.platform.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.vinhung.nookaapi.user.spi.TokenVerificationException;
import com.vinhung.nookaapi.user.spi.TokenVerifier;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

class BearerTokenAuthenticationFilterTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void validTokenCreatesFirebasePrincipal() throws Exception {
        TokenVerifier verifier = token -> "firebase-user";
        var filter = new BearerTokenAuthenticationFilter(verifier);
        var request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer valid-token");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal())
                .isEqualTo("firebase-user");
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void invalidTokenReturnsUnauthorizedWithoutLeakingCause() throws Exception {
        TokenVerifier verifier = token -> {
            throw new TokenVerificationException(new IllegalArgumentException("provider detail"));
        };
        var filter = new BearerTokenAuthenticationFilter(verifier);
        var request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer invalid-token");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).doesNotContain("provider detail");
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}