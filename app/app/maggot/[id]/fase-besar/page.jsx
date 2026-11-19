import { Suspense } from "react";
import { FaseBesarScreen } from "../../../../../src/app-web/screens/Maggot";

export const metadata = { title: "Catat fase besar" };

export default function Page() {
  return <Suspense fallback={null}><FaseBesarScreen /></Suspense>;
}
