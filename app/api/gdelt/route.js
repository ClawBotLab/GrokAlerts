export async function GET() {
  try {
    const res = await fetch(
      'https://api.gdeltproject.org/api/v2/doc/doc?query=&mode=artlist&maxrecords=25&format=json&timespan=24h&sort=datedesc',
      { next: { revalidate: 300 } }
    );
    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    return Response.json({ articles: [] }, { status: 500 });
  }
}
