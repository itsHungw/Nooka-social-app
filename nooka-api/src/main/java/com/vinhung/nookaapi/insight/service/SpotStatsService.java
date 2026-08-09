package com.vinhung.nookaapi.insight.service;

import com.vinhung.nookaapi.insight.api.SpotStats;
import com.vinhung.nookaapi.insight.api.SpotStatsView;
import com.vinhung.nookaapi.insight.api.TagStat;
import com.vinhung.nookaapi.post.api.PostAccess;
import com.vinhung.nookaapi.review.api.ReviewAccess;
import com.vinhung.nookaapi.shared.model.TagVote;
import com.vinhung.nookaapi.tag.api.TagCatalog;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cài đặt bằng cách hỏi từng cổng rồi gộp lại — không có bảng thống kê nào.
 *
 * <p>Đây là "cách A" ở mục 4.3 của spec. Khi nào đo được chậm thì thay ruột lớp
 * này bằng bảng projection; {@code SpotStats} không đổi nên không màn hình nào
 * phải sửa.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
class SpotStatsService implements SpotStats {

    private final PostAccess posts;
    private final ReviewAccess reviews;
    private final TagCatalog tags;

    @Override
    public SpotStatsView forViewer(UUID spotId, @Nullable UUID viewerId) {
        long checkinCount = posts.countSharedAtSpot(spotId);
        long reviewCount = reviews.countAtSpot(spotId);
        long friendCount = posts.countFollowedAuthorsAtSpot(spotId, viewerId);

        return new SpotStatsView(
                checkinCount,
                reviewCount,
                friendCount,
                checkinCount <= 1,
                reviewCount > 0,
                tagStats(spotId));
    }

    /**
     * Gộp phiếu thẻ từ hai nguồn, đếm theo <b>người</b>.
     *
     * <p>Phép gộp phải xảy ra ở đây chứ không ở mỗi nguồn: một người vừa gắn thẻ
     * {@code quiet} lên bài vừa trả lời review sinh {@code quiet} thì vẫn là một
     * người. Để mỗi cổng tự đếm rồi cộng hai con số là biến người đó thành hai.
     */
    private List<TagStat> tagStats(UUID spotId) {
        Map<UUID, Set<UUID>> peopleByTag = new HashMap<>();

        for (TagVote vote : posts.tagVotesAtSpot(spotId)) {
            peopleByTag.computeIfAbsent(vote.tagId(), key -> new HashSet<>()).add(vote.userId());
        }
        for (TagVote vote : reviews.tagVotesAtSpot(spotId)) {
            peopleByTag.computeIfAbsent(vote.tagId(), key -> new HashSet<>()).add(vote.userId());
        }

        Map<UUID, String> slugs = tags.slugsFor(peopleByTag.keySet());

        return peopleByTag.entrySet().stream()
                .filter(entry -> slugs.containsKey(entry.getKey()))
                .map(entry -> new TagStat(
                        entry.getKey(), slugs.get(entry.getKey()), entry.getValue().size()))
                // Nhiều người nói nhất trước; hoà thì theo slug để thứ tự ổn định
                // giữa các lần gọi, nếu không giao diện sẽ nhảy lung tung.
                .sorted(Comparator.comparingLong(TagStat::people).reversed()
                        .thenComparing(TagStat::slug))
                .toList();
    }
}
