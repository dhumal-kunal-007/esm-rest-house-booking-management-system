export const getWhatsAppChatUrl = (
  mobile: string,
  message: string
): string => {
  let digits = mobile.replace(/\D/g, "");

  if (digits.length === 10) {
    digits = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = `91${digits.slice(1)}`;
  }

  if (!/^\d{11,15}$/.test(digits)) {
    throw new Error(
      "A valid phone number with country code is required for WhatsApp."
    );
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
};
