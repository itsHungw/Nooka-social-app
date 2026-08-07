package com.vinhung.nookaapi.directions.cache;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import com.vinhung.nookaapi.directions.config.RouteCacheProperties;
import com.vinhung.nookaapi.directions.model.dto.RoutePreviewResponse;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

public class RedisRoutePreviewCache implements RoutePreviewCache {

    private static final Logger LOGGER = LoggerFactory.getLogger(RedisRoutePreviewCache.class);

    private final StringRedisTemplate redisTemplate;
    private final JsonMapper jsonMapper;
    private final RouteCacheProperties properties;

    public RedisRoutePreviewCache(
            StringRedisTemplate redisTemplate,
            JsonMapper jsonMapper,
            RouteCacheProperties properties) {
        this.redisTemplate = redisTemplate;
        this.jsonMapper = jsonMapper;
        this.properties = properties;
    }

    @Override
    public Optional<RoutePreviewResponse> find(RoutePreviewCacheKey key) {
        if (!properties.enabled()) {
            return Optional.empty();
        }

        try {
            var payload = redisTemplate.opsForValue().get(key.redisKey(properties.keyPrefix()));
            if (payload == null) {
                return Optional.empty();
            }
            return Optional.of(jsonMapper.readValue(payload, RoutePreviewResponse.class));
        } catch (JacksonException exception) {
            LOGGER.debug("Ignoring invalid route preview cache payload");
            return Optional.empty();
        } catch (RuntimeException exception) {
            LOGGER.debug("Route preview cache read failed; continuing without cache");
            return Optional.empty();
        }
    }

    @Override
    public void put(RoutePreviewCacheKey key, RoutePreviewResponse response) {
        if (!properties.enabled()) {
            return;
        }

        try {
            var payload = jsonMapper.writeValueAsString(response);
            redisTemplate.opsForValue().set(key.redisKey(properties.keyPrefix()), payload, properties.ttl());
        } catch (JacksonException exception) {
            LOGGER.debug("Skipping route preview cache write because serialization failed");
        } catch (RuntimeException exception) {
            LOGGER.debug("Route preview cache write failed; returning uncached response");
        }
    }
}