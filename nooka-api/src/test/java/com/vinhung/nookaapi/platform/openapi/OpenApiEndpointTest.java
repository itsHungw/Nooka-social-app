package com.vinhung.nookaapi.platform.openapi;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springdoc.core.configuration.SpringDocConfiguration;
import org.springdoc.core.properties.SpringDocConfigProperties;
import org.springdoc.core.properties.SwaggerUiConfigProperties;
import org.springdoc.webmvc.core.configuration.SpringDocWebMvcConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest(
        controllers = OpenApiEndpointTest.TestController.class,
        properties = "springdoc.api-docs.enabled=true")
@Import({
    OpenApiConfig.class,
    OpenApiEndpointTest.PermitAllSecurityConfig.class,
    OpenApiEndpointTest.TestController.class,
    SpringDocConfiguration.class,
    SpringDocWebMvcConfiguration.class
})
@ImportAutoConfiguration({SecurityAutoConfiguration.class, ServletWebSecurityAutoConfiguration.class})
class OpenApiEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void exposesGeneratedOpenApiJson() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("Nooka API"))
                .andExpect(jsonPath("$.paths['/test-only/openapi']").exists());
    }

    @TestConfiguration(proxyBeanMethods = false)
    @EnableConfigurationProperties({SpringDocConfigProperties.class, SwaggerUiConfigProperties.class})
    static class PermitAllSecurityConfig {

        @Bean
        SecurityFilterChain testSecurity(HttpSecurity http) throws Exception {
            return http
                    .csrf(csrf -> csrf.disable())
                    .authorizeHttpRequests(authorize -> authorize.anyRequest().permitAll())
                    .build();
        }
    }

    @RestController
    public static class TestController {

        @GetMapping("/test-only/openapi")
        String endpoint() {
            return "ok";
        }
    }
}