import { notFound } from "next/navigation";
import AdminWorkspaceScreen from "@/modules/admin-workspace/AdminWorkspaceScreen";
export const dynamic = "force-dynamic";
export default function Page() {
  if (process.env.WORKSPACE_MODE !== "private") notFound();
  return <AdminWorkspaceScreen />;
}
