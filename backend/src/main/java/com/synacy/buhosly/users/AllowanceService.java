package com.synacy.buhosly.users;

import com.synacy.buhosly.config.AppProperties;
import com.synacy.buhosly.notifications.NotificationService;
import java.time.Clock;
import java.time.YearMonth;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

@Service
public class AllowanceService {

    private final AppProperties props;
    private final Clock clock;
    private final UserRepository users;
    private final NotificationService notifications;

    /**
     * NotificationService is injected lazily to break the circular reference:
     * NotificationService → RecognitionService → AllowanceService → NotificationService.
     */
    public AllowanceService(
            AppProperties props,
            Clock clock,
            UserRepository users,
            @Lazy NotificationService notifications) {
        this.props = props;
        this.clock = clock;
        this.users = users;
        this.notifications = notifications;
    }

    public User refreshIfNeeded(User user) {
        YearMonth currentMonth = YearMonth.now(clock);
        if (user.givingMonth() != null && user.givingMonth().equals(currentMonth)) {
            return user;
        }
        int amount = user.monthlyAllowance() != null
                ? user.monthlyAllowance()
                : props.allowance().defaultPoints();
        user.setGivingBalance(amount);
        user.setGivingMonth(currentMonth);
        var saved = users.save(user);
        notifications.giveableRefreshed(saved, currentMonth, amount);
        return saved;
    }
}
