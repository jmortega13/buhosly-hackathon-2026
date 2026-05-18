package com.synacy.buhosly;

import org.junit.jupiter.api.Test;

class BuhoslyApplicationTests {

    // Full Spring context boot requires JWT_SECRET and Sheets credentials env vars
    // and is exercised by `./mvnw spring-boot:run`. Keeping a trivial sanity test
    // here so the test classpath is wired correctly.
    @Test
    void sanity() {}
}
