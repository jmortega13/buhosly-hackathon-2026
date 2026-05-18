package com.synacy.buhosly.hashtags;

import com.synacy.buhosly.common.ApiException;
import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class HashtagService {

    public static final Pattern FORMAT = Pattern.compile("^[a-z0-9][a-z0-9_-]{0,63}$");
    private static final int MAX_RESULTS = 50;

    private final HashtagRepository repo;

    public HashtagService(HashtagRepository repo) {
        this.repo = repo;
    }

    public List<Hashtag> suggestions(String prefix) {
        var page = PageRequest.of(0, MAX_RESULTS);
        if (prefix == null || prefix.isBlank()) {
            return repo.findByOrderByUsageCountDescLastUsedAtDesc(page);
        }
        return repo.findByTagStartingWithOrderByUsageCountDescLastUsedAtDesc(normalize(prefix), page);
    }

    public void recordAll(Collection<String> tags) {
        if (tags == null || tags.isEmpty()) return;
        var deduped = new LinkedHashSet<String>();
        for (var raw : tags) {
            deduped.add(normalize(raw));
        }
        var now = Instant.now();
        for (var tag : deduped) {
            if (!FORMAT.matcher(tag).matches()) {
                throw ApiException.badRequest("malformed hashtag: " + tag);
            }
            repo.upsert(tag, now);
        }
    }

    public static String normalize(String raw) {
        if (raw == null) return "";
        var s = raw.trim().toLowerCase();
        if (s.startsWith("#")) s = s.substring(1);
        return s;
    }
}
