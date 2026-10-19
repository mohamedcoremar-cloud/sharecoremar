import { backofficeHead } from "@/lib/backoffice-head";
import { createFileRoute } from "@tanstack/react-router";
import { MediaGrid } from "@/components/admin/media-picker";

export const Route = createFileRoute("/admin/media")({ head: () => backofficeHead("Media Library"), component: MediaGrid });
