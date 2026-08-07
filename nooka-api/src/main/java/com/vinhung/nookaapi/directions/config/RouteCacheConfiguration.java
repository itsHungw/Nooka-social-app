package com.vinhung.nookaapi.directions.config;

import com.vinhung.nookaapi.directions.cache.RedisRoutePreviewCache;
import com.vinhung.nookaapi.directions.cache.RoutePreviewCache;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;
import tools.jackson.databind.json.JsonMapper;

@Configuration(proxyBeanMethods = false)
class RouteCacheConfiguration {

    @Bean
    RoutePreviewCache routePreviewCache(
            StringRedisTemplate redisTemplate,
            JsonMapper jsonMapper,
            RouteCacheProperties properties) {
        return new RedisRoutePreviewCache(redisTemplate, jsonMapper, properties);
    }
}