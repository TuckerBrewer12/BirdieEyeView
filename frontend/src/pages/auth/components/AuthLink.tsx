import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/brand";

interface AuthLinkProps {
  to: string;
  /** Router state for the next screen, such as the email to fill in. */
  state?: unknown;
  children: ReactNode;
}

/** A link to a neighbouring auth screen, sized to sit inside a line of footer text. */
export function AuthLink({ to, state, children }: AuthLinkProps) {
  return (
    <Button
      variant="link"
      size="sm"
      className="h-auto px-0 font-semibold"
      nativeButton={false}
      render={<Link to={to} state={state} />}
    >
      {children}
    </Button>
  );
}
