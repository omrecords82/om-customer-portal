import { Stepper } from "@mantine/core";
import { WIZARD_STEP_LABELS, wizardStepIndex, type WizardStepId } from "./onboardWizardApi";

type OnboardingWizardStepperProps = {
  readonly activeStep: WizardStepId;
};

export function OnboardingWizardStepper({
  activeStep,
}: OnboardingWizardStepperProps) {
  const active = wizardStepIndex(activeStep);

  return (
    <Stepper active={active} size="sm" mb="lg">
      {WIZARD_STEP_LABELS.map((label) => (
        <Stepper.Step key={label} label={label} />
      ))}
    </Stepper>
  );
}
