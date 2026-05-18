package com.synacy.buhosly;

import com.synacy.buhosly.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class BuhoslyApplication {

    public static void main(String[] args) {
        SpringApplication.run(BuhoslyApplication.class, args);
    }
}
