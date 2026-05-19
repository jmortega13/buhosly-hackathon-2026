package com.synacy.buhosly.recognitions;

import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.hashtags.HashtagService;
import com.synacy.buhosly.users.AllowanceService;
import com.synacy.buhosly.users.User;
import com.synacy.buhosly.users.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
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
    private final HashtagService hashtags;

    public RecognitionService(
            UserRepository users,
            AllowanceService allowance,
            RecognitionRepository recognitions,
            HashtagService hashtags) {
        this.users = users;
        this.allowance = allowance;
        this.recognitions = recognitions;
        this.hashtags = hashtags;
    }

    @Transactional
    public List<Recognition> give(
            UUID giverId,
            List<UUID> recipientIds,
            int amount,
            String message,
            List<String> hashtagsIn,
            String gifUrl) {
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
        var normalisedTags = new LinkedHashSet<String>();
        if (hashtagsIn != null) {
            for (var raw : hashtagsIn) {
                var tag = HashtagService.normalize(raw);
                if (!HashtagService.FORMAT.matcher(tag).matches()) {
                    throw ApiException.badRequest("malformed hashtag: " + raw);
                }
                normalisedTags.add(tag);
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

        String normalisedGif = null;
        if (gifUrl != null && !gifUrl.isBlank()) {
            var trimmed = gifUrl.trim();
            if (trimmed.length() > 2048 || !trimmed.startsWith("https://")) {
                throw ApiException.badRequest("gifUrl must be a valid https URL");
            }
            normalisedGif = trimmed;
        }

        var now = Instant.now();
        var tagList = List.copyOf(normalisedTags);
        var created = new ArrayList<Recognition>(recipientIds.size());
        try {
            for (var recipient : recipientsLoaded) {
                var rec = new Recognition(
                        UUID.randomUUID(),
                        giver.id(),
                        recipient.id(),
                        amount,
                        message.trim(),
                        tagList,
                        now,
                        normalisedGif);
                recognitions.save(rec);
                created.add(rec);
            }
            for (var recipient : recipientsLoaded) {
                recipient.setEarnedBalance(recipient.earnedBalance() + amount);
                users.save(recipient);
            }
            giver.setGivingBalance(giver.givingBalance() - totalCost);
            users.save(giver);
            hashtags.recordAll(normalisedTags);
        } catch (RuntimeException e) {
            log.error(
                    "Give recognition failed: giverId={}, recipients={}, amount={}",
                    giverId, recipientIds, amount, e);
            throw e;
        }
        return List.copyOf(created);
    }

    public Page<Recognition> page(int page, int size) {
        return recognitions.findAllByOrderByCreatedAtDescGiverIdAsc(PageRequest.of(page, size));
    }
}
