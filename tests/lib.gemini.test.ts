
import { generateQuiz } from '@/lib/gemini';

// Mock the global fetch to prevent real API calls
global.fetch = jest.fn();

describe('Gemini AI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'mock_key';
  });

  it('should generate a quiz structure from text input', async () => {
    // Mock successful AI response
    const mockResponse = {
      candidates: [{
        content: {
          parts: [{
            text: ```json
            {
              "title": "Mock Quiz",
              "questions": [
                { "id": "1", "type": "MC", "question": "Test?", "options": ["A","B"] }
              ]
            }
            ```
          }]
        }
      }]
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const materials = [{ type: 'text', content: 'Some study notes' }];
    const counts = { mc: 1, short: 0, long: 0 };

    const result = await generateQuiz(materials, counts);

    expect(result.title).toBe("Mock Quiz");
    expect(result.questions).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      text: async () => "Quota Exceeded",
      status: 429
    });

    const materials = [{ type: 'text', content: 'Notes' }];
    await expect(generateQuiz(materials, { mc: 1, short: 0, long: 0 }))
      .rejects
      .toThrow("Gemini Error: 429");
  });
});
