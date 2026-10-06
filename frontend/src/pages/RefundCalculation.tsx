import { useMemo, useState } from "react";

import "../App.css";
import { useLanguage } from "../i18n/LanguageContext";

/* =========================================
   TYPES
========================================= */

export interface RefundCalculationAccommodation {
  roomId: string;
  roomName: string;
  bedId?: string;
  bedNumber?: number;
}

export interface RefundCalculationData {
  bookingId?: string;
  bookingReference?: string;

  guestId?: string;
  guestName: string;

  guestType:
    | "ESM"
    | "SERVING"
    | "CIVILIAN";

  accommodations:
    RefundCalculationAccommodation[];

  scheduledCheckOutDate: string;
  preCheckOutDate: string;

  totalAmount: number;
  paidAmount: number;

  refundableAmount: number;
  retainedAmount: number;

  adjustmentAmount: number;

  remarks: string;
}

interface RefundCalculationProps {
  officerName: string;

  bookingId?: string;
  bookingReference?: string;

  guestId?: string;
  guestName: string;

  guestType:
    | "ESM"
    | "SERVING"
    | "CIVILIAN";

  accommodations:
    RefundCalculationAccommodation[];

  scheduledCheckOutDate: string;
  preCheckOutDate: string;

  totalAmount: number;
  paidAmount: number;

  reason: string;

  onBack: () => void;

  onContinue: (
    data: RefundCalculationData
  ) => void;
}

/* =========================================
   HELPERS
========================================= */

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

/* =========================================
   COMPONENT
========================================= */

