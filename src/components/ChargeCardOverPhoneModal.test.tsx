import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("@/components/SquareCardForm", () => ({
  SquareCardForm: ({ reference, clinicId }: { reference: string; clinicId?: string }) =>
    <div data-payment-reference={reference} data-payment-clinic={clinicId} />,
}));
const { ChargeCardOverPhoneModal } = await import("./ChargeCardOverPhoneModal");
const props = { open: true, onClose: () => {}, defaultAmount: 75, patientName: "Example patient", leadId: "unbooked-lead" };

describe("staff phone payment", () => {
  test("passes the selected clinic to checkout before the lead has a saved booking", () => {
    const html = renderToStaticMarkup(<ChargeCardOverPhoneModal {...props} clinicId="selected-clinic" clinicAddress="1 Example Street" />);
    expect(html).toContain('data-payment-reference="unbooked-lead"');
    expect(html).toContain('data-payment-clinic="selected-clinic"');
  });
  test("gives staff a selection instruction when no clinic is selected", () => {
    const html = renderToStaticMarkup(<ChargeCardOverPhoneModal {...props} />);
    expect(html).toContain("select a clinic before taking payment");
    expect(html).not.toContain("data-payment-reference");
  });
  test("explains that Admin must supply a missing clinic address", () => {
    const html = renderToStaticMarkup(<ChargeCardOverPhoneModal {...props} clinicId="selected-clinic" clinicAddress="  " />);
    expect(html).toContain("Ask Admin to update the clinic details");
    expect(html).not.toContain("data-payment-reference");
  });
});
