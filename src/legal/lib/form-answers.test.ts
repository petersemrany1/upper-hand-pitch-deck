import { expect, it } from "vitest";
import { formAnswers } from "./form-answers";
it("humanises option slugs", () => {
  const a = formAnswers({ asset_band: "if_me_and_my_ex_sold_everything_we_own_(house,_super,_savings,_cars)_and_paid_off_all_our_loans,_there’d_be_over_$750k_left", relationship_stage: "Ready to start the legal process", email_addr: "a_b@x.com" });
  expect(a[0].answer).toBe("If me and my ex sold everything we own (house, super, savings, cars) and paid off all our loans, there’d be over $750k left");
  expect(a[1].answer).toBe("Ready to start the legal process");
  expect(formAnswers({ page: "https://legal-group.com.au/a_b" })[0].answer).toBe("https://legal-group.com.au/a_b");
  expect(formAnswers({ contact: "jo_smith@x.com" })[0].answer).toBe("jo_smith@x.com");
});
