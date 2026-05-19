package com.synacy.buhosly.notifications;

import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.recognitions.Recognition;
import com.synacy.buhosly.users.User;
import com.synacy.buhosly.users.UserRepository;
import java.time.Instant;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository repo;
    private final UserRepository users;
    private final EmailService email;

    public NotificationService(
            NotificationRepository repo, UserRepository users, EmailService email) {
        this.repo = repo;
        this.users = users;
        this.email = email;
    }

    /**
     * Insert one notification per recipient of a successful give. Called from
     * inside {@code RecognitionService.give}'s @Transactional boundary, so a
     * rolled-back give produces no notification.
     */
    public void recognitionReceived(User giver, User recipient, Recognition recognition) {
        var preview = preview(recognition.message(), 120);
        var title = giver.name() + " recognized you (+" + recognition.amount() + " pts)";
        var payload = "{"
                + "\"giverId\":\"" + giver.id() + "\","
                + "\"giverName\":" + json(giver.name()) + ","
                + "\"amount\":" + recognition.amount() + ","
                + "\"recognitionId\":\"" + recognition.id() + "\""
                + "}";
        var n = new Notification(
                UUID.randomUUID(),
                recipient.id(),
                Notification.TYPE_RECOGNITION_RECEIVED,
                title,
                preview,
                payload,
                Instant.now());
        repo.save(n);
        email.send(n, recipient);
    }

    /**
     * Fire-once-per-month: when the lazy monthly refresh moves a user into a
     * new month, write a "your N giveable points are ready" notification —
     * but only if we haven't already written one for that month.
     */
    public void giveableRefreshed(User user, YearMonth newMonth, int newBalance) {
        var monthKey = newMonth.toString();
        if (repo.existsForUserMonth(user.id(), Notification.TYPE_GIVEABLE_REFRESHED, monthKey)) {
            return;
        }
        var title = "Your " + newBalance + " giveable points for " + monthKey + " are ready";
        var body = "Recognize teammates this month — unused giveable points expire at the end.";
        var payload = "{\"month\":\"" + monthKey + "\",\"amount\":" + newBalance + "}";
        var n = new Notification(
                UUID.randomUUID(),
                user.id(),
                Notification.TYPE_GIVEABLE_REFRESHED,
                title,
                body,
                payload,
                Instant.now());
        repo.save(n);
        email.send(n, user);
    }

    /**
     * Fire-once-per-month warning when the user has unspent giveable points
     * within the last few days of the calendar month.
     */
    public void giveableExpiring(User user, YearMonth month, int balance, int daysLeft) {
        var monthKey = month.toString();
        if (repo.existsForUserMonth(user.id(), Notification.TYPE_GIVEABLE_EXPIRING, monthKey)) {
            return;
        }
        var dayWord = daysLeft == 1 ? "day" : "days";
        var title = balance + " giveable points expiring in " + daysLeft + " " + dayWord;
        var body = "Your " + balance + " unused giveable points will reset at the end of " + monthKey
                + ". Use them now to recognize teammates.";
        var payload = "{\"month\":\"" + monthKey + "\",\"balance\":" + balance
                + ",\"daysLeft\":" + daysLeft + "}";
        var n = new Notification(
                UUID.randomUUID(),
                user.id(),
                Notification.TYPE_GIVEABLE_EXPIRING,
                title,
                body,
                payload,
                Instant.now());
        repo.save(n);
        email.send(n, user);
    }

    /**
     * Fire-once-per-year happy-birthday notification when the celebrant
     * receives their automatic earned-points top-up. Idempotent on the
     * calendar year via {@code existsForUserYear}, mirroring how the
     * top-up itself is gated by {@code users.last_birthday_topup_year}.
     */
    public void birthdayTopUp(User user, int year, int amount) {
        var yearKey = Integer.toString(year);
        if (repo.existsForUserYear(user.id(), Notification.TYPE_BIRTHDAY_TOPUP, yearKey)) {
            return;
        }
        var title = "🎂 Happy birthday! +" + amount + " earned points";
        var body = "Enjoy " + amount + " earned points on us — they're already in your balance,"
                + " ready to redeem for rewards.";
        var payload = "{\"year\":\"" + yearKey + "\",\"amount\":" + amount + "}";
        var n = new Notification(
                UUID.randomUUID(),
                user.id(),
                Notification.TYPE_BIRTHDAY_TOPUP,
                title,
                body,
                payload,
                Instant.now());
        repo.save(n);
        email.send(n, user);
    }

    public List<Notification> recent(UUID userId, int limit) {
        var capped = Math.min(Math.max(limit, 1), 100);
        return repo.findAllByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, capped));
    }

    public long unreadCount(UUID userId) {
        return repo.countByUserIdAndReadAtIsNull(userId);
    }

    @Transactional
    public Notification markRead(UUID notificationId, UUID userId) {
        var n = repo.findById(notificationId)
                .filter(it -> it.userId().equals(userId))
                .orElseThrow(() -> ApiException.notFound("notification not found"));
        if (n.readAt() == null) {
            n.setReadAt(Instant.now());
            repo.save(n);
        }
        return n;
    }

    @Transactional
    public int markAllRead(UUID userId) {
        return repo.markAllRead(userId);
    }

    private static String preview(String text, int max) {
        if (text == null) return "";
        var s = text.replace("\n", " ").trim();
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }

    /** Minimal JSON string escape — only enough for names/emails. */
    private static String json(String raw) {
        if (raw == null) return "\"\"";
        var sb = new StringBuilder("\"");
        for (int i = 0; i < raw.length(); i++) {
            var c = raw.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
                }
            }
        }
        sb.append("\"");
        return sb.toString();
    }
}
