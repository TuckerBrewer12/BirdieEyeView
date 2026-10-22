import kitNumbers from "./kit-numbers.js";
import { tester } from "./tester.js";

tester.run("kit/no-raw-motion", kitNumbers.rules["no-raw-motion"], {
  valid: [
    "const el = <motion.div whileHover={{ scale: motion.hoverScale }} transition={motion.spring} />;",
    "const el = <motion.div transition={{ ...motion.entrance, delay: 0.1 }} />;",
    // 0 and 1 are where an element rests: no size change, no time taken.
    "const el = <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1 }} exit={{ duration: 0 }} />;",
    // A computed value is a choice made from something else, not a raw number.
    "const el = <motion.div transition={{ duration: i * 0.04, delay: motion.pop.delay }} />;",
    "const el = <motion.div transition={{ duration: motion.duration.collapse }} />;",
    // Outside a motion prop a `scale` is just data, and a file that does not animate has no timings.
    "const el = <Axis scale={{ duration: 3 }} />;",
    "const plan = { duration: 18, scale: 2 };",
    // A timing table in a file that animates is fine once it reads the tokens.
    'import { motion as m } from "framer-motion";\nconst DEMO = { crossfade: motion.layout.duration };',
  ],
  invalid: [
    { code: "const el = <motion.div transition={{ duration: 0.3 }} />;", errors: [{ messageId: "motion" }] },
    { code: "const el = <motion.div whileHover={{ scale: 1.05 }} />;", errors: [{ messageId: "motion" }] },
    { code: "const el = <motion.button whileTap={{ scale: 0.95 }} />;", errors: [{ messageId: "motion" }] },
    {
      code: 'const el = <motion.div transition={{ type: "spring", damping: 15 }} />;',
      errors: [{ messageId: "motion" }],
    },
    {
      // A keyframe array and a transition nested in the target.
      code: "const el = <motion.div animate={{ scale: [1, 1.2, 1], transition: { duration: 0.5 } }} />;",
      errors: 2,
    },
    {
      // Variants hide their transitions a level or two down.
      code: "const el = <motion.ul variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.2 } } }} />;",
      errors: 2,
    },
    {
      // Both sides of a conditional target are targets.
      code: "const el = <motion.div animate={open ? { scaleY: 1.1 } : { scaleY: 1 }} />;",
      errors: [{ messageId: "motion" }],
    },
    {
      // animate() takes its target and transition as arguments.
      code: "animate(el, { scale: 1.1 }, { duration: 0.3 });",
      errors: 2,
    },
    {
      // A spring is motion wherever it is written down.
      code: 'const DEMO = { rowSpring: { type: "spring" as const, damping: 15, stiffness: -200 } };',
      errors: 2,
    },
    {
      // A view model's timing table in a file that animates (PRs #267–#272).
      code: 'import { useReducedMotion } from "framer-motion";\nconst DEMO = { crossfade: 0.8, sweep: 1.5, caretBlink: 0.8, fadeDuration: 0.4 };',
      errors: 4,
    },
    {
      // Reported once, though the prop and the file both see it.
      code: 'import { motion } from "motion/react";\nconst el = <motion.div transition={{ duration: 0.3 }} />;',
      errors: 1,
    },
  ],
});

tester.run("kit/no-style-measure", kitNumbers.rules["no-style-measure"], {
  valid: [
    "const el = <div style={{ fontSize: typography.meta, borderRadius: radius.card }} />;",
    "const el = <div style={{ width: `${pct}%`, height: size.chart, top: 0 }} />;",
    // A custom property hands a value to a class.
    'const el = <div style={{ "--w": 3, "--bar": "12px" }} />;',
    "const el = <div style={{ color: colors.score.birdie.base, background: toParFill(toPar) }} />;",
    'const el = <div style={{ color: "var(--muted-foreground)", fill: "currentColor", stroke: "none" }} />;',
    "const el = <div style={{ backgroundColor: `${tone}` + suffix, borderColor: tee.color }} />;",
    // Layout values with no unit are not measures.
    'const el = <div style={{ width: "100%", opacity: 0.5, flex: 1 }} />;',
    // Outside `style` a fontSize is someone else's prop.
    "const t = { fontSize: 10 };",
  ],
  invalid: [
    { code: "const el = <span style={{ fontSize: 10 }} />;", errors: [{ messageId: "measure" }] },
    { code: "const el = <span style={{ borderRadius: 99 }} />;", errors: [{ messageId: "measure" }] },
    { code: "const el = <span style={{ top: -3 }} />;", errors: [{ messageId: "measure" }] },
    {
      code: 'const el = <span style={{ padding: "0 4px", marginTop: "1.5rem", lineHeight: 1.1 }} />;',
      errors: 3,
    },
    { code: 'const el = <span style={{ color: "#2d7a3a" }} />;', errors: [{ messageId: "color" }] },
    { code: 'const el = <span style={{ backgroundColor: "white" }} />;', errors: [{ messageId: "color" }] },
    {
      code: "const el = <span style={on ? { width: 12 } : { width: 0 }} />;",
      errors: [{ messageId: "measure" }],
    },
  ],
});

tester.run("kit/no-measure-prop", kitNumbers.rules["no-measure-prop"], {
  valid: [
    "const el = <Pie innerRadius={chartLayout.ring.inner} outerRadius={chartLayout.ring.outer} />;",
    "const el = <circle r={dotR} strokeWidth={0} />;",
    "const el = <rect rx={chartLayout.barRadius[0]} fillOpacity={1} />;",
    'const el = <path strokeDasharray={dash} stroke="var(--chart-axis)" />;',
    // `size` is only an icon's measure on an icon.
    'const el = <Card size="sm" />;',
    'import { Link2 } from "lucide-react";\nconst el = <Link2 className="size-icon-xs" />;',
  ],
  invalid: [
    { code: "const el = <Pie innerRadius={50} />;", errors: [{ messageId: "measure" }] },
    { code: "const el = <rect rx={2} />;", errors: [{ messageId: "measure" }] },
    { code: 'const el = <CartesianGrid strokeDasharray="3 3" />;', errors: [{ messageId: "measure" }] },
    { code: "const el = <stop stopOpacity={0.22} />;", errors: [{ messageId: "measure" }] },
    { code: "const el = <line strokeWidth={4} />;", errors: [{ messageId: "measure" }] },
    {
      code: 'import { ChevronRight as Chevron } from "lucide-react";\nconst el = <Chevron size={14} />;',
      errors: [{ messageId: "icon" }],
    },
  ],
});
