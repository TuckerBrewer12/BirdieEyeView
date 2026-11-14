import { ArrowRight, Loader2 } from "lucide-react";
import {
  ActionBar,
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  CourseLinkSearch,
  Field,
  FieldLabel,
  Input,
  PageTitle,
  RoundScorecard,
} from "@/brand";
import { formatCourseName } from "@/domain/course";
import { pluralize } from "@/domain/format";
import { ringedBelow } from "../present";
import { TeeField } from "./TeeField";
import type { ScanReviewViewModel } from "../useScanReviewViewModel";

interface ScanReviewStepProps {
  review: ScanReviewViewModel;
  /** "Check your card", or "Enter your scores" by hand. */
  title: string;
  /** Scores typed in by hand: there is no photo, and nothing the scan was unsure of. */
  manual: boolean;
  /** The photo the card was read from. */
  photoUrl: string | null;
  onStartOver: () => void;
}

/**
 * Checking a card before it is saved: the photo it was read from beside the course, the tee and
 * the date, then the scorecard to type over, with the scores the scan wasn't sure of ringed.
 * Save and Start over sit by the title, or pinned above the tab bar on a phone.
 */
export function ScanReviewStep({ review, title, manual, photoUrl, onStartOver }: ScanReviewStepProps) {
  const { round, toCheck } = review;
  if (!round) return null;
  const showPhoto = !manual && !!photoUrl;

  return (
    <div data-slot="scan-review" className="flex flex-col gap-4 md:gap-5">
      <div className="flex items-center justify-between gap-4">
        <PageTitle>{title}</PageTitle>
        <ActionBar>
          <Button variant="outline" onClick={onStartOver}>
            Start over
          </Button>
          <Button className="flex-1 md:flex-none" disabled={review.saving} onClick={review.save}>
            {review.saving && <Loader2 data-icon="inline-start" className="animate-spin" />}
            Save round
          </Button>
        </ActionBar>
      </div>

      {review.error && (
        <Alert tone="danger">
          <AlertDescription>{review.error}</AlertDescription>
        </Alert>
      )}

      {toCheck.length > 0 && (
        <Alert tone="warning" variant="outline" data-slot="scores-to-check">
          <AlertTitle>{pluralize(toCheck.length, "score")} to check</AlertTitle>
          <AlertDescription>{ringedBelow(toCheck)}</AlertDescription>
        </Alert>
      )}

      <div className={showPhoto ? "grid grid-cols-1 gap-4 md:grid-cols-scan-review" : "flex flex-col"}>
        {showPhoto && (
          <Card className="hidden md:flex">
            <CardContent>
              <img
                src={photoUrl}
                alt="Your scorecard"
                className="h-card-photo w-full rounded-photo bg-muted object-cover"
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="flex flex-col gap-4">
            {showPhoto && <PhotoRow photoUrl={photoUrl} />}
            <CourseField review={review} />
            <div className="grid grid-cols-2 items-start gap-3">
              <TeeField id="review-tee" tees={review.tees} teeBox={review.teeBox} setTeeBox={review.setTeeBox} />
              <Field>
                <FieldLabel htmlFor="review-date">Date</FieldLabel>
                <Input
                  id="review-date"
                  type="date"
                  value={review.date}
                  max={review.today}
                  onChange={(e) => review.setDate(e.target.value)}
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      </div>

      <RoundScorecard
        round={round}
        teeBox={review.teeBox || null}
        toCheck={toCheck}
        action={<span className="text-body-sm">Tap any score to edit</span>}
        edits={{
          onStrokesChange: review.setStrokes,
          onPuttsChange: review.setPutts,
          onGirChange: review.setGir,
        }}
      />
    </div>
  );
}

/** A phone's photo: a thumbnail in the card's first row, opened full width under it. */
function PhotoRow({ photoUrl }: { photoUrl: string }) {
  return (
    <Collapsible className="flex flex-col gap-3 border-b border-border pb-4 md:hidden">
      <div className="flex items-center gap-3">
        <img
          src={photoUrl}
          alt=""
          className="aspect-4/3 w-photo-thumb shrink-0 rounded-lg bg-muted object-cover"
        />
        <span className="flex-1 text-body font-semibold text-foreground">Your card</span>
        <CollapsibleTrigger render={<Button variant="ghost" />}>View</CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <img src={photoUrl} alt="Your scorecard" className="w-full rounded-photo object-contain" />
      </CollapsibleContent>
    </Collapsible>
  );
}

function CourseField({ review }: { review: ScanReviewViewModel }) {
  const { courseSearch, nameToKeep } = review;
  return (
    <Field>
      <FieldLabel htmlFor="review-course">Course</FieldLabel>
      <CourseLinkSearch
        inputId="review-course"
        surface="plain"
        query={courseSearch.query}
        results={courseSearch.results}
        searching={courseSearch.searching}
        onQueryChange={courseSearch.setQuery}
        onSelectCourse={review.pickCourse}
        onClose={courseSearch.reset}
        reviewVariant
        onUseCustomName={review.nameCourse}
        linkedName={review.linkedName ? formatCourseName(review.linkedName) : undefined}
        customName={review.customName ? formatCourseName(review.customName) : undefined}
        onClear={review.changeCourse}
        clearLabel="Change course"
      />
      {nameToKeep && (
        <Button
          variant="linkMuted"
          size="inline"
          className="self-start"
          onClick={() => review.nameCourse(nameToKeep)}
        >
          Save as "{formatCourseName(nameToKeep)}" without linking
          <ArrowRight aria-hidden />
        </Button>
      )}
    </Field>
  );
}
