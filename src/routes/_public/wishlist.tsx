import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/wishlist")({
  beforeLoad: () => {
    throw redirect({ to: "/account/wishlist" });
  },
});
