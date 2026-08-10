package com.vinhung.nookaapi.post.repository;

import com.vinhung.nookaapi.post.entity.Post;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

interface PostRepository extends JpaRepository<Post, UUID>, JpaSpecificationExecutor<Post> {
    java.util.Optional<Post> findByAuthorIdAndIdempotencyKey(UUID authorId, UUID idempotencyKey);
}
