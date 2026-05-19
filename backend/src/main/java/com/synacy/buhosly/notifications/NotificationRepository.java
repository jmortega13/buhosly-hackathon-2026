package com.synacy.buhosly.notifications;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findAllByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    long countByUserIdAndReadAtIsNull(UUID userId);

    /**
     * True if the user already has a notification of the given type whose
     * `payload` JSONB contains the supplied month key. Used to keep
     * `giveable_refreshed` and `giveable_expiring` notifications idempotent
     * across the same month — see NotificationService.
     */
    @Query(
            value =
                    "SELECT EXISTS (SELECT 1 FROM notifications "
                            + "WHERE user_id = :userId AND type = :type "
                            + "AND payload->>'month' = :month)",
            nativeQuery = true)
    boolean existsForUserMonth(
            @Param("userId") UUID userId,
            @Param("type") String type,
            @Param("month") String month);

    /**
     * Bulk mark-as-read. Returns affected count via JPA's standard
     * @Modifying contract.
     */
    @Modifying
    @Query(
            value = "UPDATE notifications SET read_at = NOW() "
                    + "WHERE user_id = :userId AND read_at IS NULL",
            nativeQuery = true)
    int markAllRead(@Param("userId") UUID userId);
}
