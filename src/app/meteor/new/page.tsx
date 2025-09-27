import { redirect } from "next/navigation";

export default function Page() {
  // Redirect to main page since everything is now single-page
  redirect("/");
}