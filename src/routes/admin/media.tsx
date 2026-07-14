import { createFileRoute } from "@tanstack/react-router";
import { MediaGrid } from "@/components/admin/media-picker";

export const Route = createFileRoute("/admin/media")({ component: MediaGrid });
