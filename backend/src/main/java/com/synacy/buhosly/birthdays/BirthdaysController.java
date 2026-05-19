package com.synacy.buhosly.birthdays;

import com.synacy.buhosly.auth.CurrentUser;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/birthdays")
public class BirthdaysController {

    private final BirthdayService service;

    public BirthdaysController(BirthdayService service) {
        this.service = service;
    }

    @GetMapping("/today")
    public List<Map<String, Object>> today() {
        var self = UUID.fromString(CurrentUser.requireId());
        return service.todaysBirthdays(self).stream()
                .map(u -> Map.<String, Object>of(
                        "id", u.id().toString(), "name", u.name(), "email", u.email()))
                .toList();
    }
}
