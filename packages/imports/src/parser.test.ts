import { describe, expect, it } from "vitest";

import { detectDelimiter, parseCsv } from "./parser";

describe("CSV ayrıştırma", () => {
  it("başlıkları ve satırları ayırır", () => {
    const sheet = parseCsv("code,name\n30.0001234,Reçine A\n");

    expect(sheet.headers).toEqual(["code", "name"]);
    expect(sheet.rows).toHaveLength(1);
    expect(sheet.rows[0]?.values.code).toBe("30.0001234");
    expect(sheet.rows[0]?.values.name).toBe("Reçine A");
  });

  it("baştaki sıfırları korur", () => {
    const sheet = parseCsv("code\n0030123\n");

    expect(sheet.rows[0]?.values.code).toBe("0030123");
  });

  it("tırnaklı alanlardaki ayraçları korur", () => {
    const sheet = parseCsv('code,name\nA-1,"Reçine, A tipi"\n');

    expect(sheet.rows[0]?.values.name).toBe("Reçine, A tipi");
  });

  it("kaçışlanmış tırnakları çözer", () => {
    const sheet = parseCsv('code,name\nA-1,"""Tırnaklı"""\n');

    expect(sheet.rows[0]?.values.name).toBe('"Tırnaklı"');
  });

  it("CRLF satır sonlarını destekler", () => {
    const sheet = parseCsv("code,name\r\nA-1,Reçine\r\n");

    expect(sheet.rows).toHaveLength(1);
    expect(sheet.rows[0]?.values.code).toBe("A-1");
  });

  it("BOM işaretini siler", () => {
    const sheet = parseCsv("﻿code,name\nA-1,Reçine\n");

    expect(sheet.headers[0]).toBe("code");
  });

  it("tamamen boş satırları atlar", () => {
    const sheet = parseCsv("code,name\nA-1,Reçine\n\n\nB-2,Cam\n");

    expect(sheet.rows).toHaveLength(2);
  });

  it("satır numarasını dosyadaki sırayla verir", () => {
    const sheet = parseCsv("code\nA-1\nB-2\n");

    expect(sheet.rows[0]?.rowNumber).toBe(2);
    expect(sheet.rows[1]?.rowNumber).toBe(3);
  });

  it("noktalı virgül ayracını algılar", () => {
    const sheet = parseCsv("code;name\nA-1;Reçine\n");

    expect(sheet.delimiter).toBe(";");
    expect(sheet.rows[0]?.values.name).toBe("Reçine");
  });

  it("sekme ayracını algılar", () => {
    const sheet = parseCsv("code\tname\nA-1\tReçine\n");

    expect(sheet.delimiter).toBe("\t");
    expect(sheet.rows[0]?.values.name).toBe("Reçine");
  });

  it("tırnaklı alan içindeki ayracı ayraç sayımına katmaz", () => {
    expect(detectDelimiter('a;"b;c";d')).toBe(";");
  });

  it("boş içerikte başlık döndürmez", () => {
    const sheet = parseCsv("");

    expect(sheet.headers).toEqual([]);
    expect(sheet.rows).toEqual([]);
  });
});
