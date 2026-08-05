package com.vinhung.nookaapi.platform.openapi;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "springdoc.api-docs.enabled", havingValue = "true")
class OpenApiConfig {

    @Bean
    OpenAPI nookaOpenApi() {
        return new OpenAPI().info(new Info()
                .title("Nooka API")
                .version("v1")
                .description("Backend contract for the Nooka social discovery app."));
    }
}