package onl.continuum.continuum.controller.dto.plan;

import onl.continuum.continuum.domain.plan.PlanLimits;
import onl.continuum.continuum.domain.plan.PlanType;

public record PlanInfo(
    PlanType plan,
    PlanLimits limits,
    String priceId
) {}
