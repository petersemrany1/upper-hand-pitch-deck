import { createContext, useContext } from "react";
import type { DemoClinicStore } from "@/lib/demo-clinic";
export const DemoClinicContext = createContext<DemoClinicStore | null>(null);
export const useDemoClinic = () => useContext(DemoClinicContext);