function RefundCalculation({
  officerName,
  bookingId,
  bookingReference,
  guestId,
  guestName,
  guestType,
  accommodations,
  scheduledCheckOutDate,
  preCheckOutDate,
  totalAmount,
  paidAmount,
  reason,
  onBack,
  onContinue,
}: RefundCalculationProps) {
  const {
    language,
    setLanguage,
  } = useLanguage();

  const isMarathi =
    language === "mr";

  /* =========================================
     STATE
  ========================================= */

  const [
    adjustmentAmount,
    setAdjustmentAmount,
  ] = useState("0");

  const [
    remarks,
    setRemarks,
  ] = useState("");

  const [
    confirmed,
    setConfirmed,
  ] = useState(false);

  /* =========================================
     TRANSLATION
  ========================================= */

  const tr = (
    english: string,
    marathi: string
  ) =>
    isMarathi
      ? marathi
      : english;

  /* =========================================
     GUEST TYPE
  ========================================= */

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

  /* =========================================
     FINANCIAL VALUES
  ========================================= */

  const safeTotal =
    Math.max(
      0,
      totalAmount
    );

  const safePaid =
    Math.max(
      0,
      Math.min(
        paidAmount,
        safeTotal
      )
    );

  /*
   * No refund percentage or penalty rule
   * has been assumed here.
   *
   * Adjustment is an explicit amount
   * entered by the authorized user.
   */

  const parsedAdjustment =
    Number(
      adjustmentAmount
    );

  const safeAdjustment =
    Number.isFinite(
      parsedAdjustment
    )
      ? Math.max(
          0,
          parsedAdjustment
        )
      : 0;

  const refundableAmount =
    Math.max(
      0,
      safePaid -
        safeAdjustment
    );

  const retainedAmount =
    Math.max(
      0,
      safePaid -
        refundableAmount
    );

  const calculationStatus =
    safeAdjustment === 0
      ? tr(
          "Full paid amount is currently refundable, subject to final authorization/business rules.",
          "सध्याच्या गणनेनुसार भरलेली पूर्ण रक्कम रिफंड करण्यायोग्य आहे; अंतिम मंजुरी / व्यावसायिक नियम लागू राहतील."
        )
      : tr(
          "An explicit adjustment has been entered and deducted from the paid amount.",
          "स्पष्ट adjustment रक्कम प्रविष्ट करून ती भरलेल्या रकमेतून वजा केली आहे."
        );

  /* =========================================
     MEMO PREVIEW
  ========================================= */

  const preview = useMemo(
    () => ({
      refundable:
        refundableAmount,
      retained:
        retainedAmount,
    }),
    [
      refundableAmount,
      retainedAmount,
    ]
  );

  /* =========================================
     VALIDATION
  ========================================= */

  const validateCalculation =
    (): boolean => {
      if (
        !preCheckOutDate
      ) {
        window.alert(
          tr(
            "Pre check-out date is required.",
            "प्री चेक-आउट तारीख आवश्यक आहे."
          )
        );

        return false;
      }

      if (
        !scheduledCheckOutDate
      ) {
        window.alert(
          tr(
            "Scheduled check-out date is required.",
            "नियोजित चेक-आउट तारीख आवश्यक आहे."
          )
        );

        return false;
      }

      if (
        safePaid <= 0
      ) {
        window.alert(
          tr(
            "No paid amount is available for refund calculation.",
            "रिफंड गणनेसाठी कोणतीही भरलेली रक्कम उपलब्ध नाही."
          )
        );

        return false;
      }

      if (
        !Number.isFinite(
          parsedAdjustment
        ) ||
        parsedAdjustment < 0
      ) {
        window.alert(
          tr(
            "Please enter a valid non-negative adjustment amount.",
            "कृपया वैध शून्य किंवा त्यापेक्षा जास्त adjustment रक्कम प्रविष्ट करा."
          )
        );

        return false;
      }

      if (
        safeAdjustment >
        safePaid
      ) {
        window.alert(
          tr(
            "Adjustment cannot be greater than the paid amount.",
            "Adjustment रक्कम भरलेल्या रकमपेक्षा जास्त असू शकत नाही."
          )
        );

        return false;
      }

      if (
        !confirmed
      ) {
        window.alert(
          tr(
            "Please confirm the refund calculation.",
            "कृपया रिफंड गणनेची पुष्टी करा."
          )
        );

        return false;
      }

      return true;
    };

  /* =========================================
     CONTINUE
  ========================================= */

  const handleContinue =
    () => {
      if (
        !validateCalculation()
      ) {
        return;
      }

      const data:
        RefundCalculationData = {
        bookingId,
        bookingReference,

        guestId,
        guestName,

        guestType,

        accommodations,

        scheduledCheckOutDate,
        preCheckOutDate,

        totalAmount:
          safeTotal,

        paidAmount:
          safePaid,

        refundableAmount:
          preview.refundable,

        retainedAmount:
          preview.retained,

        adjustmentAmount:
          safeAdjustment,

        remarks:
          remarks.trim(),
      };

      onContinue(
        data
      );
    };

  /* =========================================
     LANGUAGE SWITCHER
  ========================================= */

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

  /* =========================================
     UI
  ========================================= */

  return (
    <main className="booking-screen">

      {/* =====================================
          HEADER
      ===================================== */}

      <header className="booking-header">

        <div>

          <span className="section-label">
            {tr(
              "REFUND CALCULATION",
              "रिफंड गणना"
            )}
          </span>

          <h1>
            {tr(
              "Refund Calculation",
              "रिफंड गणना"
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


      {/* =====================================
          WORKFLOW
      ===================================== */}

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

          <span className="workflow-pill">
            PRE CHECK-OUT
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
            REFUND CALCULATION
          </span>

          <span>→</span>

          <span className="workflow-pill">
            REFUND MEMO
          </span>

          <span>→</span>

          <span className="workflow-pill">
            WHATSAPP FEEDBACK
          </span>

        </div>

      </section>


      {/* =====================================
          IMPORTANT NOTICE
      ===================================== */}

      <section
        className="booking-card"
        style={{
          padding:
            "22px 28px",
          background:
            "#fffaf0",
          border:
            "1px solid #eadfbd",
        }}
      >

        <div
          style={{
            display:
              "flex",
            alignItems:
              "flex-start",
            gap:
              "14px",
          }}
        >

          <div
            style={{
              width:
                "42px",
              height:
                "42px",
              minWidth:
                "42px",
              borderRadius:
                "50%",
              background:
                "#f1e4bd",
              color:
                "#765f25",
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
            ₹
          </div>

          <div>

            <strong
              style={{
                display:
                  "block",
                color:
                  "#5f512f",
                fontSize:
                  "15px",
                marginBottom:
                  "5px",
              }}
            >
              {tr(
                "Refund calculation review",
                "रिफंड गणना तपासणी"
              )}
            </strong>

            <span
              style={{
                color:
                  "#71664b",
                fontSize:
                  "12px",
                lineHeight:
                  1.6,
              }}
            >
              {tr(
                "No refund percentage or cancellation penalty has been assumed. Any adjustment entered below must be supported by the applicable administrative/business rule.",
                "कोणतीही रिफंड टक्केवारी किंवा cancellation penalty गृहीत धरलेली नाही. खाली प्रविष्ट केलेली adjustment लागू प्रशासकीय / व्यावसायिक नियमावर आधारित असावी."
              )}
            </span>

          </div>

        </div>

      </section>


      {/* =====================================
          BOOKING DETAILS
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            01
          </span>

          <div>

            <h2>
              {tr(
                "Booking & Guest Details",
                "बुकिंग आणि अतिथी तपशील"
              )}
            </h2>

            <p>
              {tr(
                "Details carried from the pre check-out stage.",
                "प्री चेक-आउट टप्प्यातून आलेले तपशील."
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

          <div className="summary-box">

            <small>
              {tr(
                "Booking Reference",
                "बुकिंग संदर्भ"
              )}
            </small>

            <strong>
              {bookingReference ||
                "-"}
            </strong>

          </div>


          <div className="summary-box">

            <small>
              {tr(
                "Guest Name",
                "अतिथीचे नाव"
              )}
            </small>

            <strong>
              {guestName}
            </strong>

          </div>


          <div className="summary-box">

            <small>
              {tr(
                "Guest Type",
                "अतिथी प्रकार"
              )}
            </small>

            <strong>
              {guestTypeLabel}
            </strong>

          </div>


          <div className="summary-box">

            <small>
              {tr(
                "Booking ID",
                "बुकिंग ID"
              )}
            </small>

            <strong>
              {bookingId ||
                "-"}
            </strong>

          </div>

        </div>

      </section>


      {/* =====================================
          ACCOMMODATION
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            02
          </span>

          <div>

            <h2>
              {tr(
                "Accommodation",
                "निवास व्यवस्था"
              )}
            </h2>

            <p>
              {tr(
                "Accommodation associated with this booking.",
                "या बुकिंगशी संबंधित निवास व्यवस्था."
              )}
            </p>

          </div>

        </div>


        <div
          style={{
            display:
              "grid",
            gap:
              "12px",
          }}
        >

          {accommodations.length === 0 ? (

            <div
              style={{
                padding:
                  "18px",
                borderRadius:
                  "10px",
                background:
                  "#fff6f4",
                border:
                  "1px solid #e6c8c3",
                color:
                  "#7c4942",
                fontSize:
                  "13px",
              }}
            >
              {tr(
                "No accommodation information is available.",
                "निवास व्यवस्थेची माहिती उपलब्ध नाही."
              )}
            </div>

          ) : (

            accommodations.map(
              (
                accommodation,
                index
              ) => (

                <div
                  key={`${accommodation.roomId}-${accommodation.bedId || index}`}
                  style={{
                    padding:
                      "17px",
                    border:
                      "1px solid #dce3d8",
                    borderRadius:
                      "11px",
                    background:
                      "#fafbf9",
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap:
                      "14px",
                    flexWrap:
                      "wrap",
                  }}
                >

                  <div>

                    <strong
                      style={{
                        display:
                          "block",
                        color:
                          "#304633",
                        fontSize:
                          "15px",
                      }}
                    >
                      {accommodation.roomName}
                    </strong>

                    <span
                      style={{
                        display:
                          "block",
                        marginTop:
                          "5px",
                        color:
                          "#687367",
                        fontSize:
                          "12px",
                      }}
                    >
                      {accommodation.bedId
                        ? tr(
                            `Bed ${accommodation.bedNumber ?? "-"}`,
                            `बेड ${accommodation.bedNumber ?? "-"}`
                          )
                        : tr(
                            "Whole Room",
                            "संपूर्ण खोली"
                          )}
                    </span>

                  </div>

                  <span
                    style={{
                      padding:
                        "7px 12px",
                      borderRadius:
                        "20px",
                      background:
                        "#edf2eb",
                      color:
                        "#526452",
                      fontSize:
                        "11px",
                      fontWeight:
                        800,
                    }}
                  >
                    {tr(
                      "CHECKED OUT EARLY",
                      "लवकर चेक-आउट"
                    )}
                  </span>

                </div>
              )
            )

          )}

        </div>

      </section>


      {/* =====================================
          CHECKOUT DATES
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            03
          </span>

          <div>

            <h2>
              {tr(
                "Checkout Timeline",
                "चेक-आउट कालावधी"
              )}
            </h2>

            <p>
              {tr(
                "Compare the scheduled and actual pre check-out dates.",
                "नियोजित आणि प्रत्यक्ष प्री चेक-आउट तारखांची तुलना."
              )}
            </p>

          </div>

        </div>


        <div className="booking-grid">

          <div className="form-field">

            <label>
              {tr(
                "Scheduled Check-Out",
                "नियोजित चेक-आउट"
              )}
            </label>

            <input
              type="date"
              value={
                scheduledCheckOutDate
              }
              readOnly
            />

          </div>


          <div className="form-field">

            <label>
              {tr(
                "Actual Pre Check-Out",
                "प्रत्यक्ष प्री चेक-आउट"
              )}
            </label>

            <input
              type="date"
              value={
                preCheckOutDate
              }
              readOnly
            />

          </div>

        </div>


        <div
          style={{
            marginTop:
              "14px",
            padding:
              "13px 15px",
            borderRadius:
              "9px",
            background:
              "#f5f7f4",
            border:
              "1px solid #dfe5dc",
            color:
              "#687367",
            fontSize:
              "12px",
          }}
        >
          <strong>
            {tr(
              "Pre Check-Out Reason:",
              "प्री चेक-आउट कारण:"
            )}
          </strong>{" "}
          {reason}
        </div>

      </section>


      {/* =====================================
          ORIGINAL FINANCIAL SUMMARY
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            04
          </span>

          <div>

            <h2>
              {tr(
                "Original Financial Summary",
                "मूळ आर्थिक सारांश"
              )}
            </h2>

            <p>
              {tr(
                "Amounts recorded before refund calculation.",
                "रिफंड गणनेपूर्वी नोंदवलेल्या रकमा."
              )}
            </p>

          </div>

        </div>


        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap:
              "14px",
          }}
        >

          <div className="summary-box">

            <small>
              {tr(
                "Total Amount",
                "एकूण रक्कम"
              )}
            </small>

            <strong>
              {formatCurrency(
                safeTotal
              )}
            </strong>

          </div>


          <div className="summary-box">

            <small>
              {tr(
                "Paid Amount",
                "भरलेली रक्कम"
              )}
            </small>

            <strong>
              {formatCurrency(
                safePaid
              )}
            </strong>

          </div>


          <div className="summary-box">

            <small>
              {tr(
                "Current Refund Base",
                "सध्याची रिफंड आधार रक्कम"
              )}
            </small>

            <strong>
              {formatCurrency(
                safePaid
              )}
            </strong>

          </div>

        </div>

      </section>


      {/* =====================================
          ADJUSTMENT
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            05
          </span>

          <div>

            <h2>
              {tr(
                "Refund Adjustment",
                "रिफंड Adjustment"
              )}
            </h2>

            <p>
              {tr(
                "Enter an applicable adjustment only when supported by the authorized rule.",
                "अधिकृत नियम लागू असल्यासच adjustment रक्कम प्रविष्ट करा."
              )}
            </p>

          </div>

        </div>


        <div className="booking-grid">

          <div className="form-field">

            <label>
              {tr(
                "Adjustment Amount",
                "Adjustment रक्कम"
              )}
            </label>

            <input
              type="number"
              min="0"
              max={
                safePaid
              }
              step="1"
              value={
                adjustmentAmount
              }
              onChange={(
                event
              ) =>
                setAdjustmentAmount(
                  event.target
                    .value
                )
              }
              placeholder="0"
            />

          </div>


          <div
            style={{
              display:
                "flex",
              alignItems:
                "flex-end",
            }}
          >

            <div
              style={{
                width:
                  "100%",
                padding:
                  "13px 15px",
                borderRadius:
                  "9px",
                background:
                  "#f5f7f4",
                border:
                  "1px solid #dfe5dc",
                color:
                  "#687367",
                fontSize:
                  "12px",
                lineHeight:
                  1.6,
              }}
            >
              {calculationStatus}
            </div>

          </div>

        </div>

      </section>


      {/* =====================================
          CALCULATION RESULT
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            ₹
          </span>

          <div>

            <h2>
              {tr(
                "Refund Calculation Result",
                "रिफंड गणनेचा निकाल"
              )}
            </h2>

            <p>
              {tr(
                "Review the calculated values before generating the refund memo.",
                "रिफंड मेमो तयार करण्यापूर्वी गणना तपासा."
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
                "Paid Amount",
                "भरलेली रक्कम"
              )}
            </span>

            <strong>
              {formatCurrency(
                safePaid
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
                "Adjustment",
                "Adjustment"
              )}
            </span>

            <strong>
              {formatCurrency(
                safeAdjustment
              )}
            </strong>

          </div>


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
              border:
                "1px solid #cadcc6",
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
                "Refundable Amount",
                "रिफंड करण्यायोग्य रक्कम"
              )}
            </strong>

            <strong
              style={{
                color:
                  "#304f35",
                fontSize:
                  "23px",
              }}
            >
              {formatCurrency(
                preview.refundable
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
              borderRadius:
                "10px",
              background:
                "#fafbf9",
            }}
          >

            <span>
              {tr(
                "Retained / Adjusted Amount",
                "ठेवलेली / Adjustment रक्कम"
              )}
            </span>

            <strong>
              {formatCurrency(
                preview.retained
              )}
            </strong>

          </div>

        </div>

      </section>


      {/* =====================================
          REMARKS
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            06
          </span>

          <div>

            <h2>
              {tr(
                "Calculation Remarks",
                "गणना शेरा"
              )}
            </h2>

            <p>
              {tr(
                "Record any information supporting the refund calculation.",
                "रिफंड गणनेसाठी आवश्यक माहिती नोंदवा."
              )}
            </p>

          </div>

        </div>


        <div className="form-field">

          <label>
            {tr(
              "Remarks",
              "शेरा"
            )}
          </label>

          <textarea
            value={
              remarks
            }
            onChange={(
              event
            ) =>
              setRemarks(
                event.target
                  .value
              )
            }
            rows={4}
            placeholder={tr(
              "Enter calculation remarks if required...",
              "आवश्यक असल्यास गणना शेरा प्रविष्ट करा..."
            )}
          />

        </div>

      </section>


      {/* =====================================
          CONFIRMATION
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            07
          </span>

          <div>

            <h2>
              {tr(
                "Calculation Confirmation",
                "गणना पुष्टी"
              )}
            </h2>

            <p>
              {tr(
                "Confirm the calculation before creating the refund memo.",
                "रिफंड मेमो तयार करण्यापूर्वी गणनेची पुष्टी करा."
              )}
            </p>

          </div>

        </div>


        <button
          type="button"
          onClick={() =>
            setConfirmed(
              !confirmed
            )
          }
          style={{
            width:
              "100%",
            textAlign:
              "left",
            padding:
              "19px",
            borderRadius:
              "12px",
            border:
              confirmed
                ? "2px solid #355d3b"
                : "1px solid #d8e0d5",
            background:
              confirmed
                ? "#f1f7ef"
                : "#ffffff",
            cursor:
              "pointer",
          }}
        >

          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap:
                "14px",
            }}
          >

            <div
              style={{
                width:
                  "30px",
                height:
                  "30px",
                borderRadius:
                  "7px",
                background:
                  confirmed
                    ? "#355d3b"
                    : "#e8ece6",
                color:
                  confirmed
                    ? "#ffffff"
                    : "#647060",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                fontWeight:
                  900,
              }}
            >
              {confirmed
                ? "✓"
                : ""}
            </div>

            <div>

              <strong
                style={{
                  display:
                    "block",
                  color:
                    "#304633",
                  fontSize:
                    "14px",
                }}
              >
                {tr(
                  "I confirm that the refund calculation has been reviewed and is ready for refund memo generation.",
                  "रिफंड गणनेचा तपशील तपासला असून रिफंड मेमो तयार करण्यासाठी तो तयार आहे याची मी पुष्टी करतो."
                )}
              </strong>

              <span
                style={{
                  display:
                    "block",
                  marginTop:
                    "5px",
                  color:
                    "#687367",
                  fontSize:
                    "12px",
                }}
              >
                {tr(
                  "The refund memo will be the next stage.",
                  "रिफंड मेमो हा पुढील टप्पा असेल."
                )}
              </span>

            </div>

          </div>

        </button>

      </section>


      {/* =====================================
          FOOTER
      ===================================== */}

      <div className="booking-actions">

        <button
          type="button"
          className="secondary-action"
          onClick={
            onBack
          }
        >
          {tr(
            "BACK TO PRE CHECK-OUT",
            "प्री चेक-आउटकडे मागे"
          )}
        </button>


        <button
          type="button"
          className="continue-booking-button"
          onClick={
            handleContinue
          }
          disabled={
            !confirmed
          }
          style={{
            opacity:
              confirmed
                ? 1
                : 0.55,
            cursor:
              confirmed
                ? "pointer"
                : "not-allowed",
          }}
        >
          {tr(
            "PROCEED TO REFUND MEMO →",
            "रिफंड मेमोकडे जा →"
          )}
        </button>

      </div>

    </main>
  );
}

export default RefundCalculation;