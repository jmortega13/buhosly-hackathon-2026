package com.synacy.buhosly.birthdays;

import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.config.AppProperties;
import com.synacy.buhosly.users.User;
import com.synacy.buhosly.users.UserRepository;
import java.time.Clock;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.MonthDay;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class BirthdayService {

    private static final Pattern FORMAT = Pattern.compile("^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$");

    private final UserRepository users;
    private final AppProperties props;
    private final Clock clock;

    public BirthdayService(UserRepository users, AppProperties props, Clock clock) {
        this.users = users;
        this.props = props;
        this.clock = clock;
    }

    /**
     * Validate + normalise an MM-DD string. Returns null when the input is null
     * (so the caller can clear the user's birthday) and the validated string
     * otherwise. Throws {@link ApiException} (HTTP 400) on any format or
     * calendar-validity violation.
     */
    public String validateAndNormalise(String raw) {
        if (raw == null) return null;
        var trimmed = raw.trim();
        if (trimmed.isEmpty()) return null;
        if (!FORMAT.matcher(trimmed).matches()) {
            throw ApiException.badRequest("birthday must be in MM-DD format");
        }
        int month = Integer.parseInt(trimmed.substring(0, 2));
        int day = Integer.parseInt(trimmed.substring(3, 5));
        try {
            // MonthDay.of validates calendar validity (rejects 02-30, 04-31, etc.)
            // but accepts 02-29 because MonthDay is leap-year agnostic.
            MonthDay.of(month, day);
        } catch (DateTimeException e) {
            throw ApiException.badRequest("birthday must be a valid MM-DD calendar date");
        }
        return trimmed;
    }

    /**
     * Apply the one-time-per-year birthday top-up if today (Asia/Manila) is the
     * user's birthday AND the user hasn't already received this year's top-up.
     * The user object is mutated and persisted; the returned boolean indicates
     * whether the top-up just fired (callers don't usually need it — the flag
     * exposed on /me is computed separately by {@link #isBirthdayToday(User)}).
     */
    public boolean applyTopupIfNeeded(User user) {
        if (user.birthday() == null) return false;
        var today = LocalDate.now(clock);
        var todayMd = MonthDay.of(today.getMonth(), today.getDayOfMonth());
        MonthDay bday;
        try {
            bday = parseMonthDay(user.birthday());
        } catch (DateTimeException e) {
            return false; // bad data — be defensive, don't crash on /me
        }
        if (!bday.equals(todayMd)) return false;
        int currentYear = today.getYear();
        if (user.lastBirthdayTopupYear() != null && user.lastBirthdayTopupYear() == currentYear) {
            return false; // already topped up this year
        }
        user.setGivingBalance(user.givingBalance() + props.allowance().birthdayTopUp());
        user.setLastBirthdayTopupYear(currentYear);
        users.save(user);
        return true;
    }

    /**
     * Returns true iff today (Asia/Manila) matches the user's MM-DD birthday
     * AND `last_birthday_topup_year` equals the current year. This is what the
     * frontend uses to decide whether to render the celebratory toast — it
     * stays true throughout the day-of, regardless of whether the top-up just
     * fired or fired earlier the same day.
     */
    public boolean isBirthdayTodayWithTopup(User user) {
        if (user.birthday() == null) return false;
        var today = LocalDate.now(clock);
        var todayMd = MonthDay.of(today.getMonth(), today.getDayOfMonth());
        MonthDay bday;
        try {
            bday = parseMonthDay(user.birthday());
        } catch (DateTimeException e) {
            return false;
        }
        if (!bday.equals(todayMd)) return false;
        return user.lastBirthdayTopupYear() != null && user.lastBirthdayTopupYear() == today.getYear();
    }

    /**
     * Return every user whose birthday matches today (Asia/Manila), excluding
     * the requester, sorted by name ascending.
     */
    public List<User> todaysBirthdays(UUID selfId) {
        var today = LocalDate.now(clock);
        var todayMd = MonthDay.of(today.getMonth(), today.getDayOfMonth());
        return users.findAll().stream()
                .filter(u -> u.birthday() != null)
                .filter(u -> !u.id().equals(selfId))
                .filter(u -> {
                    try {
                        return parseMonthDay(u.birthday()).equals(todayMd);
                    } catch (DateTimeException e) {
                        return false;
                    }
                })
                .sorted(Comparator.comparing(User::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private static MonthDay parseMonthDay(String mmdd) {
        int month = Integer.parseInt(mmdd.substring(0, 2));
        int day = Integer.parseInt(mmdd.substring(3, 5));
        return MonthDay.of(month, day);
    }

    /** Test hook — production code reads the Clock bean. */
    static ZoneId managedZone() {
        return ZoneId.of("Asia/Manila");
    }
}
