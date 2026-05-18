package com.synacy.buhosly.users;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.YearMonth;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String name;

    @Column(name = "giving_balance", nullable = false)
    private int givingBalance;

    @Column(name = "giving_month", nullable = false, length = 7)
    private YearMonth givingMonth;

    @Column(name = "earned_balance", nullable = false)
    private int earnedBalance;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Version
    @Column(name = "row_version", nullable = false)
    private int rowVersion;

    protected User() {}

    public User(
            UUID id,
            String email,
            String name,
            int givingBalance,
            YearMonth givingMonth,
            int earnedBalance,
            Instant createdAt) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.givingBalance = givingBalance;
        this.givingMonth = givingMonth;
        this.earnedBalance = earnedBalance;
        this.createdAt = createdAt;
    }

    public UUID id() {
        return id;
    }

    public String email() {
        return email;
    }

    public String name() {
        return name;
    }

    public int givingBalance() {
        return givingBalance;
    }

    public YearMonth givingMonth() {
        return givingMonth;
    }

    public int earnedBalance() {
        return earnedBalance;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public int rowVersion() {
        return rowVersion;
    }

    public void setGivingBalance(int givingBalance) {
        this.givingBalance = givingBalance;
    }

    public void setGivingMonth(YearMonth givingMonth) {
        this.givingMonth = givingMonth;
    }

    public void setEarnedBalance(int earnedBalance) {
        this.earnedBalance = earnedBalance;
    }
}
