import { POST } from "@/app/api/reservations/route";
import { createClient } from "@/lib/supabase/server";

jest.mock("@/lib/supabase/server");

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe("POST /api/reservations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user1" } },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === "reservations") {
          return {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }), // No existing reservation
            order: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
          };
        }
        // For posts table
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: "post1", quantity_left: 5 }, error: null }),
          order: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
        };
      }),
    } as any);
  });

  it("returns 400 if no post_id is provided", async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({}),
    } as any;

    const res = await POST(mockRequest);
    const json = res.body || res;
    expect(json).toHaveProperty("error", "post_id is required");
  });

  it("successfully creates a reservation", async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({ post_id: "post1" }),
    } as any;

    const res = await POST(mockRequest);
    const json = res.body || res;
    expect(json).toHaveProperty("success", true);
    expect(mockCreateClient).toHaveBeenCalled();
  });
});
