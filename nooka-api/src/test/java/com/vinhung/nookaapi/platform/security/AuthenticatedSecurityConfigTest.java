package com.vinhung.nookaapi.platform.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

import com.vinhung.nookaapi.user.spi.TokenVerifier;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Primary;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest(
        controllers = AuthenticatedSecurityConfigTest.TestController.class,
        properties = "nooka.security.enabled=true")
@Import({
        SecurityConfig.class,
        BearerTokenAuthenticationFilter.class,
        AuthenticatedSecurityConfigTest.TestController.class,
        AuthenticatedSecurityConfigTest.TestTokenVerifierConfig.class})
@ImportAutoConfiguration({SecurityAutoConfiguration.class, ServletWebSecurityAutoConfiguration.class})
class AuthenticatedSecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void authMeRequiresBearerToken() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginRemainsPublic() throws Exception {
        mockMvc.perform(post("/auth/login"))
                .andExpect(status().isOk());
    }

    @Test
    void authMeAllowsValidBearerToken() throws Exception {
        var result = mockMvc.perform(get("/auth/me").header("Authorization", "Bearer valid-token"))
                .andReturn();

        assertThat(TestTokenVerifierConfig.calls).hasValue(1);
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
    }

    @RestController
    public static class TestController {

        @GetMapping("/auth/me")
        void me() {
        }

        @PostMapping("/auth/login")
        void login() {
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class TestTokenVerifierConfig {

        static final AtomicInteger calls = new AtomicInteger();

        @Bean
        @Primary
        TokenVerifier tokenVerifier() {
            return token -> {
                calls.incrementAndGet();
                return UUID.fromString("00000000-0000-0000-0000-000000000001");
            };
        }
    }
}
