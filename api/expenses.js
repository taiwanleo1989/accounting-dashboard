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
        `https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`,
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
            sorts: [{ property: "日期", direction: "descending" }],
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

    const expenses = results
      .map((page) => {
        const p = page.properties;
        return {
          date: p["日期"]?.date?.start?.slice(0, 10) || "",
          name: p["名稱"]?.title?.[0]?.plain_text || "",
          category: p["類別"]?.select?.name || "其他",
          person: p["成員"]?.select?.name || "",
          amount: p["金額"]?.number || 0,
        };
      })
      .filter((e) => e.date && e.name);

    res.status(200).json({ syncTime: new Date().toISOString(), expenses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
