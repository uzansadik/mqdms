import { describe, expect, it } from "vitest";

import {
  computeFlowBounds,
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_WIDTH,
  nodeColors,
  wrapText,
} from "./export-image";

describe("computeFlowBounds", () => {
  it("node'ların en küçük ve en büyük sınırlarını hesaplar", () => {
    const bounds = computeFlowBounds([
      {
        id: "n1",
        title: "A",
        nodeType: "START",
        positionX: 100,
        positionY: 50,
        width: 200,
        height: 60,
      },
      {
        id: "n2",
        title: "B",
        nodeType: "END",
        positionX: 400,
        positionY: 10,
        width: 200,
        height: 60,
      },
    ]);

    expect(bounds.minX).toBe(100);
    expect(bounds.minY).toBe(10);
    expect(bounds.maxX).toBe(600);
    expect(bounds.maxY).toBe(110);
    expect(bounds.width).toBe(500);
    expect(bounds.height).toBe(100);
  });

  it("ölçüsü olmayan node'lar için varsayılan ölçüyü kullanır", () => {
    const bounds = computeFlowBounds([
      {
        id: "n1",
        title: "A",
        nodeType: "ACTIVITY",
        positionX: 0,
        positionY: 0,
        width: 0,
        height: 0,
      },
    ]);

    expect(bounds.width).toBe(DEFAULT_NODE_WIDTH);
    expect(bounds.height).toBe(DEFAULT_NODE_HEIGHT);
  });

  it("boş akışta sıfır sınır döner", () => {
    const bounds = computeFlowBounds([]);

    expect(bounds.width).toBe(0);
    expect(bounds.height).toBe(0);
  });
});

describe("wrapText", () => {
  it("metni genişliğe göre satırlara böler", () => {
    const lines = wrapText((text) => text.length * 10, "malzeme teslim al", 100, 2);

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toContain("malzeme");
  });

  it("sığan metni tek satırda bırakır", () => {
    const lines = wrapText(() => 50, "Kontrol yap", 100, 2);

    expect(lines).toEqual(["Kontrol yap"]);
  });

  it("boş metin için satır döndürmez", () => {
    expect(wrapText(() => 100, "   ", 100, 2)).toEqual([]);
  });

  it("satır sınırını aşmaz", () => {
    const lines = wrapText((text) => text.length * 10, "bir iki üç dört beş altı yedi", 50, 2);

    expect(lines.length).toBeLessThanOrEqual(2);
  });
});

describe("nodeColors", () => {
  it("başlangıç ve bitiş node'larını farklılaştırır", () => {
    expect(nodeColors("START").stroke).not.toBe(nodeColors("END").stroke);
  });

  it("bilinmeyen tür için varsayılan rengi döner", () => {
    expect(nodeColors("BILINMEYEN")).toEqual(nodeColors("ACTIVITY"));
  });
});
