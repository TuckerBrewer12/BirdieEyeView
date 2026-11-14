import { RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button, Card, CardContent, EmptyNote, PageTitle, RoundScorecard } from "@/brand";
import { tokens } from "@/brand/theme";
import type { TryItYourselfViewModel } from "../useTryItYourselfViewModel";

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
            <Button variant="onPrimary" size="sm" onClick={viewModel.reset}>
              <RotateCcw data-icon="inline-start" />
              Scan another
            </Button>
          }
        />
      )}

      {!viewModel.hasScores && (
        <EmptyNote className="py-6">No scores found. Try a clearer photo.</EmptyNote>
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
