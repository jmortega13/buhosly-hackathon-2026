package com.synacy.buhosly.gifs;

import com.synacy.buhosly.common.ApiException;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class GifsController {

    private final GiphyClient giphy;

    public GifsController(GiphyClient giphy) {
        this.giphy = giphy;
    }

    @GetMapping("/gifs")
    public List<Map<String, String>> search(@RequestParam(name = "q", required = false) String q) {
        if (q == null || q.isBlank()) {
            throw ApiException.badRequest("q is required");
        }
        return giphy.search(q.trim()).stream()
                .map(r -> Map.of(
                        "id", r.id(),
                        "previewUrl", r.previewUrl(),
                        "gifUrl", r.gifUrl(),
                        "alt", r.alt() == null ? "" : r.alt()))
                .toList();
    }
}
