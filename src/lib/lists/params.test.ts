import { describe, expect, it } from "vitest";
import {
  escapeLike,
  listHref,
  MAX_COUNT,
  PAGE_SIZE,
  parseBrewsParams,
  parseCoffeeParams,
  parseCuppingParams,
  parseSessionParams,
  toQuery,
} from "@/lib/lists/params";

describe("parseBrewsParams", () => {
  it("defaults to newest/all/page-size", () => {
    expect(parseBrewsParams({})).toEqual({ q: "", sort: "newest", session: "all", coffee: "", fav: "all", count: PAGE_SIZE });
  });
  it("keeps valid values and trims the query", () => {
    const coffee = "123e4567-e89b-12d3-a456-426614174000";
    expect(parseBrewsParams({ q: "  Origami ", sort: "oldest", session: "none", coffee, fav: "only", count: "40" })).toEqual({
      q: "Origami", sort: "oldest", session: "none", coffee, fav: "only", count: 40,
    });
  });
  it("accepts the top-rated sort", () => {
    expect(parseBrewsParams({ sort: "top" }).sort).toBe("top");
    expect(listHref("/brews", { sort: "top", count: 20 })).toBe("/brews?sort=top");
  });
  it("parses secondary filter flags", () => {
    const p = parseBrewsParams({ tasted: "1", untasted: "1", "has-score": "1", "no-score": "1" });
    expect(p.tasted).toBe("1");
    expect(p.untasted).toBe("1");
    expect(p.hasScore).toBe("1");
    expect(p.noScore).toBe("1");
    expect(parseBrewsParams({ tasted: "yes", "has-score": "0" }).tasted).toBeUndefined();
    expect(parseBrewsParams({ "has-score": "0" }).hasScore).toBeUndefined();
  });
  it("degrades garbage to defaults instead of erroring queries", () => {
    expect(parseBrewsParams({ sort: "top", session: "'; DROP", coffee: "abc", fav: "many", count: "zzz" })).toEqual({
      q: "", sort: "top", session: "all", coffee: "", fav: "all", count: PAGE_SIZE,
    });
  });
  it("clamps count to 1..MAX_COUNT", () => {
    expect(parseBrewsParams({ count: "0" }).count).toBe(1);
    expect(parseBrewsParams({ count: "9999" }).count).toBe(MAX_COUNT);
  });
  it("bounds query length", () => {
    expect(parseBrewsParams({ q: "x".repeat(500) }).q).toHaveLength(120);
  });
});

describe("other lists", () => {
  it("parses coffee/session/cupping params with the same discipline", () => {
    expect(parseCoffeeParams({ sort: "name" })).toMatchObject({ sort: "name" });
    expect(parseCoffeeParams({ sort: "bogus" })).toMatchObject({ sort: "recent" });
    expect(parseSessionParams({ has: "empty" })).toMatchObject({ has: "empty" });
    expect(parseSessionParams({ has: "bogus" })).toMatchObject({ has: "all" });
    expect(parseCuppingParams({ sort: "oldest", count: "60" })).toMatchObject({ sort: "oldest", count: 60 });
  });
  it("parses coffee status filter with fallback to available", () => {
    expect(parseCoffeeParams({})).toMatchObject({ status: "available" });
    expect(parseCoffeeParams({ status: "depleted" })).toMatchObject({ status: "depleted" });
    expect(parseCoffeeParams({ status: "bogus" })).toMatchObject({ status: "available" });
  });
});

describe("escapeLike", () => {
  it("neutralizes wildcards and the escape char", () => {
    expect(escapeLike("100%_\\")).toBe("100\\%\\_\\\\");
    expect(escapeLike("plain")).toBe("plain");
  });
});

describe("toQuery/listHref", () => {
  it("omits defaults for short URLs", () => {
    expect(toQuery({ q: "", sort: "newest", session: "all", coffee: "", count: 20 })).toBe("");
    expect(toQuery({ q: "", sort: "recent", status: "available", count: 20 })).toBe("");
    expect(listHref("/brews", { q: "tabi", sort: "oldest", session: "none", count: 40 })).toBe(
      "/brews?q=tabi&sort=oldest&session=none&count=40",
    );
    expect(listHref("/coffees", { q: "gesha", sort: "name", status: "depleted", count: 40 })).toBe(
      "/coffees?q=gesha&sort=name&status=depleted&count=40",
    );
  });
  it("resets count on search/filter/sort changes", () => {
    expect(toQuery({ q: "x", count: 60 }, true)).toBe("?q=x");
  });
  it("keeps a grown page and secondary filters when expanding", () => {
    expect(listHref("/brews", { q: "x", tasted: "1", "has-score": "1", count: 40 })).toBe(
      "/brews?q=x&tasted=1&has-score=1&count=40",
    );
    expect(toQuery({ tasted: "", "has-score": "", count: 20 })).toBe("");
  });
});
