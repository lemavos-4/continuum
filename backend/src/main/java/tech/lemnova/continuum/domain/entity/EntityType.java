package tech.lemnova.continuum.domain.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum EntityType {
    PERSON, PROJECT, TOPIC, ORGANIZATION, ACTIVITY;

    @JsonValue
    @Override
    public String toString() {
        return this.name();
    }

    @JsonCreator
    public static EntityType fromValue(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("EntityType cannot be null or empty");
        }
        try {
            return EntityType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid EntityType: '" + value + "'. Valid values are: PERSON, PROJECT, TOPIC, ORGANIZATION, ACTIVITY");
        }
    }
}