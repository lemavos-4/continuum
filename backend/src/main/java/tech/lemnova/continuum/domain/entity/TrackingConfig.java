package tech.lemnova.continuum.domain.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TrackingConfig {

    private boolean enabled = false;
    private TrackingFrequency frequency = TrackingFrequency.DAILY;
    private TrackingUnit unit;
    private Double targetValue;
    private boolean streakEnabled = false;
    private boolean allowDecimals = false;

    public static TrackingConfig daily() {
        var c = new TrackingConfig();
        c.setEnabled(true);
        c.setFrequency(TrackingFrequency.DAILY);
        return c;
    }

    public static TrackingConfig dailyWithTarget(TrackingUnit unit, double target) {
        var c = daily();
        c.setUnit(unit);
        c.setTargetValue(target);
        return c;
    }

    public static TrackingConfig custom(TrackingUnit unit) {
        var c = new TrackingConfig();
        c.setEnabled(true);
        c.setFrequency(TrackingFrequency.CUSTOM);
        c.setUnit(unit);
        return c;
    }
}
