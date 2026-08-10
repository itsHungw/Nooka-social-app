package com.vinhung.nookaapi.post.service;

import com.vinhung.nookaapi.post.api.PostCreated;
import com.vinhung.nookaapi.spot.api.SpotVisitRecorder;
import lombok.RequiredArgsConstructor;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class PostCreatedListener {

    private final SpotVisitRecorder visits;

    @ApplicationModuleListener
    void on(PostCreated event) {
        visits.recordBeen(event.authorId(), event.spotId(), event.postId());
    }
}
