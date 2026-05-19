package com.synacy.buhosly.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.synacy.buhosly.config.AppProperties;
import com.synacy.buhosly.notifications.NotificationService;
import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class AllowanceServiceTest {

    private static final ZoneId MANILA = ZoneId.of("Asia/Manila");

    private final AppProperties props = new AppProperties(
            new AppProperties.Cors(List.of()),
            new AppProperties.Jwt("0123456789012345678901234567890123", 60),
            new AppProperties.Auth(
                    List.of("synacy.com", "rise.com"),
                    List.of(),
                    new AppProperties.Auth.Google("client-id")),
            new AppProperties.Allowance(30, 20, "Asia/Manila"),
            new AppProperties.Feed(25, 100),
            new AppProperties.Giphy(""),
            new AppProperties.Mail("noreply@buhosly.demo", "http://localhost:4200"));

    @Test
    void refresh_resets_balance_when_giving_month_is_previous_month() {
        var clock = Clock.fixed(Instant.parse("2026-06-15T00:00:00Z"), MANILA);
        var users = Mockito.mock(UserRepository.class);
        var notifications = Mockito.mock(NotificationService.class);
        var service = new AllowanceService(props, clock, users, notifications);

        var stale = new User(
                UUID.randomUUID(), "a@b.c", "A", 12, YearMonth.of(2026, 5), 200, Instant.parse("2026-01-01T00:00:00Z"));
        when(users.save(stale)).thenReturn(stale);

        var refreshed = service.refreshIfNeeded(stale);

        assertThat(refreshed.givingBalance()).isEqualTo(30);
        assertThat(refreshed.givingMonth()).isEqualTo(YearMonth.of(2026, 6));
        assertThat(refreshed.earnedBalance()).isEqualTo(200);
        verify(users).save(stale);
        verify(notifications).giveableRefreshed(eq(stale), eq(YearMonth.of(2026, 6)), anyInt());
    }

    @Test
    void refresh_does_not_touch_same_month_users() {
        var clock = Clock.fixed(Instant.parse("2026-06-15T00:00:00Z"), MANILA);
        var users = Mockito.mock(UserRepository.class);
        var notifications = Mockito.mock(NotificationService.class);
        var service = new AllowanceService(props, clock, users, notifications);

        var current = new User(
                UUID.randomUUID(), "a@b.c", "A", 12, YearMonth.of(2026, 6), 200, Instant.parse("2026-01-01T00:00:00Z"));

        var result = service.refreshIfNeeded(current);

        assertThat(result).isSameAs(current);
        verify(users, never()).save(any());
        verify(notifications, never()).giveableRefreshed(any(), any(), anyInt());
    }

    @Test
    void refresh_fires_when_utc_says_31st_but_manila_already_on_1st() {
        var utcClock = Clock.fixed(Instant.parse("2026-05-31T23:00:00Z"), ZoneOffset.UTC);
        var manilaClock = Clock.fixed(Instant.parse("2026-05-31T23:00:00Z"), MANILA);
        var users = Mockito.mock(UserRepository.class);
        var notifications = Mockito.mock(NotificationService.class);
        var service = new AllowanceService(props, manilaClock, users, notifications);

        var stale = new User(
                UUID.randomUUID(), "a@b.c", "A", 7, YearMonth.of(2026, 5), 50, Instant.parse("2026-01-01T00:00:00Z"));
        when(users.save(stale)).thenReturn(stale);

        var refreshed = service.refreshIfNeeded(stale);

        assertThat(refreshed.givingMonth()).isEqualTo(YearMonth.of(2026, 6));
        assertThat(refreshed.givingBalance()).isEqualTo(30);
        verify(users).save(stale);
        assertThat(YearMonth.now(utcClock)).isEqualTo(YearMonth.of(2026, 5));
    }
}
