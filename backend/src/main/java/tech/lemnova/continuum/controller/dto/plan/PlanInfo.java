package tech.lemnova.continuum.controller.dto.plan;

import tech.lemnova.continuum.domain.plan.PlanLimits;
import tech.lemnova.continuum.domain.plan.PlanType;

public record PlanInfo(
    PlanType plan,
    PlanLimits limits,
    String priceId
) {}
