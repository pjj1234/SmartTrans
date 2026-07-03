---
name: severity-enhancer
description: |
  Enhanced severity assessment guidance for the Severity Agent. Provides structured 
  injury risk classification criteria, property damage categorization standards, 
  confidence level calibration rules, and multi-factor severity matrix. Use when 
  accident involves multiple vehicles, potential injuries, or significant property damage.
---

# Traffic Accident Severity Assessment Enhancement

## Overview

This skill provides the Severity Agent with structured criteria for evaluating accident 
severity, including injury risk estimation, property damage classification, and 
confidence calibration to produce more consistent and well-reasoned assessments.

## Instructions

### 1. Severity Level Criteria

Determine the overall severity level by the highest applicable criterion:

**Minor:**
- Vehicle damage: cosmetic only (scratches, small dents, replaceable parts)
- Injuries: no injuries reported or minor (bruises, minor cuts, whiplash without complications)
- Property damage: estimated below $5,000
- All parties able to drive away from the scene

**Moderate:**
- Vehicle damage: functional impairment but repairable (broken lights, deployed airbags, panel damage)
- Injuries: non-life-threatening requiring medical attention (fractures, lacerations, concussion)
- Property damage: $5,000 - $50,000 range
- At least one vehicle requires towing
- Possible fluid leaks or minor fire

**Severe:**
- Vehicle damage: total loss likely (frame damage, cabin intrusion, fire)
- Injuries: life-threatening or fatal (severe head trauma, internal bleeding, spinal injury, fatality)
- Property damage: exceeds $50,000
- Multiple vehicles totaled
- Hazmat involvement (fuel tanker, chemical transport)
- Entrapment requiring extraction

### 2. Injury Risk Assessment

Evaluate injury probability and severity for each involved party:

1. **Impact Type Factor**: Head-on > side (T-bone) > rear-end > sideswipe (from most to least severe)
2. **Speed Factor**: Estimated impact speed — higher speed exponentially increases injury severity
3. **Restraint Factor**: Seatbelt use (inferred from airbag deployment context), child seat presence
4. **Vulnerable Party Factor**: Pedestrians, cyclists, motorcyclists — automatically elevate injury risk by one level
5. **Age/Health Indicators**: Note if visible information suggests elderly or child passengers (do NOT fabricate)

### 3. Property Damage Classification

Categorize damage for each vehicle:

| Category | Description | Typical Cost |
|----------|-------------|-------------|
| Light | Cosmetic — scratches, minor dents, replaceable mirrors/lights | <$5,000 |
| Medium | Functional damage — panels, glass, deployed airbags, repairable structural | $5,000-$30,000 |
| Heavy | Major structural — frame damage, cabin deformation, engine compartment crush | $30,000-$80,000 |
| Total Loss | Repair cost exceeds vehicle value, fire damage, submersion | Market value |

Also note:
- Third-party property damage (guardrails, buildings, utility poles, other parked vehicles)
- Environmental damage (fuel/oil spills, hazardous material release)
- Cargo loss or damage for commercial vehicles

### 4. Confidence Calibration

Assign confidence level (0.0 to 1.0) based on information completeness:

- **0.9-1.0**: Clear, high-quality images of all involved vehicles from multiple angles; explicit description of all parties
- **0.7-0.89**: Good images but some angles missing; description covers key details
- **0.5-0.69**: Limited images or poor quality; partial description; reasonable inferences required
- **0.3-0.49**: Single image or very poor quality; minimal description; significant uncertainty
- **0.1-0.29**: Extremely limited information; assessment is largely speculative

If confidence is below 0.5, explicitly state what additional information would improve the assessment.

### 5. Multi-Factor Severity Matrix

Use the following decision logic:
1. Start with the most severe injury indicator
2. Escalate if property damage is one category higher
3. Escalate if weather/road conditions were hazardous (Grade C or D)
4. Escalate if vulnerable road users were involved
5. Do NOT downgrade severity based on uncertain or missing information

## Output Requirements

- Severity level must be one of: minor, moderate, severe
- Confidence must be a number between 0 and 1
- Injury risk must address EACH involved party separately
- Reasoning should explicitly reference which factors were decisive
