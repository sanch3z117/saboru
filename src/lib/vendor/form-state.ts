export type VendorFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialVendorState: VendorFormState = {
  status: "idle",
  message: "",
};
