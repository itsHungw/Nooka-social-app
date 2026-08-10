package com.vinhung.nookaapi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.modulith.Modulithic;

@Modulithic
@SpringBootApplication
public class NookaApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(NookaApiApplication.class, args);
    }
}