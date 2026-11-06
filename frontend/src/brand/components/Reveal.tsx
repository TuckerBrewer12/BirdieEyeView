import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/brand/cn";
import { tokens } from "@/brand/theme";

interface RevealProps extends React.ComponentProps<"div"> {
  delay?: number;
  amount?: number;
}

function Reveal({ className, children, delay = 0, amount = 0.2, ...props }: RevealProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <div data-slot="reveal" className={className} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      data-slot="reveal"
      className={cn(className)}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ ...tokens.motion.reveal, delay }}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}

export { Reveal };
