package com.vinhung.nookaapi.post.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "post_audience")
@IdClass(PostAudience.Key.class)
@Getter
@NoArgsConstructor
public class PostAudience {

    @Id
    @Column(name = "post_id", nullable = false)
    private UUID postId;

    @Id
    @Column(name = "viewer_id", nullable = false)
    private UUID viewerId;

    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private UUID postId;
        private UUID viewerId;
    }
}
