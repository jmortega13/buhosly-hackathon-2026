package com.synacy.buhosly.users;

import com.synacy.buhosly.config.AppProperties;
import java.time.Clock;
import java.time.YearMonth;
import org.springframework.stereotype.Service;

@Service
public class AllowanceService {

    private final AppProperties props;
    private final Clock clock;
    private final UserRepository users;

    public AllowanceService(AppProperties props, Clock clock, UserRepository users) {
        this.props = props;
        this.clock = clock;
        this.users = users;
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
        return users.save(user);
    }
}
