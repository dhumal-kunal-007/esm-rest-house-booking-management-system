export type LegacyBillRateGuestType =
  | "ESM"
  | "SERVING"
  | "CIVILIAN";

export const VALID_LEGACY_BILL_GUEST_TYPES: LegacyBillRateGuestType[] = [
  "ESM",
  "SERVING",
  "CIVILIAN",
];

export interface LegacyBillRateValidationInput {
  legacyDailyRate: unknown;
  legacyGuestType: unknown;
  legacyAuthorizationReason: unknown;
  confirmLegacyRate: unknown;
  userRole?: string | null;
}

export interface LegacyBillRateValidationResult {
  isRequired: boolean;
  isValid: boolean;
  normalizedRate?: number;
  normalizedGuestType?: LegacyBillRateGuestType;
  normalizedAuthorizationReason?: string;
  error?: string;
}

export const validateLegacyBillRateOverride = (
  input: LegacyBillRateValidationInput
): LegacyBillRateValidationResult => {
  const hasAnyLegacyOverrideFields =
    input.legacyDailyRate !== undefined ||
    input.legacyGuestType !== undefined ||
    input.legacyAuthorizationReason !== undefined ||
    input.confirmLegacyRate !== undefined;

  if (!hasAnyLegacyOverrideFields) {
    return {
      isRequired: true,
      isValid: false,
      error:
        "This historical booking has no saved rate. An ADMIN must enter and confirm its officially authorized daily rate before a bill can be generated.",
    };
  }

  if (input.userRole !== "ADMIN") {
    return {
      isRequired: false,
      isValid: false,
      error: "Only an ADMIN can authorize a historical bill rate.",
    };
  }

  const legacyRate = Number(input.legacyDailyRate);
  const legacyGuestType =
    typeof input.legacyGuestType === "string"
      ? input.legacyGuestType.trim().toUpperCase()
      : "";
  const authorizationReason =
    typeof input.legacyAuthorizationReason === "string"
      ? input.legacyAuthorizationReason.trim()
      : "";

  if (
    !Number.isFinite(legacyRate) ||
    legacyRate <= 0 ||
    legacyRate > 9999999999.99 ||
    Math.abs(legacyRate * 100 - Math.round(legacyRate * 100)) > 1e-8 ||
    !VALID_LEGACY_BILL_GUEST_TYPES.includes(
      legacyGuestType as LegacyBillRateGuestType
    ) ||
    authorizationReason.length < 15 ||
    authorizationReason.length > 1000 ||
    input.confirmLegacyRate !== true
  ) {
    return {
      isRequired: false,
      isValid: false,
      error:
        "Enter a valid positive daily rate, guest type, an authorization basis of at least 15 characters, and confirm that the rate is officially authorized.",
    };
  }

  return {
    isRequired: false,
    isValid: true,
    normalizedRate: legacyRate,
    normalizedGuestType: legacyGuestType as LegacyBillRateGuestType,
    normalizedAuthorizationReason: authorizationReason,
  };
};
