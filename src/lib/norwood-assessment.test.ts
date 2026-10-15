import { describe, expect, test } from "bun:test";
import { hasAllNorwoodViews, parseNorwoodResult, photoQuality } from "./norwood-assessment";

const valid = { norwood: 4, confidence: "high", reason: "Front and crown areas are separated by a visible bridge.", photo_problems: [] };
describe("Norwood result contract", () => {
  test("accepts complete JSON and forces low confidence for photo problems", () => {
    expect(parseNorwoodResult(JSON.stringify(valid)).norwood).toBe(4);
    expect(parseNorwoodResult(JSON.stringify({ ...valid, photo_problems: ["crown too dark"] })).confidence).toBe("low");
  });
  test("rejects out of range, fractional, coerced, missing, non-JSON and extra-key results", () => {
    for (const n of [0, 8, 3.5, "4", null]) expect(() => parseNorwoodResult(JSON.stringify({ ...valid, norwood: n }))).toThrow();
    for (const raw of ["```json\n" + JSON.stringify(valid) + "\n```", "{}", JSON.stringify({ ...valid, confidence: "certain" }), JSON.stringify({ ...valid, diagnosis: "x" }), JSON.stringify({ ...valid, reason: "" })]) expect(() => parseNorwoodResult(raw)).toThrow();
  });
  test("requires the five different expected angles", () => {
    expect(hasAllNorwoodViews(["front","top","crown","left","right"])).toBe(true);
    expect(hasAllNorwoodViews(["front","top","crown","left","left"])).toBe(false);
    expect(hasAllNorwoodViews(["front","top","left","right"])).toBe(false);
  });
});
describe("technical photo quality checks", () => {
  function pixels(value: (x: number, y: number) => number) {
    const data = new Uint8ClampedArray(128 * 128 * 4);
    for (let y=0;y<128;y++) for (let x=0;x<128;x++) { const i=(y*128+x)*4; data[i]=data[i+1]=data[i+2]=value(x,y); data[i+3]=255; }
    return data;
  }
  test("asks for a retake on dark and flat/defocused images", () => {
    expect(photoQuality(pixels(() => 5),128,128)).toContain("dark");
    expect(photoQuality(pixels(() => 170),128,128)).toContain("blurry");
    expect(photoQuality(pixels((x,y) => 90 + x*.2 + y*.3),128,128)).toContain("blurry");
  });
  test("allows clearly textured, lit images without claiming medical quality", () => {
    expect(photoQuality(pixels((x,y) => (x+y)%4===0 ? 130 : 80),128,128)).toBeNull();
  });
  test("rejects undersized input", () => expect(photoQuality(new Uint8ClampedArray(40),10,1)).toContain("small"));
});
