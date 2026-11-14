import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/brand";

interface AuthLinkProps {
  to: string;
  state?: unknown;
  children: ReactNode;
}

export function AuthLink({ to, state, children }: AuthLinkProps) {
  return (
    <Button
      variant="link"
      size="inline"
      className="font-semibold"
      nativeButton={false}
      render={<Link to={to} state={state} />}
    >
      {children}
    </Button>
  );
}
