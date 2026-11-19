import { Suspense } from "react";
import { MasukScreen } from "../../../src/app-web/screens/Auth";

export const metadata = { title: "Masuk" };

export default function Page() {
  return <Suspense fallback={null}><MasukScreen /></Suspense>;
}
