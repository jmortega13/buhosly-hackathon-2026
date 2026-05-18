package com.synacy.buhosly.gifs;

import com.fasterxml.jackson.databind.JsonNode;
import com.synacy.buhosly.common.ApiException;
import com.synacy.buhosly.config.AppProperties;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class GiphyClient {

    private static final Logger log = LoggerFactory.getLogger(GiphyClient.class);

    private final AppProperties props;
    private final RestClient http;

    public GiphyClient(AppProperties props) {
        this.props = props;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(8).toMillis());
        this.http = RestClient.builder().requestFactory(factory).build();
    }

    public List<GifResult> search(String query) {
        var apiKey = props.giphy() == null ? null : props.giphy().apiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw ApiException.serviceUnavailable("gif search is not configured on the server");
        }
        try {
            JsonNode root = http.get()
                    .uri(uri -> uri.scheme("https")
                            .host("api.giphy.com")
                            .path("/v1/gifs/search")
                            .queryParam("q", query)
                            .queryParam("api_key", apiKey)
                            .queryParam("limit", 20)
                            .queryParam("rating", "pg")
                            .queryParam("lang", "en")
                            .build())
                    .retrieve()
                    .body(JsonNode.class);
            if (root == null || !root.hasNonNull("data")) return List.of();
            var out = new ArrayList<GifResult>();
            for (JsonNode item : root.get("data")) {
                var id = textOrEmpty(item, "id");
                var alt = textOrEmpty(item, "title");
                var images = item.get("images");
                if (images == null) continue;
                var preview = images.get("fixed_width");
                if (preview == null) preview = images.get("fixed_height_small");
                if (preview == null) preview = images.get("preview_gif");
                var full = images.get("original");
                if (preview == null || full == null) continue;
                var previewUrl = textOrEmpty(preview, "url");
                var gifUrl = textOrEmpty(full, "url");
                if (previewUrl.isBlank() || gifUrl.isBlank()) continue;
                out.add(new GifResult(id, previewUrl, gifUrl, alt));
            }
            return out;
        } catch (RestClientResponseException e) {
            log.warn("Giphy responded with {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw ApiException.serviceUnavailable("gif search temporarily unavailable");
        } catch (ResourceAccessException e) {
            log.warn("Giphy unreachable: {}", e.getMessage());
            throw ApiException.serviceUnavailable("gif search temporarily unavailable");
        } catch (RuntimeException e) {
            log.error("Unexpected Giphy failure", e);
            throw ApiException.serviceUnavailable("gif search temporarily unavailable");
        }
    }

    private static String textOrEmpty(JsonNode node, String field) {
        var v = node.get(field);
        return v == null || v.isNull() ? "" : v.asText();
    }

    public record GifResult(String id, String previewUrl, String gifUrl, String alt) {}
}
