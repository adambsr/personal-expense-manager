import { ArrowLeft } from "lucide-react";
import { handleClientNavigation } from "@/lib/navigation";

export function DashboardReturnLink() {
  return (
    <a
      className="dashboard-return-link"
      href="/"
      onClick={(event) => handleClientNavigation(event, "/")}
    >
      <span className="dashboard-return-icon"><ArrowLeft size={15} aria-hidden="true" /></span>
      <span>Dashboard</span>
    </a>
  );
}
