package tech.lemnova.continuum.application.service;

import org.junit.jupiter.api.Test;
import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

class SubscriptionServiceUnitTest {

    @Test
    void determinePlan_and_mapStatus_usingReflection() throws Exception {
        // instantiate real service with null deps via reflection
        Class<?> cls = SubscriptionService.class;
        var cons = cls.getDeclaredConstructors()[0];
        cons.setAccessible(true);
        Object svc = cons.newInstance(new Object[]{null, null, null, null});

        Method determine = cls.getDeclaredMethod("determinePlan", String.class);
        determine.setAccessible(true);

        Method map = cls.getDeclaredMethod("mapStatus", String.class);
        map.setAccessible(true);

        Object p1 = determine.invoke(svc, "price_vision_id");
        assertThat(p1).isNotNull();

        Object s1 = map.invoke(svc, "active");
        assertThat(s1.toString().toLowerCase()).contains("active");
    }
}
