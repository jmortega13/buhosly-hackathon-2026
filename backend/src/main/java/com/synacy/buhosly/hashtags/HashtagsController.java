package com.synacy.buhosly.hashtags;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class HashtagsController {

    private final HashtagService service;

    public HashtagsController(HashtagService service) {
        this.service = service;
    }

    @GetMapping("/hashtags")
    public List<Map<String, Object>> list(@RequestParam(name = "q", required = false) String q) {
        return service.suggestions(q).stream()
                .map(h -> Map.<String, Object>of(
                        "tag", h.tag(),
                        "usageCount", h.usageCount(),
                        "lastUsedAt", h.lastUsedAt().toString()))
                .toList();
    }
}
