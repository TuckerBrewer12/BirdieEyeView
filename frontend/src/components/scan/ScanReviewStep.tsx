import { useState, useRef } from "react";
import { CheckCircle, AlertTriangle, Loader2, X, ChevronDown, Info } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { CourseLinkSearch, CourseLinkChip, CustomNameChip } from "@/components/CourseLinkSearch";
import { formatToPar, calcCourseHandicap, calcNetScore } from "@/types/golf";
import { toParTextClass } from "@/lib/colors";
import type { CourseSummary } from "@/types/golf";
import type { ScanState, ScanResult, ExtractedHoleScore, FieldConfidence, ScoreMetadata } from "@/types/scan";
import { initialScanState } from "@/types/scan";
import { formatCourseName } from "@/lib/courseName";
import { scoreInputStyle } from "@/lib/scoreSymbol";
import { classifyScanWarnings, buildReviewItems, buildCompletenessStats } from "@/lib/scanUtils";
import type { ScanWarningKey } from "@/lib/scanUtils";

type ConfTier = "high" | "medium" | "low" | null;
function strokeConfTier(sc: FieldConfidence | null): ConfTier {
  if (!sc) return null;
  if (sc.level === "high") return "high";
  if (sc.level === "medium") return "medium";
  return "low";
}

interface ScanReviewStepProps {
  result: ScanResult;
  scanMode: ScanState["scanMode"];
  editedScores: ExtractedHoleScore[];
  editedDate: string;
  editedTeeBox: string | null;
  error: string | null;
  preview: string | null;
  reviewCourseId: string | null;
  reviewExternalCourseId: string | null;
  reviewCourseName: string | null;
  saving: boolean;
  handicapIndex: number | null;

  // Review course search
  reviewCourseQuery: string;
  reviewCourseResults: CourseSummary[];
  reviewSearching: boolean;
  onReviewCourseQuery: (q: string) => void;
  onSelectReviewCourse: (course: CourseSummary) => void;

  scoreMetadata: ScoreMetadata[];

  // Callbacks
  onUpdate: (patch: Partial<ScanState>) => void;
  onScoreChange: (index: number, field: "strokes" | "putts" | "hole_number", value: string) => void;
  onGirChange: (index: number, value: boolean | null) => void;
  onSave: () => void;
  setReviewCourseQuery: (q: string) => void;
  setReviewCourseResults: (r: CourseSummary[]) => void;
  setScanState: React.Dispatch<React.SetStateAction<ScanState>>;
}


function DragScrubCell({
  value, min, max, onChange, children,
}: {
  value: number | null;
  min: number;
  max: number;
  onChange: (v: number) => void;
  children: React.ReactNode;
}) {
  const startY = useRef<number | null>(null);
  const startVal = useRef<number>(0);
  const dragging = useRef(false);
  const motionY = useMotionValue(0);
  const motionScale = useMotionValue(1);

  function onPointerDown(e: React.PointerEvent) {
    startY.current = e.clientY;
    startVal.current = value ?? min;
    dragging.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (startY.current === null) return;
    const dy = startY.current - e.clientY;
    if (Math.abs(dy) >= 4) dragging.current = true;
    if (!dragging.current) return;
    motionScale.set(1.1);
    // Number physically follows finger, capped at ±12px
    motionY.set(Math.max(-12, Math.min(12, -dy * 0.5)));
    const delta = Math.round(dy / 16);
    const clamped = Math.max(min, Math.min(max, startVal.current + delta));
    if (clamped !== value) onChange(clamped);
  }

  function onPointerUp(e: React.PointerEvent) {
    const wasDrag = dragging.current;
    startY.current = null;
    dragging.current = false;
    animate(motionY, 0, { type: "spring", stiffness: 500, damping: 28 });
    animate(motionScale, 1, { type: "spring", stiffness: 500, damping: 28 });
    if (!wasDrag) {
      const input = (e.currentTarget as HTMLElement).querySelector<HTMLInputElement>("input");
      input?.focus();
      input?.select();
    }
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ touchAction: "none", cursor: "ns-resize" }}
      className="select-none"
    >
      <motion.div style={{ y: motionY, scale: motionScale }}>
        {children}
      </motion.div>
    </div>
  );
}


