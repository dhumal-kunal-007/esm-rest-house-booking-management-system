import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { useLanguage } from "../i18n/LanguageContext";
import type { User } from "../App";

interface DailyReportRoom {
  roomId: string;
  roomNumber: string;
  category: string;
  male: number;
  female: number;
  children: number;
  guests: number;
  amount: number;
}

interface OccupancyTotals {
  male: number;
  female: number;
  children: number;
  guests: number;
  amount: number;
}

interface DailyReportData {
  success: boolean;
  reportType: "DAILY" | "WEEKLY" | "MONTHLY";
  reportDate: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  snapshotSaved: boolean;
  rooms: DailyReportRoom[];
  totals: OccupancyTotals;
  activity: {
    eventType: "CHECK_IN" | "CHECK_OUT";
    eventTime: string;
    bookingReference: string;
    guestName: string;
    roomNumber: string;
    bedNumber: number | null;
    handledBy: string | null;
    remarks: string | null;
  }[];
  feedback: CheckoutFeedbackReportRow[];
  payments: {
    cash: number;
    upi: number;
    online: number;
    cheque: number;
    total: number;
  };
  summaries: {
    acVacantRooms: number;
    nonAcVacantRooms: number;
    acOccupancy: OccupancyTotals;
    dormitoryOccupancy: OccupancyTotals;
  };
  message?: string;
}

interface CheckoutFeedbackReportRow {
  booking_id: string;
  booking_reference: string;
  service_name: string | null;
  staff_rating: number | null;
  housekeeping_rating: number | null;
  facilities_rating: number | null;
  food_rating: number | null;
  overall_rating: number | null;
  comments: string | null;
  feedback_status: "SUBMITTED" | "SKIPPED";
  submitted_at: string;
}

interface DailyReportProps {
  user: User;
  onBack: () => void;
}

const getLocalDateValue = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeCategory = (value: string): string =>
  value.toUpperCase().replace(/[\s_-]/g, "");

