export async function GET() {
  const key = process.env.NEWS_API_KEY;
  if (!key) return Response.json({ error: 'no API key found' });
  
  try {
    const res = await fetch(
      `https://newsapi.org/v2/top-headlines?language=en&pageSize=25&apiKey=${key}`
    );
    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e.message });
  }
}
