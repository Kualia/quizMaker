
export const sendMessage = async (message: string) => {
try {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  return await res.json();
} catch (error) {
  console.error('Error:', error);
  throw error;
}
};