function DailyReport({ user, onBack }: DailyReportProps) {
  const { language } = useLanguage();
  const today = getLocalDateValue();
  const [reportType, setReportType] =
    useState<DailyReportData["reportType"]>("DAILY");
  const [date, setDate] = useState(today);
  const [report, setReport] = useState<DailyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasReport = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRefreshCounter((current) => current + 1);
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadReport = async () => {
      if (!hasReport.current) {
        setLoading(true);
      }
      setError("");
      try {
        const response = await apiFetch(
          `http://localhost:5000/api/dashboard/daily-report?date=${encodeURIComponent(date)}&period=${reportType.toLowerCase()}`,
          { cache: "no-store" }
        );
        const data: DailyReportData = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to load the daily report.");
        }
        if (!cancelled) {
          setReport(data);
          hasReport.current = true;
          setLastUpdated(new Date());
        }
      } catch (loadError) {
        if (!cancelled) {
          setReport(null);
          hasReport.current = false;
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the daily report."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadReport();
    return () => {
      cancelled = true;
    };
  }, [date, refreshCounter, reportType]);

  const formatDate = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString(
      language === "mr" ? "mr-IN" : "en-IN",
      { day: "2-digit", month: "2-digit", year: "numeric" }
    );

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(
      language === "mr" ? "mr-IN" : "en-IN",
      {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  const formatAmount = (amount: number) =>
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const groupRooms = (side: "rooms" | "dormitory") => {
    const selected = report?.rooms ?? [];
    return selected.filter((room) => {
      const category = normalizeCategory(room.category);
      if (side === "rooms") {
        return [
          "AC",
          "VIP",
          "ACVIP",
          "NAC",
          "NONAC",
          "NONAIRCONDITIONED",
        ].includes(category);
      }
      return [
        "DM",
        "DORM",
        "DORMITORY",
        "DORMITORIES",
        "HALL",
      ].includes(category);
    });
  };

  const sumRooms = (rooms: DailyReportRoom[]): OccupancyTotals =>
    rooms.reduce(
      (sum, room) => ({
        male: sum.male + room.male,
        female: sum.female + room.female,
        children: sum.children + room.children,
        guests: sum.guests + room.guests,
        amount: sum.amount + room.amount,
      }),
      { male: 0, female: 0, children: 0, guests: 0, amount: 0 }
    );

  const renderRoomTable = (rooms: DailyReportRoom[], title: string) => {
    const totals = sumRooms(rooms);
    return (
      <section className="daily-report-column">
        <h2>{title}</h2>
        <table>
          <thead>
            <tr>
              <th>{language === "mr" ? "खोली क्र." : "Room No"}</th>
              <th>{language === "mr" ? "पुरुष" : "Male"}</th>
              <th>{language === "mr" ? "महिला" : "Female"}</th>
              <th>{language === "mr" ? "बालक" : "Child"}</th>
              <th>{language === "mr" ? "अतिथी" : "Guest"}</th>
              <th>{language === "mr" ? "रक्कम" : "Amt"}</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.roomId}>
                <th scope="row">{room.roomNumber}</th>
                <td>{room.male}</td>
                <td>{room.female}</td>
                <td>{room.children}</td>
                <td>{room.guests}</td>
                <td>{formatAmount(room.amount)}</td>
              </tr>
            ))}
            {rooms.length === 0 && (
              <tr>
                <td colSpan={6} className="daily-report-empty">
                  {language === "mr" ? "खोल्या उपलब्ध नाहीत" : "No rooms configured"}
                </td>
              </tr>
            )}
            <tr className="daily-report-total-row">
              <th scope="row">{language === "mr" ? "एकूण" : "Total"}</th>
              <td>{totals.male}</td>
              <td>{totals.female}</td>
              <td>{totals.children}</td>
              <td>{totals.guests}</td>
              <td>{formatAmount(totals.amount)}</td>
            </tr>
          </tbody>
        </table>
      </section>
    );
  };

  const leftRooms = groupRooms("rooms");
  const rightRooms = groupRooms("dormitory");
  const feedbackReport = report?.feedback ?? [];
  const reportTypeLabel =
    reportType === "DAILY"
      ? language === "mr" ? "दैनिक" : "DAILY"
      : reportType === "WEEKLY"
        ? language === "mr" ? "साप्ताहिक" : "WEEKLY"
        : language === "mr" ? "मासिक" : "MONTHLY";
  const reportTypeMarathi =
    reportType === "DAILY"
      ? "दैनिक"
      : reportType === "WEEKLY"
        ? "साप्ताहिक"
        : "मासिक";

  return (
    <main className="daily-report-screen">
      <header className="daily-report-toolbar">
        <div>
          <span className="daily-report-eyebrow">
            {language === "mr" ? "दैनिक अहवाल" : "DAILY REPORT"}
          </span>
          <h1>{language === "mr" ? "ESM विश्रामगृह" : "ESM Rest House"}</h1>
          <p>{user.name} · {user.role}</p>
        </div>
        <div className="daily-report-controls">
          <span className="daily-report-live-status">
            <i aria-hidden="true" />
            {report?.snapshotSaved
              ? reportType === "DAILY"
                ? language === "mr"
                  ? "मागील २४ तासांचा अहवाल · रात्री ९ वाजता जतन"
                  : "Previous 24 hours · saved daily at 9 PM"
                : language === "mr"
                  ? "जतन केलेला अहवाल · रात्री ९ वाजता"
                  : "Saved report · generated at 9 PM"
              : language === "mr"
                ? "थेट पूर्वावलोकन · रात्री ९ वाजता आपोआप जतन"
                : "Live preview · automatically saved at 9 PM"}
            {lastUpdated && (
              <small>
                {language === "mr" ? "शेवटचे अपडेट:" : "Updated:"}{" "}
                {lastUpdated.toLocaleTimeString(
                  language === "mr" ? "mr-IN" : "en-IN",
                  { hour: "2-digit", minute: "2-digit", second: "2-digit" }
                )}
              </small>
            )}
          </span>
          <button
            type="button"
            className="daily-report-secondary"
            onClick={() => setRefreshCounter((current) => current + 1)}
          >
            {language === "mr" ? "आता अपडेट करा" : "Refresh now"}
          </button>
          <label>
            {language === "mr" ? "अहवाल प्रकार" : "Report type"}
            <select
              value={reportType}
              onChange={(event) => {
                hasReport.current = false;
                setReport(null);
                setReportType(event.target.value as DailyReportData["reportType"]);
              }}
            >
              <option value="DAILY">{language === "mr" ? "दैनिक" : "Daily"}</option>
              <option value="WEEKLY">{language === "mr" ? "साप्ताहिक" : "Weekly"}</option>
              <option value="MONTHLY">{language === "mr" ? "मासिक" : "Monthly"}</option>
            </select>
          </label>
          <label>
            {reportType === "DAILY"
              ? language === "mr" ? "तारीख" : "Report date"
              : reportType === "WEEKLY"
                ? language === "mr" ? "आठवड्यातील तारीख" : "Date in week"
                : language === "mr" ? "महिन्यातील तारीख" : "Date in month"}
            <input
              type="date"
              value={date}
              max={today}
              onChange={(event) => {
                hasReport.current = false;
                setReport(null);
                setDate(event.target.value);
              }}
            />
          </label>
          <button type="button" className="daily-report-secondary" onClick={onBack}>
            {language === "mr" ? "डॅशबोर्ड" : "Dashboard"}
          </button>
          <button
            type="button"
            className="daily-report-primary"
            onClick={() => window.print()}
            disabled={!report || loading}
          >
            {language === "mr" ? "प्रिंट / PDF जतन करा" : "Print / Save as PDF"}
          </button>
        </div>
      </header>

      {error && <p className="daily-report-error" role="alert">{error}</p>}
      {loading && <p className="daily-report-loading">{language === "mr" ? "अहवाल लोड होत आहे..." : "Loading report..."}</p>}

      {report && !loading && (
        <article className="daily-report-printable">
          <header className="daily-report-sheet-header">
            <h1>
              {language === "mr"
                ? `ESM विश्रामगृह ${reportTypeMarathi} अहवाल`
                : `${reportTypeLabel} REPORT OF ESM REST HOUSE`}
            </h1>
            <p>
              {language === "mr" ? "दिनांक :" : "AS ON:"} {formatDate(report.reportDate)}
            </p>
            <p className="daily-report-period">
              {language === "mr" ? "अहवाल कालावधी:" : "REPORTING PERIOD:"}{" "}
              {formatDateTime(report.periodStart)} – {formatDateTime(report.periodEnd)}
              {report.snapshotSaved
                ? language === "mr"
                  ? " · जतन केलेला snapshot"
                  : " · Saved snapshot"
                : language === "mr"
                  ? " · live preview"
                  : " · Live preview"}
            </p>
            <small>
              {language === "mr"
                ? "बालक: नोंदवलेल्या जन्मतारखेनुसार १२ वर्षांखालील; रक्कम बुकिंगच्या एकूण दरातून चेक-इन अतिथींमध्ये विभागली आहे."
                : "Children are identified from recorded date of birth (under 12); booking amounts are apportioned across checked-in guests."}
            </small>
          </header>

          <div className="daily-report-tables">
            {renderRoomTable(leftRooms, language === "mr" ? "AC / NAC कक्ष" : "AC / NAC ROOMS")}
            {renderRoomTable(rightRooms, language === "mr" ? "वसतिगृह / हॉल" : "B&B / DORMITORY / HALL")}
          </div>

          <section className="daily-report-summary">
            <div>
              <strong>{language === "mr" ? "AC रिक्त खोल्या" : "AC Vacant Rooms"}</strong>
              <span>{report.summaries.acVacantRooms}</span>
            </div>
            <div>
              <strong>{language === "mr" ? "Non-AC रिक्त खोल्या" : "Non-AC Vacant Rooms"}</strong>
              <span>{report.summaries.nonAcVacantRooms}</span>
            </div>
            <div>
              <strong>{language === "mr" ? "AC STR · M / F / CH / G" : "AC STR · M / F / CH / G"}</strong>
              <span>
                {report.summaries.acOccupancy.male} / {report.summaries.acOccupancy.female} /{" "}
                {report.summaries.acOccupancy.children} / {report.summaries.acOccupancy.guests}
              </span>
            </div>
            <div>
              <strong>{language === "mr" ? "DM STR · M / F / CH / G" : "DM STR · M / F / CH / G"}</strong>
              <span>
                {report.summaries.dormitoryOccupancy.male} / {report.summaries.dormitoryOccupancy.female} /{" "}
                {report.summaries.dormitoryOccupancy.children} / {report.summaries.dormitoryOccupancy.guests}
              </span>
            </div>
            <div>
              <strong>{language === "mr" ? "एकूण अतिथी" : "TOTAL GUESTS"}</strong>
              <span>{report.totals.guests}</span>
            </div>
          </section>
          <section className="daily-report-activity">
            <h2>
              {reportType === "DAILY"
                ? language === "mr"
                  ? "मागील २४ तासांतील चेक-इन / चेक-आउट"
                  : "CHECK-IN / CHECK-OUT — PREVIOUS 24 HOURS"
                : language === "mr"
                  ? `${reportTypeLabel} कालावधीतील चेक-इन / चेक-आउट`
                  : `CHECK-IN / CHECK-OUT — ${reportTypeLabel} PERIOD`}
            </h2>
            <table>
              <thead>
                <tr>
                  <th>{language === "mr" ? "वेळ" : "Time"}</th>
                  <th>{language === "mr" ? "प्रकार" : "Action"}</th>
                  <th>{language === "mr" ? "बुकिंग" : "Booking"}</th>
                  <th>{language === "mr" ? "अतिथी" : "Guest"}</th>
                  <th>{language === "mr" ? "खोली / बेड" : "Room / Bed"}</th>
                  <th>{language === "mr" ? "नोंद करणारे" : "Handled by"}</th>
                  <th>{language === "mr" ? "शेरा" : "Remarks"}</th>
                </tr>
              </thead>
              <tbody>
                {report.activity.map((item, index) => (
                  <tr key={`${item.eventType}-${item.eventTime}-${item.bookingReference}-${index}`}>
                    <td>{formatDateTime(item.eventTime)}</td>
                    <td>
                      {item.eventType === "CHECK_IN"
                        ? language === "mr" ? "चेक-इन" : "Check-in"
                        : language === "mr" ? "चेक-आउट" : "Check-out"}
                    </td>
                    <td>{item.bookingReference}</td>
                    <td>{item.guestName}</td>
                    <td>
                      {item.roomNumber}
                      {item.bedNumber !== null ? ` / ${item.bedNumber}` : ""}
                    </td>
                    <td>{item.handledBy || "—"}</td>
                    <td>{item.remarks || "—"}</td>
                  </tr>
                ))}
                {report.activity.length === 0 && (
                  <tr>
                    <td colSpan={7} className="daily-report-empty">
                      {reportType === "DAILY"
                        ? language === "mr"
                          ? "या २४ तासांत चेक-इन / चेक-आउट नोंद नाही"
                          : "No check-ins or check-outs in this 24-hour period"
                        : language === "mr"
                          ? "या कालावधीत चेक-इन / चेक-आउट नोंद नाही"
                          : "No check-ins or check-outs in this report period"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
          {reportType === "MONTHLY" && (
            <section className="daily-report-payment-summary">
              <h2>
                {language === "mr"
                  ? "मासिक जमा रक्कम"
                  : "MONTHLY COLLECTION SUMMARY"}
              </h2>
              <div>
                <strong>{language === "mr" ? "रोख जमा" : "CASH COLLECTED"}</strong>
                <span>₹{formatAmount(report.payments.cash)}</span>
              </div>
              <div>
                <strong>{language === "mr" ? "UPI जमा" : "UPI COLLECTED"}</strong>
                <span>₹{formatAmount(report.payments.upi)}</span>
              </div>
              <div>
                <strong>{language === "mr" ? "एकूण रोख + UPI" : "TOTAL CASH + UPI"}</strong>
                <span>
                  ₹{formatAmount(report.payments.cash + report.payments.upi)}
                </span>
              </div>
            </section>
          )}
          {user.role === "ADMIN" && (
            <section className="daily-report-feedback">
              <h2>{language === "mr" ? "चेक-आउट अतिथी अभिप्राय" : "CHECK-OUT GUEST FEEDBACK"}</h2>
              <table>
                  <thead>
                    <tr>
                      <th>{language === "mr" ? "बुकिंग" : "Booking"}</th>
                      <th>{language === "mr" ? "बुकिंग व्यक्ती" : "Booking person"}</th>
                      <th>{language === "mr" ? "कर्मचारी" : "Staff"}</th>
                      <th>{language === "mr" ? "हाऊसकीपिंग" : "Housekeeping"}</th>
                      <th>{language === "mr" ? "सुविधा" : "Facilities"}</th>
                      <th>{language === "mr" ? "जेवण" : "Food"}</th>
                      <th>{language === "mr" ? "एकूण" : "Overall"}</th>
                      <th>{language === "mr" ? "स्थिती / अभिप्राय" : "Status / comments"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackReport.map((item) => (
                      <tr key={item.booking_id}>
                        <th scope="row">{item.booking_reference}</th>
                        <td>{item.service_name || "-"}</td>
                        <td>{item.staff_rating ?? "-"}</td>
                        <td>{item.housekeeping_rating ?? "-"}</td>
                        <td>{item.facilities_rating ?? "-"}</td>
                        <td>{item.food_rating ?? "-"}</td>
                        <td>{item.overall_rating ?? "-"}</td>
                        <td>
                          {item.feedback_status === "SKIPPED"
                            ? language === "mr" ? "वगळले" : "Skipped"
                            : item.comments || "-"}
                        </td>
                      </tr>
                    ))}
                    {feedbackReport.length === 0 && (
                      <tr>
                        <td colSpan={8} className="daily-report-empty">
                          {language === "mr"
                            ? "या २४ तासांत अभिप्राय नोंद नाही"
                            : "No feedback recorded in this 24-hour period"}
                        </td>
                      </tr>
                    )}
                  </tbody>
              </table>
            </section>
          )}
          <div className="daily-report-grand-total">
            <strong>{language === "mr" ? "एकत्रित एकूण · पु / म / बा / अ / रक्कम" : "GRAND TOTAL · M / F / CH / G / AMT"}</strong>
            <span>
              {report.totals.male} / {report.totals.female} / {report.totals.children} /{" "}
              {report.totals.guests} · ₹{formatAmount(report.totals.amount)}
            </span>
          </div>
          <div className="daily-report-signoff">
            <span>{language === "mr" ? "DVR :" : "DVR:"}</span>
            <span>{language === "mr" ? "सूचना :" : "Remarks:"}</span>
          </div>
          <footer className="daily-report-sheet-footer">
            {language === "mr" ? "अहवाल तयार केला:" : "Report generated"}{" "}
            {formatDateTime(report.generatedAt)}
          </footer>
        </article>
      )}
    </main>
  );
}

export default DailyReport;
