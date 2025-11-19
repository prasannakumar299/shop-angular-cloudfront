export async function main(event: {
  message: string;
}): Promise<{ message: string }> {
  return {
    message: `SUCCESS with message ${event.message} 🎉`,
  };
}
