
// Ensure env var exists for the logic test
process.env.GEMINI_API_KEY = "mock_key";

/**
 * @file unit.logic.test.ts
 * @description Testing the parser logic for AI scores.
 */

// We need to import the function. 
// Note: In a real repo, we might extract the parser to a pure util function 
// to make it easier to test without mocking the whole Gemini lib.
// For now, we will test the logic by mocking the AI response string.

import { gradeSubmission } from '@/lib/gemini';

// Override fetch globally for this suite
global.fetch = jest.fn();

describe('AI Grading Logic Parser', () => {
  
  const mockAIResponse = (text: string) => {
    (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
            candidates: [{ content: { parts: [{ text }] } }]
        })
    });
  };

  it('should parse a clean integer score "10"', async () => {
    mockAIResponse('{ "score": 10, "feedback": "Good" }');
    const result = await gradeSubmission("Q", "A", "Ctx", "strict");
    expect(result.score).toBe(10);
  });

  it('should parse a string score "10/10"', async () => {
    // This tests the robust fix we added earlier
    mockAIResponse('{ "score": "10/10", "feedback": "Good" }');
    const result = await gradeSubmission("Q", "A", "Ctx", "strict");
    expect(result.score).toBe(10);
  });

  it('should parse "5 (Average)"', async () => {
    mockAIResponse('{ "score": "5 (Average)", "feedback": "Ok" }');
    const result = await gradeSubmission("Q", "A", "Ctx", "strict");
    expect(result.score).toBe(5);
  });

  it('should default to 0 for NaN/Garbage', async () => {
    mockAIResponse('{ "score": "Not Graded", "feedback": "Error" }');
    const result = await gradeSubmission("Q", "A", "Ctx", "strict");
    expect(result.score).toBe(0);
  });

  it('should cap scores > 10', async () => {
    mockAIResponse('{ "score": 100, "feedback": "Wow" }');
    const result = await gradeSubmission("Q", "A", "Ctx", "strict");
    expect(result.score).toBe(10);
  });
});
