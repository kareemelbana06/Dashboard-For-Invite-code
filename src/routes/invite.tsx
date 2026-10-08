import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/invite")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
