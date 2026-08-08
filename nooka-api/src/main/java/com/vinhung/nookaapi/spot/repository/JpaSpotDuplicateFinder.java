package com.vinhung.nookaapi.spot.repository;

import com.vinhung.nookaapi.spot.api.DuplicateSpotCandidate;
import com.vinhung.nookaapi.spot.api.SpotDuplicateFinder;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Native query vì cả {@code ST_DWithin} lẫn {@code similarity} đều không có
 * trong JPQL, và thêm hibernate-spatial chỉ để diễn đạt hai hàm này là thêm một
 * dependency cho việc mà một câu SQL làm xong.
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
class JpaSpotDuplicateFinder implements SpotDuplicateFinder {

    /**
     * Điểm gốc dựng ngay trong SQL bằng tham số có ép kiểu.
     *
     * <p>Ghép toạ độ thành chuỗi là mở đường cho SQL injection; truyền qua tham
     * số kiểu geography thì cần một kiểu Java hiểu được nó, mà ta cố tình không
     * thêm. Nên điểm được dựng bằng một biểu thức con nhận tham số số học.
     *
     * <p>{@code ST_MakePoint} nhận (kinh độ, vĩ độ) — ngược với cách người ta
     * thường đọc toạ độ. Đảo hai tham số cho ra khoảng cách sai hàng nghìn km.
     */
    private static final String ORIGIN =
            "ST_SetSRID(ST_MakePoint(cast(:lng as double precision), "
                    + "cast(:lat as double precision)), 4326)::geography";

    private static final String SQL = """
            select s.id,
                   s.name,
                   ST_Distance(p.geog, %1$s) as distance_m,
                   similarity(lower(s.name), lower(:name)) as name_similarity
            from spots s
            join places p on p.spot_id = s.id
            where s.merged_into_id is null
              and p.geog is not null
              and ST_DWithin(p.geog, %1$s, cast(:radius as double precision))
              and similarity(lower(s.name), lower(:name)) > cast(:minSimilarity as real)
            order by distance_m
            """.formatted(ORIGIN);

    private final EntityManager em;

    @Override
    @SuppressWarnings("unchecked")
    public List<DuplicateSpotCandidate> findNear(
            String name,
            BigDecimal latitude,
            BigDecimal longitude,
            double radiusMeters,
            double minSimilarity) {

        List<Object[]> rows = em.createNativeQuery(SQL)
                .setParameter("name", name)
                .setParameter("lat", latitude)
                .setParameter("lng", longitude)
                .setParameter("radius", radiusMeters)
                .setParameter("minSimilarity", minSimilarity)
                .getResultList();

        return rows.stream()
                .map(row -> new DuplicateSpotCandidate(
                        (UUID) row[0],
                        (String) row[1],
                        ((Number) row[2]).doubleValue(),
                        ((Number) row[3]).doubleValue()))
                .toList();
    }
}
