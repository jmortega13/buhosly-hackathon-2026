package com.synacy.buhosly.notifications;

import com.synacy.buhosly.config.AppProperties;
import com.synacy.buhosly.users.UserRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Daily 09:00 Asia/Manila scan that fires "your giveable points are expiring
 * soon" notifications on the last 3 days of each calendar month, for every
 * user whose `giving_balance > 0` who hasn't already received the warning
 * this month. Idempotency is enforced inside NotificationService via the
 * existsForUserMonth check, so accidental re-runs (manual trigger, etc.)
 * are safe.
 */
@Component
public class ExpiryWarningScheduler {

    private static final Logger log = LoggerFactory.getLogger(ExpiryWarningScheduler.class);
    private static final int WARNING_WINDOW_DAYS = 3;

    private final UserRepository users;
    private final NotificationService notifications;
    private final Clock clock;
    private final AppProperties props;

    public ExpiryWarningScheduler(
            UserRepository users,
            NotificationService notifications,
            Clock clock,
            AppProperties props) {
        this.users = users;
        this.notifications = notifications;
        this.clock = clock;
        this.props = props;
    }

    @Scheduled(cron = "0 0 9 * * *", zone = "Asia/Manila")
    @Transactional
    public void run() {
        var today = LocalDate.now(clock);
        var lastDay = YearMonth.from(today).lengthOfMonth();
        var daysLeft = lastDay - today.getDayOfMonth();
        if (daysLeft >= WARNING_WINDOW_DAYS) {
            return; // not in the warning window yet
        }
        var month = YearMonth.from(today);
        int fired = 0;
        for (var user : users.findAll()) {
            if (user.givingBalance() <= 0) continue;
            // The service handles idempotency per (user, month) — calling on a user
            // who already received this month's warning is a safe no-op.
            int before = (int) notifications.unreadCount(user.id());
            notifications.giveableExpiring(user, month, user.givingBalance(), daysLeft);
            int after = (int) notifications.unreadCount(user.id());
            if (after > before) fired++;
        }
        log.info("Expiry warning sweep fired {} notification(s) (daysLeft={})", fired, daysLeft);
    }
}
