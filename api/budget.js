export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const results = [];
    let cursor;
    do {
      const resp = await fetch(
        `https://api.notion.com/v1/databases/${process.env.NOTION_BUDGET_DB_ID}/query`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.NOTION_TOKEN}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start_cursor: cursor,
            page_size: 100,
          }),
        }
      );

      if (!resp.ok) {
        const errText = await resp.text();
        res.status(502).json({ error: errText });
        return;
      }

      const data = await resp.json();
      results.push(...data.results);
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);

    const budgets = results
      .map((page) => {
        const p = page.properties;
        return {
          name: p["名稱"]?.title?.[0]?.plain_text || "",
          amount: p["金額"]?.number || 0,
          note: p["備註"]?.rich_text?.[0]?.plain_text || "",
        };
      })
      .filter((b) => b.name && b.amount > 0);

    res.status(200).json({ syncTime: new Date().toISOString(), budgets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
