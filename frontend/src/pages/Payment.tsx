import { useEffect, useState } from "react";
import QRCode from "qrcode";

import "../App.css";
import { apiFetch } from "../api";

import { useLanguage } from "../i18n/LanguageContext";

/* =================================
   TYPES
================================== */

export type PaymentMethod =
  | "CASH"
  | "ONLINE"
  | "UPI"
  | "CHEQUE";

export interface PaymentData {
  bookingId?: string;

  bookingReference?: string;

  guestName: string;

  guestType:
    | "ESM"
    | "SERVING"
    | "CIVILIAN";

  approvedAmount: number;

  amountReceived: number;

  paymentMethod: PaymentMethod;

  transactionNumber: string;

  paymentDate: string;

  remarks: string;
}

interface PaymentProps {
  officerName: string;

  bookingId?: string;

  bookingReference?: string;

  guestName: string;

  guestType:
    | "ESM"
    | "SERVING"
    | "CIVILIAN";

  approvedAmount: number;

  onBack: () => void;

  onContinue: (
    payment: PaymentData
  ) => void;
}

/* =================================
   CURRENCY
================================== */

const formatCurrency = (
  amount: number
): string => {
  return `₹${amount.toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 0,
    }
  )}`;
};

/* =================================
   TODAY
================================== */

const getTodayDate = (): string => {

  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
};

/* =================================
   COMPONENT
================================== */

