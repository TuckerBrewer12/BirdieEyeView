import { RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button, Card, CardContent, PageTitle, RoundScorecard } from "@/brand";
import { tokens } from "@/brand/theme";
import type { TryItYourselfViewModel } from "../useTryItYourselfViewModel";

/** The visitor's own card read back: "Here's your round.", the scorecard, and a way to keep it. */
export function ScannedSection({ viewModel }: { viewModel: TryItYourselfViewModel }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: tokens.motion.scanStep.review }}
      className="mx-auto flex max-w-276 flex-col gap-5 px-5 pt-6 pb-16 md:px-6 md:pt-10"
    >
      <PageTitle>Here’s your round.</PageTitle>

      {viewModel.round && (
        <RoundScorecard
          round={viewModel.round}
          teeBox={viewModel.round.teeBox}
          action={
            <Button variant="outline" size="sm" className="border-primary-foreground/half bg-transparent text-primary-foreground hover:bg-primary-foreground/tint" onClick={viewModel.reset}>
              <RotateCcw data-icon="inline-start" />
              Scan another
            </Button>
          }
        />
      )}

      {!viewModel.hasScores && (
        <p className="py-6 text-center text-sm text-muted-foreground">No scores found. Try a clearer photo.</p>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-body-lg font-semibold text-foreground">Save it and track every round.</p>
          <Button render={<Link to="/register" />}>Sign up free</Button>
        </CardContent>
      </Card>
    </motion.section>
  );
}
