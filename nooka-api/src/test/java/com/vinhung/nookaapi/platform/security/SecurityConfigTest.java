package com.vinhung.nookaapi.platform.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest(
        controllers = SecurityConfigTest.TestController.class,
        properties = "nooka.security.enabled=false")
@Import({SecurityConfig.class, SecurityConfigTest.TestController.class})
@ImportAutoConfiguration({SecurityAutoConfiguration.class, ServletWebSecurityAutoConfiguration.class})
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void explicitLocalModeAllowsRequests() throws Exception {
        mockMvc.perform(get("/test-only/ping"))
                .andExpect(status().isOk());
    }

    @RestController
    public static class TestController {

        @GetMapping("/test-only/ping")
        void ping() {
        }
    }
}