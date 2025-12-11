import "whatwg-fetch"; // polyfill Request, Response, fetch

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body) => ({ body })),
  },
}));
