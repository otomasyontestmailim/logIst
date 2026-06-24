import { describe, it, expect } from "vitest";
import { toCsv, csvResponse, type CsvColumn } from "@/lib/export/csv";

type Row = { name: string; qty: number | null };
const cols: CsvColumn<Row>[] = [
  { header: "Ad", value: (r) => r.name },
  { header: "Adet", value: (r) => r.qty },
];
// BOM'u atıp satırlara böl.
const lines = (csv: string) => csv.slice(1).split("\r\n");

describe("toCsv", () => {
  it("UTF-8 BOM ile başlar (Excel uyumu)", () => {
    expect(toCsv([], cols).charCodeAt(0)).toBe(0xfeff);
  });

  it("başlık ';' ile, satırlar '\\r\\n' ile ayrılır", () => {
    const l = lines(toCsv([{ name: "A", qty: 2 }], cols));
    expect(l[0]).toBe("Ad;Adet");
    expect(l[1]).toBe("A;2");
  });

  it("null/undefined → boş hücre", () => {
    expect(lines(toCsv([{ name: "A", qty: null }], cols))[1]).toBe("A;");
  });

  it("';' içeren değer tırnaklanır", () => {
    expect(lines(toCsv([{ name: "a;b", qty: 1 }], cols))[1]).toBe('"a;b";1');
  });

  it("'\"' içeren değer ikiye katlanıp sarılır", () => {
    expect(lines(toCsv([{ name: 'a"b', qty: 1 }], cols))[1]).toBe('"a""b";1');
  });

  it("yeni satır içeren değer tırnaklanır", () => {
    expect(lines(toCsv([{ name: "a\nb", qty: 1 }], cols))[1]).toBe('"a\nb";1');
  });
});

describe("csvResponse", () => {
  it("doğru başlıklarla indirilebilir Response döner", async () => {
    const res = csvResponse("x", "rapor.csv");
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="rapor.csv"',
    );
    expect(await res.text()).toBe("x");
  });
});
