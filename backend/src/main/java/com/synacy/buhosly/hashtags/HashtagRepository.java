package com.synacy.buhosly.hashtags;

import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HashtagRepository extends JpaRepository<Hashtag, String> {

    List<Hashtag> findByOrderByUsageCountDescLastUsedAtDesc(Pageable pageable);

    List<Hashtag> findByTagStartingWithOrderByUsageCountDescLastUsedAtDesc(String prefix, Pageable pageable);

    @Modifying
    @Query(
            value =
                    "INSERT INTO hashtags (tag, usage_count, last_used_at) "
                            + "VALUES (:tag, 1, :now) "
                            + "ON CONFLICT (tag) DO UPDATE "
                            + "SET usage_count = hashtags.usage_count + 1, last_used_at = :now",
            nativeQuery = true)
    void upsert(@Param("tag") String tag, @Param("now") Instant now);
}
