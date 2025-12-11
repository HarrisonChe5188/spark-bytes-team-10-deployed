import { POST } from "@/app/api/posts/route";
import { createClient } from "@/lib/supabase/server";

jest.mock("@/lib/supabase/server");

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe("POST /api/posts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user1" } },
          error: null,
        }),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: "post1" } }),
        order: jest.fn().mockReturnThis(),
      })),
      storage: {
        from: jest.fn(() => ({
          upload: jest.fn().mockResolvedValue({ error: null }),
          remove: jest.fn().mockResolvedValue({ error: null }),
        })),
      },
    } as any);
  });

  const getMockFormData = () => ({
    get: jest.fn((key: string) => {
      const data: Record<string, any> = {
        title: "Test Post",
        location: "NYC",
        description: "Test Description",
        quantity: "5",
        start_time: "2025-12-08T12:00:00Z",
        end_time: "2025-12-08T14:00:00Z",
        image: null,
      };
      return data[key];
    }),
  });

  it("returns 400 if required fields are missing", async () => {
    const mockFormData = {
      get: jest.fn(() => null),
    };

    const mockRequest = {
      formData: jest.fn().mockResolvedValue(mockFormData),
    } as any;

    const res = await POST(mockRequest);
    const json = res.body || res;
    expect(json).toHaveProperty("error", "Missing required fields");
  });

  it("creates a post successfully", async () => {
    const mockFormData = getMockFormData();
    const mockRequest = {
      formData: jest.fn().mockResolvedValue(mockFormData),
    } as any;

    const res = await POST(mockRequest);
    const json = res.body || res;
    expect(json).toHaveProperty("success", true);
    expect(mockCreateClient).toHaveBeenCalled();
  });
});