function Payment({
  officerName,
  bookingId,
  bookingReference,
  guestName,
  guestType,
  approvedAmount,
  onBack,
  onContinue,
}: PaymentProps) {

  const {
    language,
    setLanguage,
  } = useLanguage();

  const isMarathi =
    language === "mr";

  /* =================================
     STATE
  ================================== */

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<PaymentMethod>(
      "CASH"
    );

  const [
    transactionNumber,
    setTransactionNumber,
  ] =
    useState("");

  const [
    amountReceived,
    setAmountReceived,
  ] =
    useState(
      approvedAmount
        .toString()
    );

  const [
    paymentDate,
    setPaymentDate,
  ] =
    useState(
      getTodayDate()
    );

  const [
    remarks,
    setRemarks,
  ] =
    useState("");
  const [upiConfiguration, setUpiConfiguration] =
    useState<{ upi_id: string; payee_name: string } | null>(null);
  const [upiQrCode, setUpiQrCode] = useState("");
  const [upiQrError, setUpiQrError] = useState("");
  const receivedAmount = Number(amountReceived) || 0;

  useEffect(() => {
    let cancelled = false;

    const loadUpiConfiguration = async () => {
      try {
        const response = await apiFetch(
          "http://localhost:5000/api/payments/configuration"
        );
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Unable to load UPI configuration."
          );
        }
        if (!cancelled) {
          setUpiConfiguration(data.configuration);
        }
      } catch (error) {
        if (!cancelled) {
          setUpiQrError(
            error instanceof Error
              ? error.message
              : "Unable to load UPI configuration."
          );
        }
      }
    };

    void loadUpiConfiguration();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const createUpiQrCode = async () => {
      setUpiQrCode("");
      if (paymentMethod !== "UPI") {
        setUpiQrError("");
        return;
      }
      if (!upiConfiguration) {
        setUpiQrError(
          "UPI payment is not configured. Contact an ADMIN."
        );
        return;
      }
      if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
        setUpiQrError("Enter a valid payment amount to generate the QR code.");
        return;
      }

      const paymentUri = new URLSearchParams({
        pa: upiConfiguration.upi_id,
        pn: upiConfiguration.payee_name,
        am: receivedAmount.toFixed(2),
        cu: "INR",
        tn: bookingReference || "Rest House Booking",
      });

      try {
        const qr = await QRCode.toDataURL(
          `upi://pay?${paymentUri.toString()}`,
          { errorCorrectionLevel: "M", margin: 2, width: 256 }
        );
        if (!cancelled) {
          setUpiQrCode(qr);
          setUpiQrError("");
        }
      } catch (error) {
        if (!cancelled) {
          setUpiQrError(
            error instanceof Error
              ? error.message
              : "Unable to generate the UPI QR code."
          );
        }
      }
    };

    void createUpiQrCode();
    return () => {
      cancelled = true;
    };
  }, [
    bookingReference,
    paymentMethod,
    receivedAmount,
    upiConfiguration,
  ]);

  /* =================================
     TRANSLATION
  ================================== */

  const tr = (
    english: string,
    marathi: string
  ) =>
    isMarathi
      ? marathi
      : english;

  /* =================================
     LANGUAGE SWITCHER
  ================================== */

  const languageSwitcher = (
    <div
      className="language-switcher"
      aria-label="Language selection"
    >

      <button
        type="button"
        className={`language-button ${
          language === "en"
            ? "active"
            : ""
        }`}
        onClick={() =>
          setLanguage("en")
        }
      >
        English
      </button>

      <span className="language-divider">
        |
      </span>

      <button
        type="button"
        className={`language-button ${
          language === "mr"
            ? "active"
            : ""
        }`}
        onClick={() =>
          setLanguage("mr")
        }
      >
        मराठी
      </button>

    </div>
  );

  /* =================================
     GUEST TYPE LABEL
  ================================== */

  const guestTypeLabel =
    guestType === "ESM"
      ? tr(
          "ESM",
          "माजी सैनिक"
        )
      : guestType ===
        "SERVING"
      ? tr(
          "Serving",
          "सेवारत"
        )
      : tr(
          "Civilian",
          "नागरिक"
        );

  /* =================================
     AMOUNT
  ================================== */

  const balanceAmount =
    Math.max(
      0,
      approvedAmount -
        receivedAmount
    );

  const excessAmount =
    Math.max(
      0,
      receivedAmount -
        approvedAmount
    );

  /* =================================
     VALIDATION
  ================================== */

  const validatePayment = (): boolean => {

    if (
      approvedAmount <=
      0
    ) {
      window.alert(
        tr(
          "The approved booking amount is invalid.",
          "मंजूर केलेली बुकिंग रक्कम अवैध आहे."
        )
      );

      return false;
    }

    if (
      receivedAmount <=
      0
    ) {
      window.alert(
        tr(
          "Please enter the amount received.",
          "कृपया प्राप्त झालेली रक्कम प्रविष्ट करा."
        )
      );

      return false;
    }

    if (
      receivedAmount >
      approvedAmount
    ) {
      window.alert(
        tr(
          "Amount received cannot exceed the approved amount.",
          "प्राप्त झालेली रक्कम मंजूर रकमेपेक्षा जास्त असू शकत नाही."
        )
      );

      return false;
    }

    if (
      paymentMethod === "UPI" &&
      (!upiConfiguration || !upiQrCode)
    ) {
      window.alert(
        tr(
          "UPI configuration and payment QR are required before recording a UPI payment.",
          "UPI पेमेंट नोंदवण्यापूर्वी UPI तपशील आणि पेमेंट QR आवश्यक आहेत."
        )
      );
      return false;
    }

    if (
      !paymentDate
    ) {
      window.alert(
        tr(
          "Please select the payment date.",
          "कृपया पेमेंटची तारीख निवडा."
        )
      );

      return false;
    }

    if (
      (
        paymentMethod ===
          "ONLINE" ||
        paymentMethod ===
          "UPI" ||
        paymentMethod ===
          "CHEQUE"
      ) &&
      !transactionNumber.trim()
    ) {
      window.alert(
        tr(
          "Please enter the transaction / reference number.",
          "कृपया व्यवहार / संदर्भ क्रमांक प्रविष्ट करा."
        )
      );

      return false;
    }

    return true;
  };

  /* =================================
     CONTINUE
  ================================== */

  const handleContinue = () => {

    if (
      !validatePayment()
    ) {
      return;
    }

    const payment: PaymentData =
      {
        bookingId,

        bookingReference,

        guestName,

        guestType,

        approvedAmount,

        amountReceived:
          receivedAmount,

        paymentMethod,

        transactionNumber:
          transactionNumber.trim(),

        paymentDate,

        remarks:
          remarks.trim(),
      };

    onContinue(
      payment
    );
  };

  /* =================================
     UI
  ================================== */

  return (
    <main className="booking-screen">

      {/* =================================
          HEADER
      ================================== */}

      <header className="booking-header">

        <div>

          <span className="section-label">
            {tr(
              "PAYMENT",
              "पेमेंट"
            )}
          </span>

          <h1>
            {tr(
              "Payment Collection",
              "पेमेंट नोंदणी"
            )}
          </h1>

          <p>
            {tr(
              "Officer",
              "अधिकारी"
            )}
            : {officerName}
          </p>

        </div>

        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "14px",
            flexWrap:
              "wrap",
            justifyContent:
              "flex-end",
          }}
        >

          {languageSwitcher}

          <button
            type="button"
            className="availability-back-button"
            onClick={
              onBack
            }
          >
            ←{" "}
            {tr(
              "Back",
              "मागे"
            )}
          </button>

        </div>

      </header>


      {/* =================================
          PROGRESS
      ================================== */}

      <section
        className="booking-card"
        style={{
          padding:
            "20px 24px",
        }}
      >

        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "10px",
            flexWrap:
              "wrap",
          }}
        >

          <span
            style={{
              padding:
                "7px 12px",
              borderRadius:
                "20px",
              background:
                "#edf1eb",
              color:
                "#647060",
              fontSize:
                "11px",
              fontWeight:
                800,
            }}
          >
            01 REGISTRATION
          </span>

          <span>→</span>

          <span
            style={{
              padding:
                "7px 12px",
              borderRadius:
                "20px",
              background:
                "#edf1eb",
              color:
                "#647060",
              fontSize:
                "11px",
              fontWeight:
                800,
            }}
          >
            02 AVAILABILITY
          </span>

          <span>→</span>

          <span
            style={{
              padding:
                "7px 12px",
              borderRadius:
                "20px",
              background:
                "#edf1eb",
              color:
                "#647060",
              fontSize:
                "11px",
              fontWeight:
                800,
            }}
          >
            03 ACCEPTANCE
          </span>

          <span>→</span>

          <span
            style={{
              padding:
                "7px 12px",
              borderRadius:
                "20px",
              background:
                "#edf1eb",
              color:
                "#647060",
              fontSize:
                "11px",
              fontWeight:
                800,
            }}
          >
            04 GUEST TYPE
          </span>

          <span>→</span>

          <span
            style={{
              padding:
                "7px 12px",
              borderRadius:
                "20px",
              background:
                "#edf1eb",
              color:
                "#647060",
              fontSize:
                "11px",
              fontWeight:
                800,
            }}
          >
            05 RATE
          </span>

          <span>→</span>

          <span
            style={{
              padding:
                "7px 12px",
              borderRadius:
                "20px",
              background:
                "#edf1eb",
              color:
                "#647060",
              fontSize:
                "11px",
              fontWeight:
                800,
            }}
          >
            06 BOOKING
          </span>

          <span>→</span>

          <span
            style={{
              padding:
                "7px 12px",
              borderRadius:
                "20px",
              background:
                "#edf1eb",
              color:
                "#647060",
              fontSize:
                "11px",
              fontWeight:
                800,
            }}
          >
            07 APPROVAL
          </span>

          <span>→</span>

          <span
            style={{
              padding:
                "7px 12px",
              borderRadius:
                "20px",
              background:
                "#355d3b",
              color:
                "#ffffff",
              fontSize:
                "11px",
              fontWeight:
                800,
            }}
          >
            08 PAYMENT
          </span>

        </div>

      </section>


      {/* =================================
          APPROVAL NOTICE
      ================================== */}

      <section
        className="booking-card"
        style={{
          padding:
            "22px 28px",
          background:
            "#f1f7ef",
          border:
            "1px solid #cadcc6",
        }}
      >

        <div
          style={{
            display:
              "flex",
            alignItems:
              "flex-start",
            gap:
              "15px",
          }}
        >

          <div
            style={{
              width:
                "44px",
              height:
                "44px",
              minWidth:
                "44px",
              borderRadius:
                "50%",
              background:
                "#355d3b",
              color:
                "#ffffff",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              fontWeight:
                900,
              fontSize:
                "18px",
            }}
          >
            ✓
          </div>

          <div>

            <h2
              style={{
                margin:
                  "0 0 6px",
                color:
                  "#304633",
                fontSize:
                  "18px",
              }}
            >
              {tr(
                "Booking approved for payment",
                "बुकिंग पेमेंटसाठी मंजूर आहे"
              )}
            </h2>

            <p
              style={{
                margin: 0,
                color:
                  "#657064",
                fontSize:
                  "13px",
                lineHeight:
                  1.6,
              }}
            >
              {tr(
                "Record the payment received against the approved booking amount.",
                "मंजूर बुकिंग रकमेच्या विरुद्ध प्राप्त झालेले पेमेंट नोंदवा."
              )}
            </p>

          </div>

        </div>

      </section>


      {/* =================================
          BOOKING SUMMARY
      ================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            08
          </span>

          <div>

            <h2>
              {tr(
                "Booking Summary",
                "बुकिंग सारांश"
              )}
            </h2>

            <p>
              {tr(
                "Payment is being recorded for this approved booking.",
                "या मंजूर बुकिंगसाठी पेमेंट नोंदवले जात आहे."
              )}
            </p>

          </div>

        </div>


        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap:
              "14px",
          }}
        >

          <div
            style={{
              padding:
                "15px",
              border:
                "1px solid #dfe5dc",
              borderRadius:
                "10px",
              background:
                "#fafbf9",
            }}
          >

            <small>
              {tr(
                "Booking Reference",
                "बुकिंग संदर्भ"
              )}
            </small>

            <strong
              style={{
                display:
                  "block",
                marginTop:
                  "6px",
                color:
                  "#304633",
              }}
            >
              {bookingReference ??
                tr(
                  "Pending",
                  "प्रलंबित"
                )}
            </strong>

          </div>


          <div
            style={{
              padding:
                "15px",
              border:
                "1px solid #dfe5dc",
              borderRadius:
                "10px",
              background:
                "#fafbf9",
            }}
          >

            <small>
              {tr(
                "Guest",
                "अतिथी"
              )}
            </small>

            <strong
              style={{
                display:
                  "block",
                marginTop:
                  "6px",
                color:
                  "#304633",
              }}
            >
              {guestName}
            </strong>

          </div>


          <div
            style={{
              padding:
                "15px",
              border:
                "1px solid #dfe5dc",
              borderRadius:
                "10px",
              background:
                "#fafbf9",
            }}
          >

            <small>
              {tr(
                "Guest Type",
                "अतिथी प्रकार"
              )}
            </small>

            <strong
              style={{
                display:
                  "block",
                marginTop:
                  "6px",
                color:
                  "#304633",
              }}
            >
              {guestTypeLabel}
            </strong>

          </div>


          <div
            style={{
              padding:
                "15px",
              border:
                "1px solid #dfe5dc",
              borderRadius:
                "10px",
                background:
                "#fafbf9",
            }}
          >

            <small>
              {tr(
                "Approved Amount",
                "मंजूर रक्कम"
              )}
            </small>

            <strong
              style={{
                display:
                  "block",
                marginTop:
                  "6px",
                color:
                  "#304f35",
                fontSize:
                  "17px",
              }}
            >
              {formatCurrency(
                approvedAmount
              )}
            </strong>

          </div>

        </div>

      </section>


      {/* =================================
          PAYMENT FORM
      ================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            ₹
          </span>

          <div>

            <h2>
              {tr(
                "Payment Details",
                "पेमेंट तपशील"
              )}
            </h2>

            <p>
              {tr(
                "Enter the payment received from the guest.",
                "अतिथीकडून प्राप्त झालेले पेमेंट प्रविष्ट करा."
              )}
            </p>

          </div>

        </div>


        <div className="booking-grid">

          {/* PAYMENT METHOD */}

          <div className="form-field">

            <label>
              {tr(
                "Payment Mode *",
                "पेमेंट पद्धत *"
              )}
            </label>

            <select
              value={
                paymentMethod
              }
              onChange={(event) =>
                setPaymentMethod(
                  event.target
                    .value as PaymentMethod
                )
              }
            >

              <option value="CASH">
                {tr(
                  "Cash",
                  "रोख"
                )}
              </option>

              <option value="ONLINE">
                {tr(
                  "Online",
                  "ऑनलाइन"
                )}
              </option>

              <option value="UPI">
                UPI
              </option>

              <option value="CHEQUE">
                {tr(
                  "Cheque",
                  "धनादेश"
                )}
              </option>

            </select>

          </div>


          {/* TRANSACTION NUMBER */}

          <div className="form-field">

            <label>
              {paymentMethod ===
                "CASH"
                ? tr(
                    "Transaction / Reference No.",
                    "व्यवहार / संदर्भ क्रमांक"
                  )
                : tr(
                    "Transaction / Reference No. *",
                    "व्यवहार / संदर्भ क्रमांक *"
                  )}
            </label>

            <input
              value={
                transactionNumber
              }
              onChange={(event) =>
                setTransactionNumber(
                  event.target.value
                )
              }
              placeholder={
                paymentMethod ===
                "CASH"
                  ? tr(
                      "Optional for cash",
                      "रोखसाठी ऐच्छिक"
                    )
                  : tr(
                      "Enter reference number",
                      "संदर्भ क्रमांक प्रविष्ट करा"
                    )
              }
            />

          </div>


          {/* PAYMENT DATE */}

          <div className="form-field">

            <label>
              {tr(
                "Payment Date *",
                "पेमेंट तारीख *"
              )}
            </label>

            <input
              type="date"
              value={
                paymentDate
              }
              max={
                getTodayDate()
              }
              onChange={(event) =>
                setPaymentDate(
                  event.target.value
                )
              }
            />

          </div>


          {/* AMOUNT */}

          <div className="form-field">

            <label>
              {tr(
                "Amount Received *",
                "प्राप्त रक्कम *"
              )}
            </label>

            <input
              type="number"
              min="0"
              max={
                approvedAmount
              }
              value={
                amountReceived
              }
              onChange={(event) =>
                setAmountReceived(
                  event.target.value
                )
              }
              placeholder="₹ 0"
            />

          </div>

          {paymentMethod === "UPI" && (
            <div className="form-field full">
              <label>{tr("Scan to pay", "पेमेंटसाठी स्कॅन करा")}</label>
              {upiQrCode ? (
                <div>
                  <img
                    src={upiQrCode}
                    alt={tr("UPI payment QR code", "UPI पेमेंट QR कोड")}
                    width={256}
                    height={256}
                  />
                  <p>
                    {upiConfiguration?.payee_name} ·{" "}
                    {formatCurrency(receivedAmount)}
                  </p>
                </div>
              ) : (
                <p role="status">
                  {upiQrError ||
                    tr(
                      "Preparing payment QR code…",
                      "पेमेंट QR कोड तयार होत आहे…"
                    )}
                </p>
              )}
            </div>
          )}


          {/* REMARKS */}

          <div className="form-field full">

            <label>
              {tr(
                "Payment Remarks",
                "पेमेंट शेरा"
              )}
            </label>

            <textarea
              value={
                remarks
              }
              onChange={(event) =>
                setRemarks(
                  event.target.value
                )
              }
              placeholder={tr(
                "Enter payment remarks if required...",
                "आवश्यक असल्यास पेमेंटबाबत शेरा प्रविष्ट करा..."
              )}
              rows={4}
            />

          </div>

        </div>

      </section>


      {/* =================================
          PAYMENT CALCULATION
      ================================== */}

      <section
        className="booking-card"
        style={{
          padding:
            "24px 28px",
        }}
      >

        <div className="booking-section-title">

          <span>
            ₹
          </span>

          <div>

            <h2>
              {tr(
                "Payment Summary",
                "पेमेंट सारांश"
              )}
            </h2>

            <p>
              {tr(
                "Review the amount before confirming payment.",
                "पेमेंट निश्चित करण्यापूर्वी रक्कम तपासा."
              )}
            </p>

          </div>

        </div>


        <div
          style={{
            display:
              "grid",
            gap:
              "10px",
          }}
        >

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              padding:
                "14px 16px",
              borderBottom:
                "1px solid #e5e9e2",
            }}
          >

            <span>
              {tr(
                "Approved Booking Amount",
                "मंजूर बुकिंग रक्कम"
              )}
            </span>

            <strong>
              {formatCurrency(
                approvedAmount
              )}
            </strong>

          </div>


          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              padding:
                "14px 16px",
              borderBottom:
                "1px solid #e5e9e2",
            }}
          >

            <span>
              {tr(
                "Amount Received",
                "प्राप्त रक्कम"
              )}
            </span>

            <strong>
              {formatCurrency(
                receivedAmount
              )}
            </strong>

          </div>


          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              padding:
                "14px 16px",
              borderBottom:
                "1px solid #e5e9e2",
            }}
          >

            <span>
              {tr(
                "Balance",
                "बाकी रक्कम"
              )}
            </span>

            <strong
              style={{
                color:
                  balanceAmount >
                  0
                    ? "#9a6b22"
                    : "#355d3b",
              }}
            >
              {formatCurrency(
                balanceAmount
              )}
            </strong>

          </div>


          {excessAmount >
            0 && (
            <div
              style={{
                padding:
                  "12px 15px",
                borderRadius:
                  "9px",
                background:
                  "#fff5f5",
                border:
                  "1px solid #edcccc",
                color:
                  "#963f3f",
                fontSize:
                  "12px",
              }}
            >
              {tr(
                "The received amount exceeds the approved amount.",
                "प्राप्त रक्कम मंजूर रकमेपेक्षा जास्त आहे."
              )}
            </div>
          )}


          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              padding:
                "18px 16px",
              marginTop:
                "5px",
              borderRadius:
                "10px",
              background:
                "#f1f7ef",
            }}
          >

            <strong
              style={{
                color:
                  "#304633",
                fontSize:
                  "16px",
              }}
            >
              {tr(
                "Payment Status",
                "पेमेंट स्थिती"
              )}
            </strong>

            <span
              style={{
                padding:
                  "7px 12px",
                borderRadius:
                  "20px",
                background:
                  balanceAmount ===
                    0 &&
                  receivedAmount >
                    0
                    ? "#dcebd9"
                    : "#f5ead2",
                color:
                  balanceAmount ===
                    0 &&
                  receivedAmount >
                    0
                    ? "#355d3b"
                    : "#78602b",
                fontSize:
                  "11px",
                fontWeight:
                  800,
                letterSpacing:
                  "0.8px",
              }}
            >
              {balanceAmount ===
                0 &&
              receivedAmount >
                0
                ? tr(
                    "FULLY PAID",
                    "पूर्ण पेमेंट"
                  )
                : tr(
                    "PARTIAL PAYMENT",
                    "अंशतः पेमेंट"
                  )}
            </span>

          </div>

        </div>

      </section>


      {/* =================================
          IMPORTANT WORKFLOW
      ================================== */}

      <section
        className="booking-card"
        style={{
          padding:
            "20px 24px",
          background:
            "#fffaf0",
          border:
            "1px solid #eadfbd",
        }}
      >

        <div
          style={{
            color:
              "#6c6044",
            fontSize:
              "12px",
            lineHeight:
              1.7,
          }}
        >

          <strong>
            {tr(
              "Important:",
              "महत्त्वाचे:"
            )}
          </strong>{" "}

          {tr(
            "Confirming payment records the payment. It does not itself lock the room. The next stage is Invoice, followed by physical room locking.",
            "पेमेंट निश्चित केल्यावर पेमेंटची नोंद होते. यामुळे स्वतःहून रूम लॉक होत नाही. पुढील टप्पा इनव्हॉइस आहे आणि त्यानंतर प्रत्यक्ष रूम लॉक केली जाईल."
          )}

        </div>

      </section>


      {/* =================================
          FOOTER
      ================================== */}

      <div className="booking-actions">

        <button
          type="button"
          className="secondary-action"
          onClick={
            onBack
          }
        >
          {tr(
            "BACK TO APPROVAL",
            "मंजुरीकडे मागे"
          )}
        </button>


        <button
          type="button"
          className="continue-booking-button"
          onClick={
            handleContinue
          }
        >
          {tr(
            "CONFIRM PAYMENT →",
            "पेमेंट निश्चित करा →"
          )}
        </button>

      </div>

    </main>
  );
}

export default Payment;