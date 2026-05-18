package com.synacy.buhosly.recognitions;

import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.config.AppProperties;
import com.synacy.buhosly.users.AllowanceService;
import com.synacy.buhosly.users.User;
import com.synacy.buhosly.users.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecognitionService {

    private static final Logger log = LoggerFactory.getLogger(RecognitionService.class);

    private final UserRepository users;
    private final AllowanceService allowance;
    private final RecognitionRepository recognitions;
    private final AppProperties props;

    public RecognitionService(
            UserRepository users,
            AllowanceService allowance,
            RecognitionRepository recognitions,
            AppProperties props) {
        this.users = users;
        this.allowance = allowance;
        this.recognitions = recognitions;
        this.props = props;
    }

    @Transactional
    public List<Recognition> give(
            UUID giverId, List<UUID> recipientIds, int amount, String message, List<String> hashtags) {
        User giver = users.findById(giverId).orElseThrow(() -> ApiException.unauthorized("user not found"));
        giver = allowance.refreshIfNeeded(giver);

        if (recipientIds == null || recipientIds.isEmpty()) {
            throw ApiException.badRequest("at least one recipient is required");
        }
        var uniqueRecipients = new HashSet<>(recipientIds);
        if (uniqueRecipients.size() != recipientIds.size()) {
            throw ApiException.badRequest("duplicate recipients are not allowed");
        }
        if (uniqueRecipients.contains(giverId)) {
            throw ApiException.badRequest("cannot recognize yourself");
        }
        if (amount <= 0) {
            throw ApiException.badRequest("amount must be a positive integer");
        }
        if (message == null || message.isBlank()) {
            throw ApiException.badRequest("message is required");
        }
        if (hashtags == null || hashtags.isEmpty()) {
            throw ApiException.badRequest("at least one hashtag is required");
        }
        Set<String> allowed = new HashSet<>(props.hashtags());
        for (var tag : hashtags) {
            if (!allowed.contains(tag)) {
                throw ApiException.badRequest("disallowed hashtag: " + tag);
            }
        }

        var recipientsLoaded = new ArrayList<User>(recipientIds.size());
        var missing = new ArrayList<UUID>();
        for (var id : recipientIds) {
            users.findById(id).ifPresentOrElse(recipientsLoaded::add, () -> missing.add(id));
        }
        if (!missing.isEmpty()) {
            throw ApiException.notFound("recipient(s) not found: "
                    + missing.stream().map(UUID::toString).reduce((a, b) -> a + "," + b).orElse(""));
        }

        int totalCost = amount * recipientIds.size();
        if (giver.givingBalance() < totalCost) {
            throw ApiException.badRequest("insufficient giving balance");
        }

        var now = Instant.now();
        var created = new ArrayList<Recognition>(recipientIds.size());
        try {
            for (var recipient : recipientsLoaded) {
                var rec = new Recognition(
                        UUID.randomUUID(),
                        giver.id(),
                        recipient.id(),
                        amount,
                        message.trim(),
                        List.copyOf(hashtags),
                        now);
                recognitions.save(rec);
                created.add(rec);
            }
            for (var recipient : recipientsLoaded) {
                recipient.setEarnedBalance(recipient.earnedBalance() + amount);
                users.save(recipient);
            }
            giver.setGivingBalance(giver.givingBalance() - totalCost);
            users.save(giver);
        } catch (RuntimeException e) {
            log.error(
                    "Give recognition failed: giverId={}, recipients={}, amount={}",
                    giverId, recipientIds, amount, e);
            throw e;
        }
        return List.copyOf(created);
    }

    public Page<Recognition> page(int page, int size) {
        return recognitions.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
    }
}
