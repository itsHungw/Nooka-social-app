package com.vinhung.nookaapi.architecture;

import com.vinhung.nookaapi.NookaApiApplication;
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ModularityTest {

    @Test
    void modulesRespectDeclaredDependencies() {
        ApplicationModules.of(NookaApiApplication.class).verify();
    }
}