export function ScanReviewStep({
  result,
  scanMode,
  editedScores,
  scoreMetadata,
  editedDate,
  editedTeeBox,
  error,
  preview,
  reviewCourseId,
  reviewExternalCourseId,
  reviewCourseName,
  saving,
  handicapIndex,
  reviewCourseQuery,
  reviewCourseResults,
  reviewSearching,
  onReviewCourseQuery,
  onSelectReviewCourse,
  onUpdate,
  onScoreChange,
  onGirChange,
  onSave,
  setReviewCourseQuery,
  setReviewCourseResults,
  setScanState,
}: ScanReviewStepProps) {
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<ScanWarningKey>>(new Set());
  const [customNameConfirmed, setCustomNameConfirmed] = useState(false);
  const [trayOpen, setTrayOpen] = useState(true);
  const [imageOverlayOpen, setImageOverlayOpen] = useState(false);
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());
  const rd = result.round;
  const coursePar = rd.course?.par ?? null;
  const totalStrokes = editedScores.reduce((s, h) => s + (h.strokes ?? 0), 0);
  const toPar = coursePar ? totalStrokes - coursePar : null;

  const strokesReviewFields = result.fields_needing_review.filter(
    (f) => f.toLowerCase().includes("strokes")
  );
  const puttsNotRecorded = result.fields_needing_review.some(
    (f) => f.toLowerCase().includes("putts")
  );

  const confidenceIsOk = strokesReviewFields.length === 0;
  const confidenceBannerClass = confidenceIsOk
    ? "text-white bg-[#2d7a3a] border border-[#2d7a3a]"
    : "text-white bg-amber-500 border border-amber-500";

  function getFieldConfidence(holeNumber: number | null, index: number, field: string): FieldConfidence | null {
    const num = holeNumber ?? index + 1;
    const hc = result?.confidence.hole_scores?.find((h) => h.hole_number === num);
    return hc?.fields?.[field] ?? null;
  }

  const frontNine = editedScores.slice(0, 9).reduce((s, h) => s + (h.strokes ?? 0), 0) || null;
  const backNine = editedScores.slice(9).reduce((s, h) => s + (h.strokes ?? 0), 0) || null;

  function renderNine(startIdx: number, label: string, showGrandTotal = false, isManual = false) {
    const slice = editedScores.slice(startIdx, startIdx + 9);
    const ninePar = slice.reduce((s, hs, si) => {
      const holeNum = hs.hole_number ?? startIdx + si + 1;
      return s + (rd.course?.holes.find((h) => h.number === holeNum)?.par ?? 0);
    }, 0);
    const nineScore = slice.reduce((s, hs) => s + (hs.strokes ?? 0), 0);
    const hasScores = slice.some((hs) => hs.strokes != null);
    const nineToPar = hasScores && ninePar > 0 ? nineScore - ninePar : null;

    const selectedTee = editedTeeBox
      ? (rd.course?.tees ?? []).find((t) => t.color?.toLowerCase() === editedTeeBox.toLowerCase()) ?? null
      : null;
    const nineYardage = selectedTee
      ? slice.reduce((sum, hs, si) => {
          const holeNum = hs.hole_number ?? startIdx + si + 1;
          return sum + (selectedTee.hole_yardages[String(holeNum)] ?? 0);
        }, 0)
      : null;
    const totalYardage = selectedTee
      ? editedScores.reduce((sum, hs, i) => {
          const holeNum = hs.hole_number ?? i + 1;
          return sum + (selectedTee.hole_yardages[String(holeNum)] ?? 0);
        }, 0)
      : null;

    return (
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
            <th className="px-3 py-2 text-left w-16">Hole</th>
            {slice.map((hs, si) => (
              <th key={si} className="px-1 py-2 text-center min-w-[2.25rem]">
                {hs.hole_number ?? startIdx + si + 1}
              </th>
            ))}
            <th className="px-2 py-2 text-center w-12 bg-gray-100">{label}</th>
            {showGrandTotal && <th className="px-2 py-2 text-center w-12 bg-gray-200">TOT</th>}
          </tr>
        </thead>
        <tbody>
          {/* Yardage — only when a tee with yardage data is selected */}
          {selectedTee && Object.keys(selectedTee.hole_yardages).length > 0 && (
            <tr className="border-b border-gray-100 text-xs text-gray-400">
              <td className="px-3 py-1.5 font-medium">Yds</td>
              {slice.map((hs, si) => {
                const holeNum = hs.hole_number ?? startIdx + si + 1;
                const yds = selectedTee.hole_yardages[String(holeNum)];
                return <td key={si} className="px-1 py-1.5 text-center">{yds ?? "-"}</td>;
              })}
              <td className="px-2 py-1.5 text-center bg-gray-50 font-bold">{nineYardage ?? "-"}</td>
              {showGrandTotal && <td className="px-2 py-1.5 text-center bg-gray-100 font-bold">{totalYardage ?? "-"}</td>}
            </tr>
          )}
          {/* Handicap — shown when any hole has a handicap value */}
          {slice.some((hs, si) => {
            const holeNum = hs.hole_number ?? startIdx + si + 1;
            return rd.course?.holes.find((h) => h.number === holeNum)?.handicap != null;
          }) && (
            <tr className="border-b border-gray-100 text-xs text-gray-400">
              <td className="px-3 py-1.5 font-medium">Hdcp</td>
              {slice.map((hs, si) => {
                const holeNum = hs.hole_number ?? startIdx + si + 1;
                const hdcp = rd.course?.holes.find((h) => h.number === holeNum)?.handicap;
                return <td key={si} className="px-1 py-1.5 text-center">{hdcp ?? "-"}</td>;
              })}
              <td className="px-2 py-1.5 text-center bg-gray-50" />
              {showGrandTotal && <td className="px-2 py-1.5 text-center bg-gray-100" />}
            </tr>
          )}
          {/* Par */}
          <tr className="border-b border-gray-100 text-xs text-gray-500">
            <td className="px-3 py-1.5 font-medium">Par</td>
            {slice.map((hs, si) => {
              const holeNum = hs.hole_number ?? startIdx + si + 1;
              const par = rd.course?.holes.find((h) => h.number === holeNum)?.par;
              return <td key={si} className="px-1 py-1.5 text-center">{par ?? "-"}</td>;
            })}
            <td className="px-2 py-1.5 text-center bg-gray-50 font-bold">{ninePar ?? "-"}</td>
            {showGrandTotal && <td className="px-2 py-1.5 text-center bg-gray-100 font-bold">{coursePar ?? "-"}</td>}
          </tr>

          {/* Score */}
          <tr className="border-b border-gray-100">
            <td className="px-3 py-1.5 font-semibold text-gray-900 text-sm">Score</td>
            {slice.map((hs, si) => {
              const origIdx = startIdx + si;
              const holeNum = hs.hole_number ?? startIdx + si + 1;
              const par = rd.course?.holes.find((h) => h.number === holeNum)?.par ?? null;
              const sc = getFieldConfidence(hs.hole_number, origIdx, "strokes");
              const tier = strokeConfTier(sc);
              const diff = hs.strokes != null && par != null ? hs.strokes - par : null;
              const cellStyle: React.CSSProperties = (() => {
                if (tier === "low") return { fontSize: "16px", border: "1.5px solid #ef4444", background: "#fef2f2", color: "#991b1b", borderRadius: 4 };
                if (tier === "medium") return { fontSize: "16px", border: "1.5px solid #f59e0b", background: "#fffbeb", color: "#92400e", borderRadius: 4 };
                if (tier === "high") return { fontSize: "16px", ...scoreInputStyle(diff), boxShadow: "inset 0 0 0 1.5px #22c55e" };
                return { fontSize: "16px", ...scoreInputStyle(diff) };
              })();
              return (
                <td key={si} className="px-0.5 py-1 text-center"
                  ref={(el) => { if (el) cellRefs.current.set(`hole-${origIdx}`, el); }}>
                  <div className="inline-flex items-center gap-0.5">
                    <DragScrubCell
                      value={hs.strokes}
                      min={1}
                      max={15}
                      onChange={(v) => onScoreChange(origIdx, "strokes", String(v))}
                    >
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={2}
                          value={hs.strokes ?? ""}
                          onChange={(e) => onScoreChange(origIdx, "strokes", e.target.value)}
                          className="w-7 h-7 text-center px-0 py-0 text-sm font-semibold focus:outline-none"
                          style={cellStyle}
                        />
                        {tier === "low" && (
                          <motion.div
                            className="absolute inset-0 rounded border-2 border-red-400 pointer-events-none"
                            animate={{ opacity: [1, 0.2, 1] }}
                            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                          />
                        )}
                      </div>
                    </DragScrubCell>
                    <div className="hidden md:flex flex-col">
                      <button type="button" tabIndex={-1}
                        onClick={() => onScoreChange(origIdx, "strokes", String(Math.min(15, (hs.strokes ?? 1) + 1)))}
                        className="h-3.5 w-3.5 flex items-center justify-center text-gray-400 hover:text-gray-700 leading-none select-none text-[10px]"
                      >▲</button>
                      <button type="button" tabIndex={-1}
                        onClick={() => onScoreChange(origIdx, "strokes", String(Math.max(1, (hs.strokes ?? 1) - 1)))}
                        className="h-3.5 w-3.5 flex items-center justify-center text-gray-400 hover:text-gray-700 leading-none select-none text-[10px]"
                      >▼</button>
                    </div>
                  </div>
                  {tier === "low" && !hs.strokes && (
                    <div className="text-[8px] font-bold text-red-500 leading-none mt-0.5 uppercase tracking-wide">check</div>
                  )}
                  {tier === "medium" && (
                    <div className="text-[8px] font-bold text-amber-500 leading-none mt-0.5 uppercase tracking-wide">review</div>
                  )}
                  {(tier === "low" || hs.strokes === null) && (() => {
                    const center = hs.strokes ?? par ?? 4;
                    const chips = [center - 1, center, center + 1].filter(v => v >= 1 && v <= 15);
                    return (
                      <div className="flex justify-center gap-0.5 mt-0.5">
                        {chips.map(v => (
                          <button key={v}
                            onClick={() => onScoreChange(origIdx, "strokes", String(v))}
                            className={`w-5 h-5 text-[10px] font-semibold rounded ${
                              v === hs.strokes ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >{v}</button>
                        ))}
                      </div>
                    );
                  })()}
                </td>
              );
            })}
            <td className="px-2 py-1.5 text-center bg-gray-50 font-bold text-gray-900 text-sm">
              {hasScores ? nineScore : "-"}
            </td>
            {showGrandTotal && (
              <td className="px-2 py-1.5 text-center bg-gray-100 font-bold text-base text-gray-900">
                {totalStrokes ?? "-"}
              </td>
            )}
          </tr>

          {/* To Par */}
          <tr className={`text-xs ${!puttsNotRecorded ? "border-b border-gray-100" : ""}`}>
            <td className="px-3 py-1.5 text-gray-500 font-medium">To Par</td>
            {slice.map((hs, si) => {
              const holeNum = hs.hole_number ?? startIdx + si + 1;
              const par = rd.course?.holes.find((h) => h.number === holeNum)?.par ?? null;
              return (
                <td key={si} className={`px-1 py-1.5 text-center ${toParTextClass(hs.strokes != null && par != null ? hs.strokes - par : null)}`}>
                  {formatToPar(hs.strokes != null && par != null ? hs.strokes - par : null)}
                </td>
              );
            })}
            <td className={`px-2 py-1.5 text-center bg-gray-50 font-bold ${nineToPar === null ? "text-gray-400" : nineToPar < 0 ? "text-green-600" : nineToPar > 0 ? "text-red-500" : "text-gray-600"}`}>
              {nineToPar === null ? "-" : nineToPar === 0 ? "E" : nineToPar > 0 ? `+${nineToPar}` : nineToPar}
            </td>
            {showGrandTotal && (
              <td className={`px-2 py-1.5 text-center bg-gray-100 font-bold text-sm ${toPar === null ? "text-gray-400" : toPar < 0 ? "text-green-600" : toPar > 0 ? "text-red-500" : "text-gray-600"}`}>
                {formatToPar(toPar)}
              </td>
            )}
          </tr>

          {/* Putts — always in manual mode, otherwise only if recorded on card */}
          {(!puttsNotRecorded || isManual) && (
            <tr className="text-xs text-gray-500">
              <td className="px-3 py-1.5 font-medium">Putts</td>
              {slice.map((hs, si) => {
                const origIdx = startIdx + si;
                const isEstimated = scoreMetadata[origIdx]?.putts_estimated === true;
                return (
                  <td key={si} className="px-1 py-1 text-center">
                    <DragScrubCell
                      value={hs.putts}
                      min={0}
                      max={10}
                      onChange={(v) => onScoreChange(origIdx, "putts", String(v))}
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        value={hs.putts ?? ""}
                        onChange={(e) => onScoreChange(origIdx, "putts", e.target.value)}
                        title={isEstimated ? "Estimated (2-putt default)" : undefined}
                        className={`w-7 h-7 text-center px-0 py-0 border rounded text-sm focus:outline-none ${
                          isEstimated
                            ? "border-dashed border-amber-400 bg-amber-50/50 text-amber-700"
                            : "border-gray-200"
                        }`}
                        style={{ fontSize: "16px" }}
                      />
                    </DragScrubCell>
                  </td>
                );
              })}
              <td className="px-2 py-1.5 text-center bg-gray-50">
                {slice.reduce((s, hs) => s + (hs.putts ?? 0), 0)}
              </td>
              {showGrandTotal && (
                <td className="px-2 py-1.5 text-center bg-gray-100">
                  {editedScores.reduce((s, hs) => s + (hs.putts ?? 0), 0)}
                </td>
              )}
            </tr>
          )}

          {/* GIR — manual entry, or when any GIR data present (including auto-calculated) */}
          {(isManual || slice.some((hs) => hs.green_in_regulation !== null)) && (
            <tr className="text-xs">
              <td className="px-3 py-1.5 font-bold text-green-700">GIR</td>
              {slice.map((hs, si) => {
                const origIdx = startIdx + si;
                const gir = hs.green_in_regulation;
                const isCalcGir = scoreMetadata[origIdx]?.gir_calculated === true;
                return (
                  <td key={si} className="px-1 py-1 text-center">
                    <button
                      onClick={() => onGirChange(origIdx, gir === true ? false : gir === false ? null : true)}
                      className="w-7 h-7 flex items-center justify-center mx-auto rounded-full hover:bg-gray-100 focus:outline-none"
                      style={isCalcGir ? { outline: "1px dashed #9ca3af", outlineOffset: "1px" } : undefined}
                      title={
                        isCalcGir
                          ? "Auto-calculated from strokes and putts — click to override"
                          : gir === true
                            ? "GIR hit — click to mark missed"
                            : gir === false
                              ? "GIR missed — click to clear"
                              : "GIR unknown — click to mark hit"
                      }
                    >
                      <span style={{ color: gir === true ? "#16a34a" : "#9ca3af" }}>
                        {gir === true ? "●" : gir === false ? "○" : "–"}
                      </span>
                    </button>
                  </td>
                );
              })}
              <td className="px-2 py-1.5 text-center text-green-700 font-semibold bg-gray-50">
                {slice.filter((hs) => hs.green_in_regulation === true).length}
              </td>
              {showGrandTotal && (
                <td className="px-2 py-1.5 text-center text-green-700 font-semibold bg-gray-100">
                  {editedScores.filter((hs) => hs.green_in_regulation === true).length}
                </td>
              )}
            </tr>
          )}
        </tbody>
      </table>
    );
  }

  return (
    <div>
      <PageHeader
        title={formatCourseName(reviewCourseName ?? rd.course?.name ?? "Review Extraction")}
        subtitle={rd.course?.location ?? "Verify and edit the extracted data"}
      />

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Confidence banner */}
      <div className={`mb-4 p-3 rounded-lg text-sm font-medium flex items-start gap-2 ${confidenceBannerClass}`}>
        {confidenceIsOk ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
        <div>
          {confidenceIsOk
            ? scanMode === "manual"
              ? "Enter your scores hole by hole below"
              : "Extraction looks good — verify scores below"
            : `${strokesReviewFields.length} score(s) may need review — verify highlighted holes`}
          {puttsNotRecorded && !confidenceIsOk && (
            <div className="font-normal text-xs mt-0.5 opacity-75">Putts not recorded on this scorecard</div>
          )}
        </div>
      </div>

      {/* Structured scan warnings */}
      {scanMode !== "manual" && (() => {
        const warnings = classifyScanWarnings(result, editedScores, puttsNotRecorded)
          .filter(w => !dismissedWarnings.has(w.key));
        if (!warnings.length) return null;
        return (
          <div className="mb-4 flex flex-wrap gap-2">
            {warnings.map(w => (
              <motion.div key={w.key}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-800"
              >
                <AlertTriangle size={12} className="shrink-0 text-amber-500" />
                {w.label}
                <button onClick={() => setDismissedWarnings(prev => new Set([...prev, w.key]))}
                  className="ml-1 text-amber-400 hover:text-amber-700 focus:outline-none" aria-label="Dismiss">
                  <X size={11} />
                </button>
              </motion.div>
            ))}
          </div>
        );
      })()}

      {/* Stat cards */}
      {(() => {
        const selectedTee = editedTeeBox
          ? rd.course?.tees?.find((t) => t.color?.toLowerCase() === editedTeeBox.toLowerCase()) ?? null
          : null;
        const courseHandicap =
          handicapIndex != null &&
          selectedTee?.slope_rating != null &&
          selectedTee?.course_rating != null &&
          coursePar != null
            ? calcCourseHandicap(handicapIndex, selectedTee.slope_rating, selectedTee.course_rating, coursePar)
            : null;
        const netScore = courseHandicap != null && totalStrokes > 0
          ? calcNetScore(totalStrokes, courseHandicap)
          : null;

        return (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">Front 9</div>
                <div className="text-3xl font-bold text-gray-900">{frontNine ?? "-"}</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">Back 9</div>
                <div className="text-3xl font-bold text-gray-900">{backNine ?? "-"}</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">Total</div>
                <div className="text-3xl font-bold text-gray-900">{totalStrokes ?? "-"}</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">To Par</div>
                <div className={`text-3xl font-bold ${toPar !== null && toPar < 0 ? "text-green-600" : toPar !== null && toPar > 0 ? "text-red-500" : "text-gray-900"}`}>
                  {formatToPar(toPar)}
                </div>
              </div>
              <div className={`bg-white rounded-xl border border-gray-200 border-l-4 p-4 text-center ${netScore != null && coursePar != null ? netScore <= coursePar ? "border-l-birdie" : "border-l-bogey" : "border-l-gray-300"}`}>
                <div className="text-xs text-gray-500 mb-1">Net Score</div>
                <div className={`text-3xl font-bold ${netScore != null && coursePar != null ? netScore <= coursePar ? "text-birdie" : "text-bogey" : "text-gray-900"}`}>{netScore ?? "-"}</div>
                {courseHandicap != null && (
                  <div className="text-xs text-gray-400 mt-0.5">HCP {courseHandicap < 0 ? `+${Math.abs(courseHandicap)}` : courseHandicap}</div>
                )}
              </div>
            </div>
            {scanMode !== "manual" && !reviewCourseId && !reviewExternalCourseId && (
              <div className="mb-4 flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                <Info size={13} className="mt-0.5 shrink-0 text-blue-400" />
                Round will be saved without a linked course. Par values from this scan are stored.
              </div>
            )}
          </>
        );
      })()}

      {/* Top: image + metadata side by side */}
      <div className={`grid grid-cols-1 gap-6 mb-6 ${scanMode !== "manual" ? "lg:grid-cols-2" : ""}`}>
        {scanMode !== "manual" && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm sticky top-20 self-start">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Original Image</h3>
            {preview && <img src={preview} alt="Scorecard" className="w-full rounded-lg" />}
          </div>
        )}

        <div className="space-y-4">
          {/* Course info */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="text-lg font-bold text-gray-900">
              {formatCourseName(reviewCourseId ? reviewCourseName : reviewCourseName ?? "Unknown Course")}
            </div>
            {rd.course?.location && <div className="text-sm text-gray-500">{rd.course.location}</div>}
            <div className="flex gap-4 mt-2 text-sm text-gray-600">
              <span>Par: {coursePar ?? "-"}</span>
            </div>

            {/* Course link / search */}
            <div className="mt-3">
              {reviewCourseId || reviewExternalCourseId ? (
                <CourseLinkChip
                  name={formatCourseName(reviewCourseName ?? "")}
                  onClear={() => {
                    setCustomNameConfirmed(false);
                    onUpdate({ reviewCourseId: null, reviewExternalCourseId: null });
                    setReviewCourseQuery(reviewCourseName ?? "");
                  }}
                />
              ) : customNameConfirmed && reviewCourseName ? (
                <CustomNameChip
                  name={formatCourseName(reviewCourseName)}
                  onClear={() => {
                    setCustomNameConfirmed(false);
                    setReviewCourseQuery(reviewCourseName ?? "");
                  }}
                />
              ) : (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Link to saved course or enter name</label>
                  <CourseLinkSearch
                    query={reviewCourseQuery}
                    results={reviewCourseResults}
                    searching={reviewSearching}
                    onQueryChange={onReviewCourseQuery}
                    onSelectCourse={(course) => {
                      setCustomNameConfirmed(false);
                      onSelectReviewCourse(course);
                    }}
                    onClose={() => { setReviewCourseQuery(""); setReviewCourseResults([]); }}
                    reviewVariant
                    onUseCustomName={(name) => {
                      onUpdate({ reviewCourseName: name, reviewCourseId: null, reviewExternalCourseId: null });
                      setReviewCourseResults([]);
                      setCustomNameConfirmed(true);
                    }}
                  />
                  {reviewCourseName && !reviewCourseQuery && (
                    <button
                      onClick={() => setCustomNameConfirmed(true)}
                      className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Save as "{formatCourseName(reviewCourseName)}" without linking →
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* Tee selector — only when matched course has tee data */}
            {rd.course?.tees && rd.course.tees.length > 0 ? (() => {
              const selectedTee = rd.course!.tees.find(
                (t) => t.color?.toLowerCase() === editedTeeBox?.toLowerCase()
              ) ?? null;
              return (
                <div className="mt-3">
                  <label className="text-xs text-gray-500 block mb-1">Tee Played</label>
                  <select
                    value={editedTeeBox ?? ""}
                    onChange={(e) => onUpdate({ editedTeeBox: e.target.value || null })}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="">— select tee —</option>
                    {rd.course!.tees.map((t, i) => (
                      <option key={i} value={t.color ?? ""}>{t.color ?? "Unknown"}</option>
                    ))}
                  </select>
                  {selectedTee && (selectedTee.slope_rating != null || selectedTee.course_rating != null) && (
                    <div className="mt-1.5 flex gap-3 text-xs text-gray-500">
                      {selectedTee.slope_rating != null && <span>Slope {selectedTee.slope_rating}</span>}
                      {selectedTee.course_rating != null && <span>Rating {selectedTee.course_rating}</span>}
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="mt-2 text-sm text-gray-600">
                Tee: {editedTeeBox ?? "-"}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <label className="text-xs text-gray-500">Date</label>
            <input type="date" value={editedDate}
              onChange={(e) => onUpdate({ editedDate: e.target.value })}
              max={new Date().toISOString().substring(0, 10)}
              className="w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
          </div>

          {/* Completeness meter */}
          {(() => {
            const cs = buildCompletenessStats(editedScores, result, reviewCourseId, reviewExternalCourseId, reviewCourseName, puttsNotRecorded);
            const sc = (n: number, t: number) => n === t ? "text-green-700" : n === 0 ? "text-gray-400" : "text-amber-600";
            return (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-3 text-gray-500">
                <span className={sc(cs.scores.complete, cs.scores.total)}>{cs.scores.complete}/{cs.scores.total} scores</span>
                <span className={sc(cs.pars.complete, cs.pars.total)}>{cs.pars.complete}/{cs.pars.total} pars</span>
                {cs.putts
                  ? <span className={sc(cs.putts.complete, cs.putts.total)}>{cs.putts.complete}/{cs.putts.total} putts</span>
                  : <span className="text-gray-400">Putts: not detected</span>}
                <span className={cs.courseLinked ? "text-green-700" : "text-amber-600"}>
                  {cs.courseLinked ? `Course: ${cs.courseName ?? "matched"}` : "Course: not matched"}
                </span>
              </div>
            );
          })()}

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onSave} disabled={saving}
              className="flex-1 px-5 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />Saving...
                </span>
              ) : "Save Round"}
            </button>
            <button onClick={() => setScanState(initialScanState)}
              className="px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Start Over
            </button>
          </div>
        </div>
      </div>

      {/* Review needed tray */}
      {scanMode !== "manual" && (() => {
        const items = buildReviewItems(result, editedScores);
        if (!items.length) return null;
        const scrollToHole = (holeIndex: number | null) => {
          if (holeIndex === null) return;
          cellRefs.current.get(`hole-${holeIndex}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        };
        return (
          <div className="mb-4 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button onClick={() => setTrayOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <span>{items.length} item{items.length > 1 ? "s" : ""} to review</span>
              <ChevronDown size={15} className={`transition-transform ${trayOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {trayOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                  className="overflow-hidden">
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                    {items.map(item => (
                      <button key={item.key} onClick={() => scrollToHole(item.holeIndex)}
                        className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-800 hover:bg-amber-100 transition-colors">
                        {item.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })()}

      {/* Horizontal scorecard */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <div className="min-w-[680px]">
          {renderNine(0, "OUT", false, scanMode === "manual")}
          <div className="border-t-2 border-gray-300" />
          {renderNine(9, "IN", true, scanMode === "manual")}
        </div>
      </div>

      {/* Mobile: sticky image thumbnail + full-screen overlay */}
      {scanMode !== "manual" && preview && (
        <>
          <button onClick={() => setImageOverlayOpen(true)}
            className="fixed bottom-24 right-4 z-30 md:hidden w-14 h-14 rounded-xl shadow-lg border border-gray-200 overflow-hidden bg-white"
            aria-label="View scorecard image">
            <img src={preview} alt="" className="w-full h-full object-cover" />
          </button>
          <AnimatePresence>
            {imageOverlayOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 md:hidden"
                onClick={() => setImageOverlayOpen(false)}>
                <motion.img initial={{ scale: 0.92 }} animate={{ scale: 1 }}
                  src={preview} alt="Scorecard"
                  className="max-w-full max-h-full rounded-xl object-contain"
                  onClick={(e) => e.stopPropagation()} />
                <button onClick={() => setImageOverlayOpen(false)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white">
                  <X size={24} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
