import AdminWorkspaceScreen from "@/modules/admin-workspace/AdminWorkspaceScreen";
import GuestMenuEntry from "@/modules/customer-menu/GuestMenuEntry";
export const dynamic = "force-dynamic";
export default function Page() {
  return process.env.WORKSPACE_MODE === "private" ? (
    <AdminWorkspaceScreen />
  ) : (
    <GuestMenuEntry />
  );
}
