export type ResumableBookingStep =
    | "AVAILABILITY"
    | "GUEST_TYPE"
    | "RATE"
    | "BOOKING_CONFIRMATION";

export const hasCompleteAcceptedAccommodations = (
    acceptedGuestCount: number,
    requiredGuestCount: number
): boolean =>
    requiredGuestCount > 0 &&
    acceptedGuestCount === requiredGuestCount;

export const resolveResumableBookingStep = ({
    acceptedGuestCount,
    requiredGuestCount,
    storedStep,
    hasPricing,
}: {
    acceptedGuestCount: number;
    requiredGuestCount: number;
    storedStep: string | null;
    hasPricing: boolean;
}): ResumableBookingStep | null => {
    if (acceptedGuestCount < requiredGuestCount) {
        return "AVAILABILITY";
    }

    if (storedStep === "COMPLETED" && hasPricing) {
        return "BOOKING_CONFIRMATION";
    }

    if (storedStep === "AVAILABILITY") {
        return "AVAILABILITY";
    }

    if (storedStep === "GUEST_TYPE" || storedStep === "RATE") {
        return storedStep;
    }

    if (storedStep === "BOOKING_CONFIRMATION" && hasPricing) {
        return "BOOKING_CONFIRMATION";
    }

    if (hasPricing) {
        return null;
    }

    return "GUEST_TYPE";
};
