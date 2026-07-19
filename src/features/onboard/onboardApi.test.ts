import { describe, expect, it } from "vitest";

import {
  checklistToSteps,
  deriveStepsFromOnboardingMe,
  enrollmentStatusToCursor,
  mapChecklistStatusToUiStatus,
  parseOnboardingMe,
  parseProvisioningChecklist,
  stepsFromCursor,
} from "./onboardApi";

describe("onboardApi helpers", () => {
  it("maps checklist API statuses to UI step statuses", () => {
    expect(mapChecklistStatusToUiStatus("passed")).toBe("completed");
    expect(mapChecklistStatusToUiStatus("skipped")).toBe("completed");
    expect(mapChecklistStatusToUiStatus("in_progress")).toBe("processing");
    expect(mapChecklistStatusToUiStatus("failed")).toBe("failed");
    expect(mapChecklistStatusToUiStatus("blocked")).toBe("blocked");
    expect(mapChecklistStatusToUiStatus("not_started")).toBe("pending");
  });

  it("builds ordered steps from checklist rows", () => {
    const steps = checklistToSteps([
      { step_key: "church_profile", step_name: "Preparing Church Profile", status: "passed" },
      { step_key: "database_storage", step_name: "Provisioning Database & Storage", status: "in_progress" },
      { step_key: "users_roles", step_name: "Configuring Users, Roles & Permissions", status: "not_started" },
    ]);
    expect(steps).toHaveLength(6);
    expect(steps[0]?.status).toBe("completed");
    expect(steps[1]?.status).toBe("processing");
    expect(steps[2]?.status).toBe("pending");
    expect(steps[5]?.label).toBe("Running Final Validation");
  });

  it("derives cursor from enrollment status", () => {
    expect(enrollmentStatusToCursor("provisioning")).toBe(2);
    expect(enrollmentStatusToCursor("active")).toBe(6);
    expect(stepsFromCursor(2)[2]?.status).toBe("processing");
  });

  it("derives steps from onboarding me slice during record setup", () => {
    const steps = deriveStepsFromOnboardingMe({
      onboardingRequestId: "ONB_TEST",
      status: "record_tables_review",
      mustChangePassword: false,
      tableConfigurationCompleted: false,
      layoutConfigurationCompleted: false,
      firstLoginCompleted: true,
    });
    expect(steps[4]?.status).toBe("processing");
    expect(steps[5]?.status).toBe("pending");
  });

  it("parses onboarding me payload", () => {
    expect(
      parseOnboardingMe({
        success: true,
        onboarding: {
          onboarding_request_id: "ONB_123",
          status: "provisioning",
          must_change_password: 1,
          table_configuration_completed: false,
          layout_configuration_completed: false,
          first_login_completed: true,
        },
      }),
    ).toEqual({
      onboardingRequestId: "ONB_123",
      status: "provisioning",
      mustChangePassword: true,
      tableConfigurationCompleted: false,
      layoutConfigurationCompleted: false,
      firstLoginCompleted: true,
    });
    expect(parseOnboardingMe({ success: true, onboarding: null })).toEqual({
      onboardingRequestId: null,
      status: null,
      mustChangePassword: false,
      tableConfigurationCompleted: false,
      layoutConfigurationCompleted: false,
      firstLoginCompleted: false,
    });
  });

  it("parses provisioning checklist payload", () => {
    expect(
      parseProvisioningChecklist({
        success: true,
        checklist: [
          { step_key: "final_validation", step_name: "Running Final Validation", status: "passed" },
        ],
      }),
    ).toEqual([
      { step_key: "final_validation", step_name: "Running Final Validation", status: "passed" },
    ]);
    expect(parseProvisioningChecklist({ success: false })).toEqual([]);
  });
});
