package com.synacy.buhosly.notifications;

import com.synacy.buhosly.auth.CurrentUser;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationsController {

    private final NotificationService service;

    public NotificationsController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(defaultValue = "20") int limit) {
        var me = UUID.fromString(CurrentUser.requireId());
        return service.recent(me, limit).stream().map(NotificationsController::toView).toList();
    }

    @GetMapping("/unread-count")
    public Map<String, Object> unreadCount() {
        var me = UUID.fromString(CurrentUser.requireId());
        return Map.of("count", service.unreadCount(me));
    }

    @PostMapping("/{id}/read")
    public Map<String, Object> markRead(@PathVariable UUID id) {
        var me = UUID.fromString(CurrentUser.requireId());
        return toView(service.markRead(id, me));
    }

    @PostMapping("/read-all")
    public Map<String, Object> markAllRead() {
        var me = UUID.fromString(CurrentUser.requireId());
        return Map.of("updated", service.markAllRead(me));
    }

    static Map<String, Object> toView(Notification n) {
        var m = new LinkedHashMap<String, Object>();
        m.put("id", n.id().toString());
        m.put("type", n.type());
        m.put("title", n.title());
        m.put("body", n.body());
        m.put("payload", n.payload());
        m.put("createdAt", n.createdAt().toString());
        m.put("readAt", n.readAt() == null ? null : n.readAt().toString());
        return m;
    }
}
