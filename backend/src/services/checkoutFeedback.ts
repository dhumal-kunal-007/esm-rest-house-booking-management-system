export const areCheckoutFeedbackRatingsValid = (
  ratings: readonly unknown[]
): boolean =>
  ratings.length === 5 &&
  ratings.every(
    (rating) =>
      typeof rating === "number" &&
      Number.isInteger(rating) &&
      rating >= 1 &&
      rating <= 5
  );
