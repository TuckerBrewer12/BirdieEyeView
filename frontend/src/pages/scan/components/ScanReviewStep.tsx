import { CircleAlert, Loader2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CourseLinkSearch,
  Field,
  FieldLabel,
  Input,
  RoundScorecard,
  Stat,
  StatLabel,
  StatValue,
  ToggleGroup,
  ToggleGroupItem,
  toParDisplay,
  toParTextClass,
} from "@/brand";
import { formatCourseHandicap, type Round } from "@/domain";
import { formatCourseName } from "@/domain/course";
import { pluralNoun, pluralize } from "@/domain/format";
import { holeList } from "../present";
import type { ScanReviewViewModel } from "../useScanReviewViewModel";

interface ScanReviewStepProps {
  review: ScanReviewViewModel;
  /** Scores typed in by hand: there is no photo, and nothing the scan was unsure of. */
  manual: boolean;
  /** The photo the card was read from. */
  photoUrl: string | null;
  onStartOver: () => void;
}

/**
 * Checking a card before it is saved: the scorecard to type over, with the scores the scan
 * wasn't sure of ringed, beside the photo it was read from, the course, the tee and the date.
 */
export function ScanReviewStep({ review, manual, photoUrl, onStartOver }: ScanReviewStepProps) {
  const { round, toCheck } = review;
  if (!round) return null;
  const showPhoto = !manual && !!photoUrl;

  return (
    <div data-slot="scan-review" className="flex flex-col gap-4">
      {review.error && (
        <Alert variant="destructive">
          <AlertDescription>{review.error}</AlertDescription>
        </Alert>
      )}

      {toCheck.length > 0 && (
        <Alert data-slot="scores-to-check">
          <CircleAlert className="text-destructive" />
          <AlertTitle>{pluralize(toCheck.length, "score")} to check</AlertTitle>
          <AlertDescription>
            The scan wasn't sure what it read on {holeList(toCheck)}, ringed below. Check{" "}
            {pluralNoun(toCheck.length, "it", "them")} against your card.
          </AlertDescription>
        </Alert>
      )}

      <div className={showPhoto ? "grid grid-cols-1 gap-4 lg:grid-cols-2" : "flex flex-col"}>
        {showPhoto && (
          <Card size="sm" className="lg:sticky lg:top-20 lg:self-start">
            <CardHeader>
              <CardTitle>Your card</CardTitle>
            </CardHeader>
            <CardContent>
              <img src={photoUrl} alt="The scorecard photo" className="max-h-96 w-full rounded-lg object-contain" />
            </CardContent>
          </Card>
        )}

        <Card size="sm">
          <CardContent className="flex flex-col gap-4">
            <RoundFigures round={round} />
            <CourseField review={review} />
            <TeeField review={review} />
            <Field>
              <FieldLabel htmlFor="review-date">Date played</FieldLabel>
              <Input
                id="review-date"
                type="date"
                value={review.date}
                max={review.today}
                onChange={(e) => review.setDate(e.target.value)}
              />
            </Field>
            <div className="flex gap-2">
              <Button size="lg" className="flex-1" disabled={review.saving} onClick={review.save}>
                {review.saving && <Loader2 data-icon="inline-start" className="animate-spin" />}
                Save Round
              </Button>
              <Button size="lg" variant="outline" onClick={onStartOver}>
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <RoundScorecard
        round={round}
        teeBox={review.teeBox || null}
        showTee
        toCheck={toCheck}
        edits={{
          onStrokesChange: review.setStrokes,
          onPuttsChange: review.setPutts,
          onGirChange: review.setGir,
        }}
      />
    </div>
  );
}

/** The round's score so far, against par, and net once the tee is rated and every hole is scored. */
function RoundFigures({ round }: { round: Pick<Round, "score" | "toPar" | "courseHandicap" | "netScore"> }) {
  const { score, toPar, courseHandicap, netScore } = round;
  return (
    <div className="grid grid-cols-3 gap-3 border-b border-border pb-4">
      <Stat>
        <StatLabel>Score</StatLabel>
        <StatValue>{score ?? "—"}</StatValue>
      </Stat>
      <Stat>
        <StatLabel>To par</StatLabel>
        <StatValue className={toParTextClass(toPar)}>{toParDisplay(toPar)}</StatValue>
      </Stat>
      <Stat>
        <StatLabel>{courseHandicap != null ? `Net · hcp ${formatCourseHandicap(courseHandicap)}` : "Net"}</StatLabel>
        <StatValue>{netScore ?? "—"}</StatValue>
      </Stat>
    </div>
  );
}

function CourseField({ review }: { review: ScanReviewViewModel }) {
  const { courseSearch } = review;
  return (
    <Field>
      <FieldLabel htmlFor="review-course">Course</FieldLabel>
      <CourseLinkSearch
        inputId="review-course"
        query={courseSearch.query}
        results={courseSearch.results}
        searching={courseSearch.searching}
        onQueryChange={courseSearch.setQuery}
        onSelectCourse={review.pickCourse}
        onClose={courseSearch.reset}
        autoFocus={false}
        reviewVariant
        onUseCustomName={review.nameCourse}
        linkedName={review.linkedName ? formatCourseName(review.linkedName) : undefined}
        customName={review.customName ? formatCourseName(review.customName) : undefined}
        onClear={review.changeCourse}
        clearLabel="Change course"
      />
      {review.nameToKeep && (
        <Button
          variant="linkMuted"
          size="xs"
          className="h-auto self-start p-0"
          onClick={() => review.nameCourse(review.nameToKeep!)}
        >
          Save as "{formatCourseName(review.nameToKeep)}" without linking →
        </Button>
      )}
    </Field>
  );
}

function TeeField({ review }: { review: ScanReviewViewModel }) {
  return (
    <Field>
      <FieldLabel htmlFor={review.tees.length > 0 ? undefined : "review-tee"}>Tee played</FieldLabel>
      {review.tees.length > 0 ? (
        <ToggleGroup
          size="sm"
          aria-label="Tee played"
          value={review.teeBox ? [review.teeBox] : []}
          onValueChange={(values) => review.setTeeBox(values[0] ?? "")}
        >
          {review.tees.map((color) => (
            <ToggleGroupItem key={color} value={color}>
              {color}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : (
        <Input
          id="review-tee"
          autoComplete="off"
          placeholder="e.g. White"
          value={review.teeBox}
          onChange={(e) => review.setTeeBox(e.target.value)}
        />
      )}
    </Field>
  );
}
