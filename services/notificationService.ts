/**
 * Simulates a backend service call to send an SMS notification.
 * In a real application, this would make an HTTP request to a server.
 *
 * @param phoneNumber The phone number to send the SMS to.
 * @param message The content of the SMS.
 * @returns A promise that resolves with a success message or rejects with an error.
 */
export async function sendSmsNotification(
  phoneNumber: string,
  message: string
): Promise<{ success: true; message: string }> {
  // Simulate network latency of 1.5 seconds
  await new Promise(resolve => setTimeout(resolve, 1500));

  console.log(
    `[Mock SMS Service] Sending SMS to ${phoneNumber}: "${message}"`
  );

  // Simulate a rare failure
  if (Math.random() < 0.1) { // 10% chance of failure
    throw new Error('Failed to connect to the SMS gateway.');
  }

  return {
    success: true,
    message: `Notification successfully sent to ${phoneNumber}.`,
  };
}
