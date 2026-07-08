import { redirect } from "next/navigation";

// /admin presmeruje rovno na správu služieb.
export default function AdminIndexPage() {
  redirect("/admin/sluzby");
}
