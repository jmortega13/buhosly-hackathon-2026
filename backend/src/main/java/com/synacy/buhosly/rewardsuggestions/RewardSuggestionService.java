package com.synacy.buhosly.rewardsuggestions;

import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.config.AppProperties;
import com.synacy.buhosly.users.User;
import com.synacy.buhosly.users.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RewardSuggestionService {

    private final RewardSuggestionRepository suggestions;
    private final RewardSuggestionVoteRepository votes;
    private final UserRepository users;
    private final AppProperties props;

    public RewardSuggestionService(
            RewardSuggestionRepository suggestions,
            RewardSuggestionVoteRepository votes,
            UserRepository users,
            AppProperties props) {
        this.suggestions = suggestions;
        this.votes = votes;
        this.users = users;
        this.props = props;
    }

    @Transactional
    public Map<String, Object> create(UUID suggesterId, String name, String description, String imageUrl) {
        if (name == null || name.isBlank() || name.length() > 100) {
            throw ApiException.badRequest("name is required and must be ≤ 100 characters");
        }
        var normalisedImage = normaliseImageUrl(imageUrl);
        var now = Instant.now();
        var s = new RewardSuggestion(
                UUID.randomUUID(),
                name.trim(),
                description == null ? "" : description,
                normalisedImage,
                suggesterId,
                now);
        suggestions.save(s);
        votes.save(new RewardSuggestionVote(s.id(), suggesterId, now));
        return view(s, 1, true, lookupUser(suggesterId));
    }

    public List<Map<String, Object>> listOpen(UUID requesterId) {
        return assemble(suggestions.findAllByStatusOrderByCreatedAtDesc(RewardSuggestion.STATUS_OPEN),
                        requesterId, /*sortByVotes=*/ true);
    }

    public List<Map<String, Object>> listAll(UUID requesterId) {
        return assemble(suggestions.findAllByOrderByCreatedAtDesc(), requesterId, false);
    }

    @Transactional
    public Map<String, Object> toggleVote(UUID suggestionId, UUID userId) {
        var s = suggestions.findById(suggestionId)
                .orElseThrow(() -> ApiException.notFound("suggestion not found"));
        if (!RewardSuggestion.STATUS_OPEN.equals(s.status())) {
            throw new ApiException(
                    org.springframework.http.HttpStatus.CONFLICT, "suggestion is no longer open");
        }
        var pk = new RewardSuggestionVote.Pk(suggestionId, userId);
        boolean nowVoted;
        if (votes.existsById(pk)) {
            votes.deleteById(pk);
            nowVoted = false;
        } else {
            votes.save(new RewardSuggestionVote(suggestionId, userId, Instant.now()));
            nowVoted = true;
        }
        long count = votes.countBySuggestionId(suggestionId);
        return view(s, count, nowVoted, lookupUser(s.suggestedByUserId()));
    }

    @Transactional
    public void delete(UUID suggestionId, UUID requesterId) {
        var s = suggestions.findById(suggestionId)
                .orElseThrow(() -> ApiException.notFound("suggestion not found"));
        boolean isSuggester = s.suggestedByUserId().equals(requesterId);
        boolean isAdmin = isAdminEmail(requesterId);
        if (!isSuggester && !isAdmin) {
            throw ApiException.forbidden("only the suggester or an admin can delete");
        }
        // ON DELETE CASCADE on suggestion_id removes the votes.
        suggestions.deleteById(suggestionId);
    }

    Map<String, Object> view(RewardSuggestion s, long voteCount, boolean hasVoted, User suggester) {
        var m = new LinkedHashMap<String, Object>();
        m.put("id", s.id().toString());
        m.put("name", s.name());
        m.put("description", s.description());
        m.put("imageUrl", s.imageUrl() == null ? "" : s.imageUrl());
        m.put("suggestedBy", Map.of(
                "id", s.suggestedByUserId().toString(),
                "name", suggester == null ? "(unknown)" : suggester.name()));
        m.put("voteCount", voteCount);
        m.put("hasVoted", hasVoted);
        m.put("status", s.status());
        m.put("createdAt", s.createdAt().toString());
        if (s.promotedRewardId() != null) {
            m.put("promotedRewardId", s.promotedRewardId().toString());
        }
        return m;
    }

    private List<Map<String, Object>> assemble(
            List<RewardSuggestion> sList, UUID requesterId, boolean sortByVotes) {
        if (sList.isEmpty()) return List.of();
        var allIds = sList.stream().map(RewardSuggestion::id).toList();
        var allVotes = votes.findAllBySuggestionIdIn(allIds);
        var countById = new HashMap<UUID, Long>();
        boolean hasRequester = requesterId != null;
        var votedByRequester = new java.util.HashSet<UUID>();
        for (var v : allVotes) {
            countById.merge(v.suggestionId(), 1L, Long::sum);
            if (hasRequester && v.userId().equals(requesterId)) {
                votedByRequester.add(v.suggestionId());
            }
        }
        var byId = new HashMap<UUID, User>();
        users.findAll().forEach(u -> byId.put(u.id(), u));
        var assembled = new ArrayList<Map<String, Object>>(sList.size());
        for (var s : sList) {
            long count = countById.getOrDefault(s.id(), 0L);
            boolean voted = votedByRequester.contains(s.id());
            assembled.add(view(s, count, voted, byId.get(s.suggestedByUserId())));
        }
        if (sortByVotes) {
            assembled.sort(Comparator
                    .comparingLong((Map<String, Object> m) -> (Long) m.get("voteCount"))
                    .reversed()
                    .thenComparing(m -> ((String) m.get("createdAt")), Comparator.reverseOrder()));
        }
        return assembled;
    }

    private User lookupUser(UUID id) {
        return users.findById(id).orElse(null);
    }

    private boolean isAdminEmail(UUID userId) {
        var user = users.findById(userId).orElse(null);
        if (user == null) return false;
        var adminList = props.auth().adminEmails();
        if (adminList == null) return false;
        for (var a : adminList) {
            if (a != null && a.equalsIgnoreCase(user.email())) return true;
        }
        return false;
    }

    public static String normaliseImageUrl(String raw) {
        if (raw == null) return null;
        var trimmed = raw.trim();
        if (trimmed.isEmpty()) return null;
        if (!trimmed.startsWith("https://") || trimmed.length() > 2048) {
            throw ApiException.badRequest("imageUrl must be a valid https URL");
        }
        return trimmed;
    }
}
