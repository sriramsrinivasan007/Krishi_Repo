import type { Feedback } from '../types';

/**
 * Simulates sending feedback to a backend server.
 * In a real application, this would make an HTTP POST request.
 * For this demo, it logs the feedback to the console and simulates a delay.
 * The log is formatted to clearly show the intended recipient and the data payload.
 * @param feedback - The feedback object to be sent.
 */
export async function saveFeedback(feedback: Feedback): Promise<{ success: true }> {
  console.log('%c--- Simulating Feedback Submission ---', 'color: blue; font-weight: bold;');
  console.log(`Intended Recipient: sriramsrinivasan.nk@avaali.com`);
  console.log('Feedback Payload:', JSON.stringify(feedback, null, 2));

  // Simulate network latency of 1 second
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate a rare failure case for demonstration
  if (Math.random() < 0.05) { // 5% chance of failure
    console.error('[Feedback Service] Simulated network error during feedback submission.');
    throw new Error('Failed to submit feedback due to a simulated network error. Please try again.');
  }

  console.log('%c--- Feedback Submitted Successfully (Simulated) ---', 'color: green; font-weight: bold;');
  return { success: true };
}
